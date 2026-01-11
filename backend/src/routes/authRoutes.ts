import { Router } from 'express';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/signup', authController.signUp);
router.post('/signin', authController.signIn);
router.get('/users', authController.getUsers);
router.post('/reset-password', authController.resetPassword);
router.post('/auth/google', authController.googleAuth);

export default router;
