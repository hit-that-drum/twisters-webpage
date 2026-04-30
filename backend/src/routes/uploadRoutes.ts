import express from 'express';
import passport from '../config/passport.js';
import * as uploadController from '../controllers/uploadController.js';

const router = express.Router();

router.post(
  '/image-upload-url',
  passport.authenticate('jwt', { session: false }),
  uploadController.createImageUploadUrl,
);

router.post(
  '/image-download-url',
  passport.authenticate('jwt', { session: false }),
  uploadController.createImageDownloadUrl,
);

export default router;
