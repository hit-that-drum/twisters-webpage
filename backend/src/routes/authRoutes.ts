import * as authController from '../controllers/authController.js';
import express from 'express';
import passport from '../config/passport.js';
import { requireAdmin } from '../utils/requireAdmin.js';

const router = express.Router();

router.post('/signin', authController.signIn);

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
router.post('/auth/kakao', authController.kakaoAuth);
router.get(
  '/admin/pending-users',
  passport.authenticate('jwt', { session: false }),
  requireAdmin,
  authController.getPendingUsers,
);
router.get(
  '/admin/users',
  passport.authenticate('jwt', { session: false }),
  requireAdmin,
  authController.getAdminUsers,
);
router.patch(
  '/admin/users/:id/approve',
  passport.authenticate('jwt', { session: false }),
  requireAdmin,
  authController.approveUser,
);

export default router;
