import { type NextFunction, type Request, type Response } from 'express';
import { HttpError } from '../errors/httpError.js';
import { type AuthenticatedRequest } from '../types/common.types.js';
import { normalizeBoolean } from './parseUtils.js';

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;

  if (!authenticatedUser) {
    return next(new HttpError(401, '인증된 사용자 정보가 없습니다.'));
  }

  if (!normalizeBoolean(authenticatedUser.isAdmin, false)) {
    return next(new HttpError(403, '관리자 권한이 필요합니다.'));
  }

  return next();
};
