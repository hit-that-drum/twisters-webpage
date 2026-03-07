import { type NextFunction, type Request, type Response } from 'express';
import { HttpError } from '../errors/httpError.js';
import { type AuthenticatedRequest } from '../types/common.types.js';

const normalizeBoolean = (rawValue: unknown, fallbackValue = false) => {
  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'number') {
    return rawValue === 1;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return fallbackValue;
};

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
