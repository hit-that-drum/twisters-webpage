import { HttpError } from '../errors/httpError.js';
import { boardRepository } from '../repositories/boardRepository.js';
import { meetingAttendanceService } from './meetingAttendanceService.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import {
  BOARD_REACTION_TYPES,
  type Board,
  type BoardComment,
  type BoardCommentMutationPayload,
  type BoardListFilters,
  type BoardListQuery,
  type BoardMutationPayload,
  type BoardReactionSummary,
  type BoardReactionType,
  type ToggleBoardReactionDTO,
  type BoardSortOption,
  type CreateBoardCommentDTO,
  type CreateBoardDTO,
  type UpdateBoardDTO,
  createEmptyBoardReactionSummary,
} from '../types/board.types.js';
import { resolveDataScopeByUser } from '../utils/dataScope.js';
import { normalizeBoolean } from '../utils/parseUtils.js';

const parseBoardId = (rawBoardId?: string) => {
  const boardId = Number(rawBoardId);
  if (!Number.isInteger(boardId) || boardId <= 0) {
    return null;
  }

  return boardId;
};

const parseCommentId = (rawCommentId?: string) => {
  const commentId = Number(rawCommentId);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return null;
  }

  return commentId;
};

const isAdminUser = (authenticatedUser: AuthenticatedUser) => {
  return normalizeBoolean(authenticatedUser.isAdmin, false);
};

const requireAuthenticatedUser = (authenticatedUser: AuthenticatedUser | undefined) => {
  if (!authenticatedUser) {
    throw new HttpError(401, '인증된 사용자 정보가 없습니다.');
  }

  return authenticatedUser;
};

const resolveAuditUser = (authenticatedUser: AuthenticatedUser) => {
  const normalizedName = authenticatedUser.name?.trim();
  if (normalizedName) {
    return normalizedName.slice(0, 100);
  }

  return authenticatedUser.email.slice(0, 100);
};

const normalizeBoardMutationPayload = (
  payload: CreateBoardDTO | UpdateBoardDTO,
  authenticatedUser: AuthenticatedUser,
  defaultPinned: boolean,
): BoardMutationPayload => {
  const maxInlineImageChars = 5_000_000;
  const maxInlineImagesTotalChars = 20_000_000;
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const imageUrl = Array.isArray(payload.imageUrl)
    ? payload.imageUrl
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : typeof payload.imageUrl === 'string' && payload.imageUrl.trim().length > 0
      ? [payload.imageUrl.trim()]
      : [];
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';

  if (!title || !content) {
    throw new HttpError(400, '제목과 내용을 모두 입력해주세요.');
  }

  if (title.length > 255) {
    throw new HttpError(400, '제목은 255자 이하로 입력해주세요.');
  }

  if (content.length > 20000) {
    throw new HttpError(400, '본문은 20000자 이하로 입력해주세요.');
  }

  if (imageUrl.length > 12) {
    throw new HttpError(400, '이미지는 최대 12장까지 등록할 수 있습니다.');
  }

  if (imageUrl.some((image) => image.length > maxInlineImageChars)) {
    throw new HttpError(400, '각 이미지는 5MB 이하 문자열 데이터만 저장할 수 있습니다.');
  }

  if (imageUrl.reduce((total, image) => total + image.length, 0) > maxInlineImagesTotalChars) {
    throw new HttpError(400, '게시글 이미지 전체 크기는 20MB 이하만 저장할 수 있습니다.');
  }

  const requestedPinned = normalizeBoolean(payload.pinned, defaultPinned);
  if (requestedPinned && !isAdminUser(authenticatedUser)) {
    throw new HttpError(403, '관리자만 상단 고정 게시글을 지정할 수 있습니다.');
  }

  return {
    authorId: authenticatedUser.id,
    title,
    imageUrl,
    content,
    pinned: requestedPinned,
    auditUser: resolveAuditUser(authenticatedUser),
  };
};

const normalizeBoardCommentPayload = (
  payload: CreateBoardCommentDTO,
  authenticatedUser: AuthenticatedUser,
  boardId: number,
): BoardCommentMutationPayload => {
  if (typeof payload.content !== 'string') {
    throw new HttpError(400, '댓글 내용을 입력해주세요.');
  }

  const content = payload.content.trim();
  if (!content) {
    throw new HttpError(400, '댓글 내용을 입력해주세요.');
  }

  if (content.length > 2000) {
    throw new HttpError(400, '댓글은 2000자 이하로 입력해주세요.');
  }

  return {
    boardId,
    authorId: authenticatedUser.id,
    authorName: resolveAuditUser(authenticatedUser),
    content,
  };
};

const normalizeBoardSort = (rawSort: string | undefined): BoardSortOption => {
  switch (rawSort) {
    case 'latest':
    case 'oldest':
    case 'updated':
    case 'pinned':
      return rawSort;
    default:
      return 'latest';
  }
};

const normalizeBoardSearch = (rawSearch: string | undefined) => {
  if (typeof rawSearch !== 'string') {
    return undefined;
  }

  const trimmed = rawSearch.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, 100);
};

const normalizeBoardReactionType = (rawReactionType: unknown): BoardReactionType => {
  if (typeof rawReactionType !== 'string') {
    throw new HttpError(400, '유효한 반응 타입이 필요합니다.');
  }

  const normalizedReactionType = BOARD_REACTION_TYPES.find((reactionType) => reactionType === rawReactionType);
  if (!normalizedReactionType) {
    throw new HttpError(400, '지원하지 않는 반응 타입입니다.');
  }

  return normalizedReactionType;
};

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

    return rows.map((row) => ({
      ...row,
      imageUrl: Array.isArray(row.imageUrl)
        ? row.imageUrl
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : [],
      pinned: Boolean(row.pinned),
      reactions: reactionSummaryByBoardId[row.id] ?? createEmptyBoardReactionSummary(),
    }));
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

  async getBoardComments(authenticatedUser: AuthenticatedUser | undefined, rawBoardId: string | undefined) {
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

export const boardService = new BoardService();
