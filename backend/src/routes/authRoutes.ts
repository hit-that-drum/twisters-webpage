import * as authController from '../controllers/authController.js';
import express from 'express';
import { type Request, type Response, type NextFunction } from 'express';
import passport from '../config/passport.js';
import { createSessionAuthResponse } from '../sessionService.js';

const router = express.Router();
interface User {
  id: number;
  name: string;
  email: string;
}

router.post('/signin', (req: Request, res: Response, next: NextFunction) => {
  const rememberMe = req.body?.rememberMe === true || req.body?.rememberMe === 'true';

  // Use a generic type or cast to handle the 'user' return value
  passport.authenticate(
    'local',
    { session: false },
    (err: Error | null, user: User | false, info: { message: string }) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(401).json({ error: info?.message || 'Unauthorized' });
      }

      createSessionAuthResponse(user, 'Logged in successfully!', rememberMe)
        .then((authResponse) => res.json(authResponse))
        .catch((error: unknown) => {
          console.error('Sign in session creation error:', error);
          res.status(500).json({ error: '로그인 세션을 생성하지 못했습니다.' });
        });
    },
  )(req, res, next);
});

router.post('/signup', authController.signUp);
router.get('/me', passport.authenticate('jwt', { session: false }), authController.getMe);
router.get('/users', passport.authenticate('jwt', { session: false }), authController.getUsers);
router.post('/refresh', authController.refreshSession);
router.post('/heartbeat', passport.authenticate('jwt', { session: false }), authController.heartbeat);
router.post('/logout', passport.authenticate('jwt', { session: false }), authController.logout);
router.post('/request-reset', authController.requestReset);
router.post('/verify-reset-token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);
router.post('/auth/google', authController.googleAuth);

export default router;
