import { HttpError } from '../errors/httpError.js';
import { boardRepository } from '../repositories/boardRepository.js';
import { meetingAttendanceService } from './meetingAttendanceService.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import {
  type Board,
  type BoardListFilters,
  type BoardListQuery,
  type CreateBoardDTO,
  type UpdateBoardDTO,
  createEmptyBoardReactionSummary,
} from '../types/board.types.js';
import { resolveDataScopeByUser } from '../utils/dataScope.js';
import {
  isAdminUser,
  normalizeBoardMutationPayload,
  normalizeBoardSearch,
  normalizeBoardSort,
  parseBoardId,
  requireAuthenticatedUser,
} from './board/boardValidation.js';
import { b2StorageService } from './storage/b2StorageService.js';

export { boardCommentService } from './board/boardCommentService.js';
export { boardReactionService } from './board/boardReactionService.js';

class BoardService {
  async getBoards(
    authenticatedUser: AuthenticatedUser | undefined,
    query: BoardListQuery,
  ): Promise<Board[]> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    await boardRepository.initializeSchema();

    const normalizedQuery: BoardListFilters = {
      sort: normalizeBoardSort(query.sort),
    };

    const normalizedSearch = normalizeBoardSearch(query.search);
    if (normalizedSearch) {
      normalizedQuery.search = normalizedSearch;
    }

    const rows = await boardRepository.findAll(scope, normalizedQuery);
    const reactionSummaryByBoardId = await boardRepository.findReactionSummariesByBoardIds(
      scope,
      rows.map((row) => row.id),
      authenticatedUser?.id ?? null,
    );

    return Promise.all(
      rows.map(async (row) => {
        const imageRefs = Array.isArray(row.imageUrl)
          ? row.imageUrl
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter((item) => item.length > 0)
          : [];
        const imageResponse = await b2StorageService.resolveImageListResponse(imageRefs);

        return {
          ...row,
          imageRefs: imageResponse.imageRefs,
          imageUrl: imageResponse.imageUrl,
          pinned: Boolean(row.pinned),
          reactions: reactionSummaryByBoardId[row.id] ?? createEmptyBoardReactionSummary(),
        };
      }),
    );
  }

  async createBoard(authenticatedUser: AuthenticatedUser | undefined, payload: CreateBoardDTO) {
    const sessionUser = requireAuthenticatedUser(authenticatedUser);
    const normalizedPayload = normalizeBoardMutationPayload(payload, sessionUser, false);
    const scope = resolveDataScopeByUser(sessionUser);
    const boardId = await boardRepository.create(scope, normalizedPayload);

    if (boardId) {
      await meetingAttendanceService.syncMeetingAttendanceForBoard(sessionUser, boardId);
    }
  }

  async updateBoard(
    authenticatedUser: AuthenticatedUser | undefined,
    rawBoardId: string | undefined,
    payload: UpdateBoardDTO,
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

    const isAdmin = isAdminUser(sessionUser);
    const isAuthor = existingBoard.authorId !== null && existingBoard.authorId === sessionUser.id;
    if (!isAdmin && !isAuthor) {
      throw new HttpError(403, '작성자 또는 관리자만 게시글을 수정할 수 있습니다.');
    }

    const defaultPinned = Boolean(existingBoard.pinned);
    const normalizedPayload = normalizeBoardMutationPayload(payload, sessionUser, defaultPinned);
    if (!isAdmin) {
      normalizedPayload.pinned = defaultPinned;
    }

    const updatedCount = await boardRepository.updateById(scope, boardId, normalizedPayload);
    if (updatedCount === 0) {
      throw new HttpError(404, '해당 게시글을 찾을 수 없습니다.');
    }

    await meetingAttendanceService.syncMeetingAttendanceForBoard(sessionUser, boardId);
  }

  async deleteBoard(authenticatedUser: AuthenticatedUser | undefined, rawBoardId: string | undefined) {
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

    const isAdmin = isAdminUser(sessionUser);
    const isAuthor = existingBoard.authorId !== null && existingBoard.authorId === sessionUser.id;
    if (!isAdmin && !isAuthor) {
      throw new HttpError(403, '작성자 또는 관리자만 게시글을 삭제할 수 있습니다.');
    }

    const deletedCount = await boardRepository.deleteById(scope, boardId);
    if (deletedCount === 0) {
      throw new HttpError(404, '해당 게시글을 찾을 수 없습니다.');
    }
  }
}

export const boardService = new BoardService();
