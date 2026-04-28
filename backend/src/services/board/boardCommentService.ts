import { HttpError } from '../../errors/httpError.js';
import { boardRepository } from '../../repositories/boardRepository.js';
import { meetingAttendanceService } from '../meetingAttendanceService.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import {
  type BoardComment,
  type CreateBoardCommentDTO,
} from '../../types/board.types.js';
import { resolveDataScopeByUser } from '../../utils/dataScope.js';
import {
  isAdminUser,
  normalizeBoardCommentPayload,
  parseBoardId,
  parseCommentId,
  requireAuthenticatedUser,
} from './boardValidation.js';

class BoardCommentService {
  async getBoardComments(
    authenticatedUser: AuthenticatedUser | undefined,
    rawBoardId: string | undefined,
  ) {
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

    const rows = await boardRepository.findCommentsByBoardId(scope, boardId);
    return rows as BoardComment[];
  }

  async createBoardComment(
    authenticatedUser: AuthenticatedUser | undefined,
    rawBoardId: string | undefined,
    payload: CreateBoardCommentDTO,
  ) {
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

    const normalizedPayload = normalizeBoardCommentPayload(payload, sessionUser, boardId);
    await boardRepository.createComment(scope, normalizedPayload);
    await meetingAttendanceService.syncMeetingAttendanceForBoard(sessionUser, boardId);
  }

  async deleteBoardComment(
    authenticatedUser: AuthenticatedUser | undefined,
    rawBoardId: string | undefined,
    rawCommentId: string | undefined,
  ) {
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

    const commentId = parseCommentId(rawCommentId);
    if (!commentId) {
      throw new HttpError(400, '유효한 댓글 ID가 필요합니다.');
    }

    const comment = await boardRepository.findCommentById(scope, boardId, commentId);
    if (!comment) {
      throw new HttpError(404, '해당 댓글을 찾을 수 없습니다.');
    }

    const isAdmin = isAdminUser(sessionUser);
    const isCommentAuthor = comment.authorId !== null && comment.authorId === sessionUser.id;
    if (!isAdmin && !isCommentAuthor) {
      throw new HttpError(403, '댓글 작성자 또는 관리자만 댓글을 삭제할 수 있습니다.');
    }

    const deletedCount = await boardRepository.deleteCommentById(scope, boardId, commentId);
    if (deletedCount === 0) {
      throw new HttpError(404, '해당 댓글을 찾을 수 없습니다.');
    }

    await meetingAttendanceService.syncMeetingAttendanceForBoard(sessionUser, boardId);
  }
}

export const boardCommentService = new BoardCommentService();
