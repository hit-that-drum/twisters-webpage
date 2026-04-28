import { HttpError } from '../../errors/httpError.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import {
  BOARD_REACTION_TYPES,
  type BoardCommentMutationPayload,
  type BoardMutationPayload,
  type BoardReactionType,
  type BoardSortOption,
  type CreateBoardCommentDTO,
  type CreateBoardDTO,
  type UpdateBoardDTO,
} from '../../types/board.types.js';
import { normalizeBoolean } from '../../utils/parseUtils.js';

export const parseBoardId = (rawBoardId?: string) => {
  const boardId = Number(rawBoardId);
  if (!Number.isInteger(boardId) || boardId <= 0) {
    return null;
  }

  return boardId;
};

export const parseCommentId = (rawCommentId?: string) => {
  const commentId = Number(rawCommentId);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return null;
  }

  return commentId;
};

export const isAdminUser = (authenticatedUser: AuthenticatedUser) => {
  return normalizeBoolean(authenticatedUser.isAdmin, false);
};

export const requireAuthenticatedUser = (authenticatedUser: AuthenticatedUser | undefined) => {
  if (!authenticatedUser) {
    throw new HttpError(401, '인증된 사용자 정보가 없습니다.');
  }

  return authenticatedUser;
};

export const resolveAuditUser = (authenticatedUser: AuthenticatedUser) => {
  const normalizedName = authenticatedUser.name?.trim();
  if (normalizedName) {
    return normalizedName.slice(0, 100);
  }

  return authenticatedUser.email.slice(0, 100);
};

export const normalizeBoardMutationPayload = (
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

export const normalizeBoardCommentPayload = (
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

export const normalizeBoardSort = (rawSort: string | undefined): BoardSortOption => {
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

export const normalizeBoardSearch = (rawSearch: string | undefined) => {
  if (typeof rawSearch !== 'string') {
    return undefined;
  }

  const trimmed = rawSearch.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, 100);
};

export const normalizeBoardReactionType = (rawReactionType: unknown): BoardReactionType => {
  if (typeof rawReactionType !== 'string') {
    throw new HttpError(400, '유효한 반응 타입이 필요합니다.');
  }

  const normalizedReactionType = BOARD_REACTION_TYPES.find(
    (reactionType) => reactionType === rawReactionType,
  );
  if (!normalizedReactionType) {
    throw new HttpError(400, '지원하지 않는 반응 타입입니다.');
  }

  return normalizedReactionType;
};
