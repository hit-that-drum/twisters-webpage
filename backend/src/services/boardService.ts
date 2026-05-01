import { HttpError } from '../errors/httpError.js';
import { boardRepository } from '../repositories/boardRepository.js';
import { meetingAttendanceService } from './meetingAttendanceService.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import {
  type Board,
  type BoardListResponse,
  type BoardListFilters,
  type BoardListQuery,
  type BoardRow,
  type CreateBoardDTO,
  type UpdateBoardDTO,
  createEmptyBoardReactionSummary,
} from '../types/board.types.js';
import { resolveDataScopeByUser, type DataScope } from '../utils/dataScope.js';
import {
  isAdminUser,
  normalizeBoardMutationPayload,
  normalizeBoardPage,
  normalizeBoardPageSize,
  normalizeBoardSearch,
  normalizeBoardSort,
  parseBoardId,
  requireAuthenticatedUser,
} from './board/boardValidation.js';
import { profileSegment } from '../utils/requestProfiler.js';

export { boardCommentService } from './board/boardCommentService.js';
export { boardReactionService } from './board/boardReactionService.js';

class BoardService {
  private async mapBoardRowsWithoutImageSigning(
    scope: DataScope,
    rows: BoardRow[],
    authenticatedUser: AuthenticatedUser | undefined,
    segmentName: string,
  ) {
    const boardIds = rows.map((row) => row.id);
    const reactionSummaryByBoardId = await profileSegment(
      'board.findReactionSummaries',
      () =>
        boardRepository.findReactionSummariesByBoardIds(
          scope,
          boardIds,
          authenticatedUser?.id ?? null,
        ),
      {
        boardCount: boardIds.length,
        hasAuthenticatedUser: Boolean(authenticatedUser?.id),
        scope,
      },
    );

    return profileSegment(
      segmentName,
      async () =>
        rows.map((row): Board => {
          const imageRefs = Array.isArray(row.imageUrl)
            ? row.imageUrl
                .filter((item): item is string => typeof item === 'string')
                .map((item) => item.trim())
                .filter((item) => item.length > 0)
            : [];

          return {
            ...row,
            imageRefs,
            imageUrl: [],
            pinned: Boolean(row.pinned),
            reactions: reactionSummaryByBoardId[row.id] ?? createEmptyBoardReactionSummary(),
          };
        }),
      {
        boardCount: rows.length,
        imageRefCount: rows.reduce(
          (count, row) => count + (Array.isArray(row.imageUrl) ? row.imageUrl.length : 0),
          0,
        ),
      },
    );
  }

  private normalizeBoardListQuery(query: BoardListQuery): BoardListFilters {
    const normalizedQuery: BoardListFilters = {
      sort: normalizeBoardSort(query.sort),
      page: normalizeBoardPage(query.page),
      pageSize: normalizeBoardPageSize(query.pageSize),
    };

    const normalizedSearch = normalizeBoardSearch(query.search);
    if (normalizedSearch) {
      normalizedQuery.search = normalizedSearch;
    }

    return normalizedQuery;
  }

  async getBoards(
    authenticatedUser: AuthenticatedUser | undefined,
    query: BoardListQuery,
  ): Promise<BoardListResponse> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    await profileSegment('board.initializeSchema', () => boardRepository.initializeSchema(), {
      scope,
    });

    const normalizedQuery = this.normalizeBoardListQuery(query);

    const boardPage = await profileSegment(
      'board.findAll',
      () => boardRepository.findAll(scope, normalizedQuery),
      {
        hasSearch: Boolean(normalizedQuery.search),
        sort: normalizedQuery.sort,
        page: normalizedQuery.page,
        pageSize: normalizedQuery.pageSize,
        scope,
      },
    );
    const rows = boardPage.rows;
    const items = await this.mapBoardRowsWithoutImageSigning(
      scope,
      rows,
      authenticatedUser,
      'board.mapRowsWithoutImageSigning',
    );

    return {
      items,
      page: normalizedQuery.page,
      pageSize: normalizedQuery.pageSize,
      totalCount: boardPage.totalCount,
      hasMore: normalizedQuery.page * normalizedQuery.pageSize < boardPage.totalCount,
    };
  }

  async getBoardById(
    authenticatedUser: AuthenticatedUser | undefined,
    rawBoardId: string | undefined,
  ): Promise<Board> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    await profileSegment('board.initializeSchema', () => boardRepository.initializeSchema(), {
      scope,
    });

    const boardId = parseBoardId(rawBoardId);
    if (!boardId) {
      throw new HttpError(400, '유효한 게시글 ID가 필요합니다.');
    }

    const row = await profileSegment(
      'board.findPostRowById',
      () => boardRepository.findPostRowById(scope, boardId),
      {
        boardId,
        scope,
      },
    );
    if (!row) {
      throw new HttpError(404, '해당 게시글을 찾을 수 없습니다.');
    }

    const items = await this.mapBoardRowsWithoutImageSigning(
      scope,
      [row],
      authenticatedUser,
      'board.mapSingleRowWithoutImageSigning',
    );
    return items[0]!;
  }

  async getMyReactionBoards(
    authenticatedUser: AuthenticatedUser | undefined,
    query: BoardListQuery,
  ): Promise<BoardListResponse> {
    const sessionUser = requireAuthenticatedUser(authenticatedUser);
    const scope = resolveDataScopeByUser(sessionUser);
    await profileSegment('board.initializeSchema', () => boardRepository.initializeSchema(), {
      scope,
    });

    const normalizedQuery = this.normalizeBoardListQuery(query);
    const boardPage = await profileSegment(
      'board.findReactedByUser',
      () => boardRepository.findReactedByUser(scope, sessionUser.id, normalizedQuery),
      {
        hasSearch: Boolean(normalizedQuery.search),
        sort: normalizedQuery.sort,
        page: normalizedQuery.page,
        pageSize: normalizedQuery.pageSize,
        scope,
      },
    );
    const items = await this.mapBoardRowsWithoutImageSigning(
      scope,
      boardPage.rows,
      sessionUser,
      'board.mapReactionRowsWithoutImageSigning',
    );

    return {
      items,
      page: normalizedQuery.page,
      pageSize: normalizedQuery.pageSize,
      totalCount: boardPage.totalCount,
      hasMore: normalizedQuery.page * normalizedQuery.pageSize < boardPage.totalCount,
    };
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
