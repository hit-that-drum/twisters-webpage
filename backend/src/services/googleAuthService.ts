/**
 * Google OAuth authentication: verifies a Google ID token, creates or
 * refreshes the matching DB user, and issues a Twisters session.
 */
import { OAuth2Client } from 'google-auth-library';
import { HttpError } from '../errors/httpError.js';
import { authRepository } from '../repositories/authRepository.js';
import { createSessionAuthResponse } from './sessionService.js';
import { type GoogleAuthDTO } from '../types/auth.types.js';
import { isTestUserName, normalizeBoolean } from '../utils/authScope.js';

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const authenticateWithGoogle = async (payload: GoogleAuthDTO) => {
  const token = payload.token;

  if (!token) {
    throw new HttpError(400, '구글 토큰이 필요합니다.');
  }

  const ticket = await oauth2Client.verifyIdToken({
    idToken: token,
    audience: GOOGLE_CLIENT_ID as string,
  });

  const ticketPayload = ticket.getPayload();

  if (!ticketPayload) {
    throw new HttpError(400, '잘못된 토큰입니다.');
  }

  const { email, name, picture, sub: googleId } = ticketPayload;
  const normalizedName = typeof name === 'string' ? name.trim() : '';

  if (!email || !normalizedName || !googleId) {
    throw new HttpError(400, '구글 사용자 정보를 가져오지 못했습니다.');
  }

  const normalizedEmail = email.toLowerCase();
  const profileImage = typeof picture === 'string' && picture.trim() ? picture.trim() : null;
  let user = await authRepository.findApprovalUserByEmail(normalizedEmail);

  if (!user) {
    await authRepository.createGoogleUser(
      normalizedEmail,
      normalizedName,
      googleId,
      profileImage,
      isTestUserName(normalizedName),
    );
    user = await authRepository.findApprovalUserByEmail(normalizedEmail);
  } else {
    await authRepository.updateGoogleProfileByUserId(user.id, googleId, profileImage);
  }

  if (!user) {
    throw new HttpError(500, '구글 로그인 사용자 생성에 실패했습니다.');
  }

  if (!user.emailVerifiedAt) {
    await authRepository.markEmailVerifiedByUserId(user.id);
    user.emailVerifiedAt = new Date();
  }

  if (!normalizeBoolean(user.isAllowed, false)) {
    throw new HttpError(403, '관리자 승인 대기 중입니다.', 'ACCOUNT_PENDING_APPROVAL');
  }

  return createSessionAuthResponse(user, '구글 로그인 성공', true);
};
