import express from 'express';
import passport from '../config/passport.js';
import * as noticeController from '../controllers/noticeController.js';
import { optionalJwtAuth } from '../utils/optionalJwtAuth.js';

const router = express.Router();

router.get('/', optionalJwtAuth, noticeController.getNotices);
router.post('/', passport.authenticate('jwt', { session: false }), noticeController.createNotice);
router.put('/:id', passport.authenticate('jwt', { session: false }), noticeController.updateNotice);
router.delete('/:id', passport.authenticate('jwt', { session: false }), noticeController.deleteNotice);

export default router;
