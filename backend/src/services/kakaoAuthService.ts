/**
 * Kakao OAuth authentication: exchanges an authorization code for an access
 * token, fetches the Kakao user profile, creates or refreshes the matching
 * DB user, and issues a Twisters session.
 */
import { HttpError } from '../errors/httpError.js';
import { authRepository } from '../repositories/authRepository.js';
import { logKakaoOAuthDebug, shouldLogOAuthDebug } from './kakao/kakaoConfig.js';
import {
  requestKakaoAccessToken,
  requestKakaoUserProfile,
} from './kakao/kakaoOAuthClient.js';
import { createSessionAuthResponse } from './sessionService.js';
import { type KakaoAuthDTO } from '../types/auth.types.js';
import { isTestUserName, normalizeBoolean } from '../utils/authScope.js';

export const authenticateWithKakao = async (payload: KakaoAuthDTO) => {
  logKakaoOAuthDebug('[Kakao OAuth][Backend] Incoming /auth/kakao payload:', payload);

  const code = payload.code?.trim();
  if (!code) {
    throw new HttpError(400, '카카오 인가 코드가 필요합니다.');
  }

  const redirectUri = payload.redirectUri?.trim();
  const accessToken = await requestKakaoAccessToken(code, redirectUri);
  const kakaoProfile = await requestKakaoUserProfile(accessToken);

  logKakaoOAuthDebug('[Kakao OAuth][Backend] Parsed Kakao profile:', kakaoProfile);

  let user = await authRepository.findApprovalUserByKakaoId(kakaoProfile.kakaoId);

  logKakaoOAuthDebug('[Kakao OAuth][Backend] User lookup by kakao_id:', user);

  if (!user && kakaoProfile.email) {
    user = await authRepository.findApprovalUserByEmail(kakaoProfile.email);
    logKakaoOAuthDebug('[Kakao OAuth][Backend] User lookup by email:', user);
  }

  if (!user) {
    const fallbackEmail = `kakao-${kakaoProfile.kakaoId}@kakao.local`;
    const userEmail = kakaoProfile.email || fallbackEmail;
    const normalizedKakaoName = kakaoProfile.name.trim();
    const userName = normalizedKakaoName || `kakao-${kakaoProfile.kakaoId}`;

    logKakaoOAuthDebug('[Kakao OAuth][Backend] Creating new Kakao user:', {
      userEmail,
      name: userName,
      kakaoId: kakaoProfile.kakaoId,
      profileImage: kakaoProfile.profileImage,
    });

    await authRepository.createKakaoUser(
      userEmail,
      userName,
      kakaoProfile.kakaoId,
      kakaoProfile.profileImage,
      isTestUserName(userName),
    );
    user = await authRepository.findApprovalUserByKakaoId(kakaoProfile.kakaoId);
    logKakaoOAuthDebug('[Kakao OAuth][Backend] Created user fetched by kakao_id:', user);
  } else {
    await authRepository.updateKakaoProfileByUserId(
      user.id,
      kakaoProfile.kakaoId,
      kakaoProfile.profileImage,
    );
    logKakaoOAuthDebug('[Kakao OAuth][Backend] Updated existing Kakao user profile:', {
      userId: user.id,
      kakaoId: kakaoProfile.kakaoId,
      profileImage: kakaoProfile.profileImage,
    });
  }

  if (!user) {
    throw new HttpError(500, '카카오 로그인 사용자 생성에 실패했습니다.');
  }

  if (!user.emailVerifiedAt) {
    await authRepository.markEmailVerifiedByUserId(user.id);
    user.emailVerifiedAt = new Date();
  }

  if (!normalizeBoolean(user.isAllowed, false)) {
    logKakaoOAuthDebug('[Kakao OAuth][Backend] User pending approval:', user);
    throw new HttpError(403, '관리자 승인 대기 중입니다.', 'ACCOUNT_PENDING_APPROVAL');
  }

  const sessionAuthResponse = await createSessionAuthResponse(user, '카카오 로그인 성공', true);
  logKakaoOAuthDebug('[Kakao OAuth][Backend] Final auth response payload:', sessionAuthResponse);

  if (shouldLogOAuthDebug) {
    return {
      ...sessionAuthResponse,
      kakaoUserInfo: kakaoProfile.rawPayload as unknown,
    };
  }

  return sessionAuthResponse;
};
