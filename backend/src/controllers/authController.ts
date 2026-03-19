import { type NextFunction, type Request, type Response } from 'express';
import passport from '../config/passport.js';
import { authService } from '../services/authService.js';
import { type AuthenticatedRequest } from '../types/common.types.js';
import {
  type AdminUserMutationDTO,
  type KakaoAuthDTO,
  type GoogleAuthDTO,
  type LocalAuthUser,
  type RefreshSessionDTO,
  type RequestResetDTO,
  type ResetPasswordDTO,
  type SignUpDTO,
  type UpdateProfileImageDTO,
  type VerifyResetTokenDTO,
} from '../types/auth.types.js';
import { handleControllerError } from '../utils/controllerErrorHandler.js';

interface LocalAuthInfo {
  message?: string;
}

export const signIn = async (req: Request, res: Response, next: NextFunction) => {
  const rememberMe = req.body?.rememberMe === true || req.body?.rememberMe === 'true';

  passport.authenticate(
    'local',
    { session: false },
    async (err: Error | null, user: LocalAuthUser | false, info: LocalAuthInfo) => {
      if (err) {
        return handleControllerError(res, err, '로그인 중 오류가 발생했습니다.', 'Sign in error');
      }

      if (!user) {
        return res.status(401).json({ error: info?.message || 'Unauthorized' });
      }

      try {
        const authResponse = await authService.createSignInSession(user, rememberMe);
        return res.json(authResponse);
      } catch (error) {
        return handleControllerError(
          res,
          error,
          '로그인 세션을 생성하지 못했습니다.',
          'Sign in session creation error',
        );
      }
    },
  )(req, res, next);
};

export const signUp = async (req: Request, res: Response) => {
  try {
    const payload = req.body as SignUpDTO;
    const signupResponse = await authService.signUp(payload);
    return res.status(201).json(signupResponse);
  } catch (error) {
    return handleControllerError(res, error, '서버 에러가 발생했습니다.', 'Sign up error');
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const me = await authService.getMe(authenticatedUser);
    return res.json(me);
  } catch (error) {
    return handleControllerError(res, error, '데이터베이스 조회 중 오류가 발생했습니다.', 'DB 조회 에러');
  }
};

export const updateProfileImage = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as UpdateProfileImageDTO;
    const result = await authService.updateProfileImage(authenticatedUser, payload);
    return res.json(result);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '프로필 이미지 저장 중 오류가 발생했습니다.',
      'Profile image update error',
    );
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const users = await authService.getUsers(authenticatedUser, req.query.userId);
    return res.json(users);
  } catch (error) {
    return handleControllerError(res, error, '데이터베이스 조회 중 오류가 발생했습니다.', 'DB 조회 에러');
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const payload = req.body as ResetPasswordDTO;
    const result = await authService.resetPassword(payload);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '서버 에러가 발생했습니다.', 'Password Reset Error');
  }
};

export const requestReset = async (req: Request, res: Response) => {
  try {
    const payload = req.body as RequestResetDTO;
    const result = await authService.requestReset(payload);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '서버 에러가 발생했습니다.', 'Request Reset Error');
  }
};

export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const payload = req.body as VerifyResetTokenDTO;
    const result = await authService.verifyResetToken(payload);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '서버 에러가 발생했습니다.', 'Verify Reset Token Error');
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const payload = req.body as GoogleAuthDTO;
    const result = await authService.googleAuth(payload);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '구글 인증 실패', 'Google auth error');
  }
};

export const kakaoAuth = async (req: Request, res: Response) => {
  try {
    const payload = req.body as KakaoAuthDTO;
    const result = await authService.kakaoAuth(payload);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '카카오 인증 실패', 'Kakao auth error');
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  try {
    const payload = req.body as RefreshSessionDTO;
    const refreshedAuth = await authService.refreshSession(payload);
    return res.json(refreshedAuth);
  } catch (error) {
    return handleControllerError(res, error, '세션 갱신 중 오류가 발생했습니다.', 'Session refresh error');
  }
};

export const heartbeat = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const result = await authService.heartbeat(authenticatedUser);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '세션 활동 갱신 중 오류가 발생했습니다.', 'Heartbeat error');
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const result = await authService.logout(authenticatedUser);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '로그아웃 처리 중 오류가 발생했습니다.', 'Logout error');
  }
};

export const getPendingUsers = async (_req: Request, res: Response) => {
  try {
    const pendingUsers = await authService.getPendingUsers();
    return res.json(pendingUsers);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '승인 대기 사용자 조회 중 오류가 발생했습니다.',
      'Pending users fetch error',
    );
  }
};

export const getAdminUsers = async (_req: Request, res: Response) => {
  try {
    const users = await authService.getAdminUsers();
    return res.json(users);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '전체 사용자 조회 중 오류가 발생했습니다.',
      'Admin users fetch error',
    );
  }
};

export const approveUser = async (req: Request, res: Response) => {
  try {
    const result = await authService.approveUser(req.params.id);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '사용자 승인 처리 중 오류가 발생했습니다.', 'User approve error');
  }
};

export const declineUser = async (req: Request, res: Response) => {
  try {
    const result = await authService.declineUser(req.params.id);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '사용자 거절 처리 중 오류가 발생했습니다.', 'User decline error');
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const result = await authService.deleteUser(authenticatedUser, req.params.id);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '사용자 삭제 중 오류가 발생했습니다.', 'User delete error');
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as AdminUserMutationDTO;
    const result = await authService.updateUser(authenticatedUser, req.params.id, payload);
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, '사용자 정보 수정 중 오류가 발생했습니다.', 'User update error');
  }
};
