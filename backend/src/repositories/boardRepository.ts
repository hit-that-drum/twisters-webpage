import { boardCommentRepository } from './board/boardCommentRepository.js';
import { boardPostRepository } from './board/boardPostRepository.js';
import { boardReactionRepository } from './board/boardReactionRepository.js';
import { ensureBoardSchema } from './board/boardSchema.js';

export const boardRepository = {
  initializeSchema: () => ensureBoardSchema(),
  // Post operations
  findAll: boardPostRepository.findAll.bind(boardPostRepository),
  findPostRowById: boardPostRepository.findPostRowById.bind(boardPostRepository),
  findReactedByUser: boardPostRepository.findReactedByUser.bind(boardPostRepository),
  findById: boardPostRepository.findById.bind(boardPostRepository),
  create: boardPostRepository.create.bind(boardPostRepository),
  updateById: boardPostRepository.updateById.bind(boardPostRepository),
  deleteById: boardPostRepository.deleteById.bind(boardPostRepository),
  // Comment operations
  findCommentsByBoardId: boardCommentRepository.findCommentsByBoardId.bind(boardCommentRepository),
  findCommentById: boardCommentRepository.findCommentById.bind(boardCommentRepository),
  createComment: boardCommentRepository.createComment.bind(boardCommentRepository),
  deleteCommentById: boardCommentRepository.deleteCommentById.bind(boardCommentRepository),
  // Reaction operations
  findReactionSummariesByBoardIds:
    boardReactionRepository.findReactionSummariesByBoardIds.bind(boardReactionRepository),
  findReaction: boardReactionRepository.findReaction.bind(boardReactionRepository),
  createReaction: boardReactionRepository.createReaction.bind(boardReactionRepository),
  deleteReaction: boardReactionRepository.deleteReaction.bind(boardReactionRepository),
};

export {
  boardCommentRepository,
  boardPostRepository,
  boardReactionRepository,
};
