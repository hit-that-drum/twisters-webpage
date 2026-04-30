import { HttpError } from '../../errors/httpError.js';
import { boardRepository } from '../../repositories/boardRepository.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import {
  type BoardReactionSummary,
  type ToggleBoardReactionDTO,
  createEmptyBoardReactionSummary,
} from '../../types/board.types.js';
import { resolveDataScopeByUser } from '../../utils/dataScope.js';
import {
  normalizeBoardReactionType,
  parseBoardId,
  requireAuthenticatedUser,
} from './boardValidation.js';

class BoardReactionService {
  async toggleBoardReaction(
    authenticatedUser: AuthenticatedUser | undefined,
    rawBoardId: string | undefined,
    payload: ToggleBoardReactionDTO,
  ): Promise<{ active: boolean; reactions: BoardReactionSummary }> {
    const sessionUser = requireAuthenticatedUser(authenticatedUser);
    const scope = resolveDataScopeByUser(sessionUser);
    const boardId = parseBoardId(rawBoardId);
    if (!boardId) {
      throw new HttpError(400, '유효한 게시글 ID가 필요합니다.');
    }

    const existingBoard = await boardRepository.findById(scope, boardId);
    if (!existingBoard) {
      throw new HttpError(404, '해당 게시글을 찾을 수 없습니다.');
    }

    const reactionType = normalizeBoardReactionType(payload.reactionType);
    const existingReaction = await boardRepository.findReaction(
      scope,
      boardId,
      sessionUser.id,
      reactionType,
    );

    let active = false;
    if (existingReaction) {
      await boardRepository.deleteReaction(scope, boardId, sessionUser.id, reactionType);
    } else {
      await boardRepository.createReaction(scope, {
        boardId,
        userId: sessionUser.id,
        reactionType,
      });
      active = true;
    }

    const reactionSummaryByBoardId = await boardRepository.findReactionSummariesByBoardIds(
      scope,
      [boardId],
      sessionUser.id,
    );

    return {
      active,
      reactions: reactionSummaryByBoardId[boardId] ?? createEmptyBoardReactionSummary(),
    };
  }
}

export const boardReactionService = new BoardReactionService();
