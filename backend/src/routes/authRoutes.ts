import * as authController from '../controllers/authController.js';
import express from 'express';
import { type Request, type Response, type NextFunction } from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';

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

      // 1. Generate the JWT
      // Use an environment variable for the secret in production!
      const secretKey: string = process.env.JWT_SECRET || 'your_secret_key';

      const token: string = jwt.sign(
        { id: user.id, email: user.email }, // Payload
        secretKey,
        { expiresIn: '1h' },
      );

      // 2. Send the token back to the frontend
      return res.json({
        message: 'Logged in successfully!',
        token: token,
        user: {
          id: user.id,
          name: user.name,
        },
      });
    },
  )(req, res, next);
});

router.post('/signup', authController.signUp);
router.get('/users', passport.authenticate('jwt', { session: false }), authController.getUsers);
router.post('/reset-password', authController.resetPassword);
router.post('/auth/google', authController.googleAuth);

export default router;
