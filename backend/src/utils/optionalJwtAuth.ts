import { type NextFunction, type Request, type Response } from 'express';
import passport from '../config/passport.js';
import { type AuthenticatedRequest, type AuthenticatedUser } from '../types/common.types.js';

export const optionalJwtAuth = (req: Request, res: Response, next: NextFunction) => {
  const authorizationHeader = req.header('authorization') || req.header('Authorization');

  if (!authorizationHeader?.toLowerCase().startsWith('bearer ')) {
    next();
    return;
  }

  passport.authenticate('jwt', { session: false }, (_error: unknown, user: Express.User | false | null) => {
    if (user && typeof user === 'object') {
      (req as AuthenticatedRequest).user = user as AuthenticatedUser;
    }

    next();
  })(req, res, next);
};
