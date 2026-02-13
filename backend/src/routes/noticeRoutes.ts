import express from 'express';
import passport from '../config/passport.js';
import * as noticeController from '../controllers/noticeController.js';

const router = express.Router();

router.get('/', noticeController.getNotices);
router.post('/', passport.authenticate('jwt', { session: false }), noticeController.createNotice);
router.put('/:id', passport.authenticate('jwt', { session: false }), noticeController.updateNotice);
router.delete('/:id', passport.authenticate('jwt', { session: false }), noticeController.deleteNotice);

export default router;
