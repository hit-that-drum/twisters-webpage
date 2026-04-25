import express from 'express';
import passport from '../config/passport.js';
import * as boardController from '../controllers/boardController.js';

const router = express.Router();

router.get('/', passport.authenticate('jwt', { session: false }), boardController.getBoards);
router.post('/', passport.authenticate('jwt', { session: false }), boardController.createBoard);
router.put('/:id', passport.authenticate('jwt', { session: false }), boardController.updateBoard);
router.delete('/:id', passport.authenticate('jwt', { session: false }), boardController.deleteBoard);
router.get('/:id/comments', passport.authenticate('jwt', { session: false }), boardController.getBoardComments);
router.post(
  '/:id/comments',
  passport.authenticate('jwt', { session: false }),
  boardController.createBoardComment,
);
router.post(
  '/:id/reactions',
  passport.authenticate('jwt', { session: false }),
  boardController.toggleBoardReaction,
);
router.delete(
  '/:id/comments/:commentId',
  passport.authenticate('jwt', { session: false }),
  boardController.deleteBoardComment,
);

export default router;
