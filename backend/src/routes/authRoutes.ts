import * as authController from '../controllers/authController.js';
import express from 'express';
import { type Request, type Response, type NextFunction } from 'express';
import passport from '../config/passport.js';
import { buildAuthResponse } from '../authUtils.js';

const router = express.Router();
interface User {
  id: number;
  name: string;
  email: string;
}

router.post('/signin', (req: Request, res: Response, next: NextFunction) => {
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

      return res.json(buildAuthResponse(user, 'Logged in successfully!'));
    },
  )(req, res, next);
});

router.post('/signup', authController.signUp);
router.get('/me', passport.authenticate('jwt', { session: false }), authController.getMe);
router.get('/users', passport.authenticate('jwt', { session: false }), authController.getUsers);
router.post('/request-reset', authController.requestReset);
router.post('/verify-reset-token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);
router.post('/auth/google', authController.googleAuth);

export default router;
