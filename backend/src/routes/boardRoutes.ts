import express from 'express';
import passport from '../config/passport.js';
import * as boardController from '../controllers/boardController.js';
import { optionalJwtAuth } from '../utils/optionalJwtAuth.js';

const router = express.Router();

router.get('/', optionalJwtAuth, boardController.getBoards);
router.post('/', passport.authenticate('jwt', { session: false }), boardController.createBoard);
router.put('/:id', passport.authenticate('jwt', { session: false }), boardController.updateBoard);
router.delete('/:id', passport.authenticate('jwt', { session: false }), boardController.deleteBoard);

export default router;
