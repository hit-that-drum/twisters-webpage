import {
  BOARD_REACTION_TYPES,
  type BoardCommentItem,
  type BoardPostListResult,
  type BoardPostItem,
  type BoardReactionSummary,
  type BoardReactionType,
  type BoardSortOption,
} from './boardTypes';

export const createEmptyBoardReactionSummary = (): BoardReactionSummary => ({
  thumbsUpCount: 0,
  thumbsDownCount: 0,
  favoriteCount: 0,
  heartCount: 0,
  userReactions: [],
});

const isBoardReactionType = (value: unknown): value is BoardReactionType => {
  return typeof value === 'string' && BOARD_REACTION_TYPES.includes(value as BoardReactionType);
};

export const normalizeBoardReactionSummary = (rawValue: unknown): BoardReactionSummary => {
  if (!rawValue || typeof rawValue !== 'object') {
    return createEmptyBoardReactionSummary();
  }

  const row = rawValue as {
    thumbsUpCount?: unknown;
    thumbsDownCount?: unknown;
    favoriteCount?: unknown;
    heartCount?: unknown;
    userReactions?: unknown;
  };

  return {
    thumbsUpCount: typeof row.thumbsUpCount === 'number' ? row.thumbsUpCount : 0,
    thumbsDownCount: typeof row.thumbsDownCount === 'number' ? row.thumbsDownCount : 0,
    favoriteCount: typeof row.favoriteCount === 'number' ? row.favoriteCount : 0,
    heartCount: typeof row.heartCount === 'number' ? row.heartCount : 0,
    userReactions: Array.isArray(row.userReactions)
      ? row.userReactions.filter((item): item is BoardReactionType => isBoardReactionType(item))
      : [],
  };
};

const normalizeImageUrlList = (rawValue: unknown): string[] => {
  if (Array.isArray(rawValue)) {
    return rawValue
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof rawValue === 'string' && rawValue.trim()) {
    return [rawValue.trim()];
  }

  return [];
};

export const parseBoardPosts = (payload: unknown): BoardPostItem[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as {
        id?: unknown;
        authorId?: unknown;
        title?: unknown;
        createUser?: unknown;
        createDate?: unknown;
        updateUser?: unknown;
        updateDate?: unknown;
        imageUrl?: unknown;
        imageRefs?: unknown;
        content?: unknown;
        pinned?: unknown;
        reactions?: unknown;
      };

      if (
        typeof row.id !== 'number' ||
        typeof row.title !== 'string' ||
        typeof row.createUser !== 'string' ||
        typeof row.createDate !== 'string' ||
        typeof row.content !== 'string'
      ) {
        return null;
      }

      const normalizedAuthorId =
        typeof row.authorId === 'number' && Number.isInteger(row.authorId) ? row.authorId : null;

      const normalizedUpdateUser =
        typeof row.updateUser === 'string' && row.updateUser.trim().length > 0
          ? row.updateUser
          : row.createUser;

      const normalizedUpdateDate =
        typeof row.updateDate === 'string' && row.updateDate.trim().length > 0
          ? row.updateDate
          : row.createDate;

      const normalizedPinned =
        row.pinned === true || row.pinned === 1 || row.pinned === '1' || row.pinned === 'true';

      const normalizedImageUrl = normalizeImageUrlList(row.imageUrl);
      const normalizedImageRefs = normalizeImageUrlList(row.imageRefs);

      return {
        id: row.id,
        authorId: normalizedAuthorId,
        title: row.title,
        createUser: row.createUser,
        createDate: row.createDate,
        updateUser: normalizedUpdateUser,
        updateDate: normalizedUpdateDate,
        imageUrl: normalizedImageUrl,
        imageRefs: normalizedImageRefs.length > 0 ? normalizedImageRefs : normalizedImageUrl,
        content: row.content,
        pinned: normalizedPinned,
        reactions: normalizeBoardReactionSummary(row.reactions),
      } satisfies BoardPostItem;
    })
    .filter((item): item is BoardPostItem => item !== null);
};

const getPayloadNumber = (payload: Record<string, unknown>, key: string, fallback: number) => {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export const parseBoardPostList = (payload: unknown): BoardPostListResult => {
  if (Array.isArray(payload)) {
    const posts = parseBoardPosts(payload);
    return {
      posts,
      page: 1,
      pageSize: posts.length,
      totalCount: posts.length,
      hasMore: false,
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      posts: [],
      page: 1,
      pageSize: 0,
      totalCount: 0,
      hasMore: false,
    };
  }

  const row = payload as Record<string, unknown>;
  const posts = parseBoardPosts(row.items);
  const page = getPayloadNumber(row, 'page', 1);
  const pageSize = getPayloadNumber(row, 'pageSize', posts.length);
  const totalCount = getPayloadNumber(row, 'totalCount', posts.length);
  const hasMore = row.hasMore === true;

  return {
    posts,
    page,
    pageSize,
    totalCount,
    hasMore,
  };
};

export const parseBoardComments = (payload: unknown): BoardCommentItem[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as {
        id?: unknown;
        boardId?: unknown;
        authorId?: unknown;
        authorName?: unknown;
        content?: unknown;
        createdAt?: unknown;
        updatedAt?: unknown;
      };

      if (
        typeof row.id !== 'number' ||
        typeof row.boardId !== 'number' ||
        typeof row.authorName !== 'string' ||
        typeof row.content !== 'string' ||
        typeof row.createdAt !== 'string'
      ) {
        return null;
      }

      const normalizedAuthorId =
        typeof row.authorId === 'number' && Number.isInteger(row.authorId) ? row.authorId : null;

      const normalizedUpdatedAt =
        typeof row.updatedAt === 'string' && row.updatedAt.trim().length > 0
          ? row.updatedAt
          : row.createdAt;

      return {
        id: row.id,
        boardId: row.boardId,
        authorId: normalizedAuthorId,
        authorName: row.authorName,
        content: row.content,
        createdAt: row.createdAt,
        updatedAt: normalizedUpdatedAt,
      } satisfies BoardCommentItem;
    })
    .filter((item): item is BoardCommentItem => item !== null);
};

export const buildBoardListPath = (
  search: string,
  sort: BoardSortOption,
  page = 1,
  pageSize?: number,
) => {
  const queryParams = new URLSearchParams();
  if (search.trim()) {
    queryParams.set('search', search.trim());
  }

  if (sort !== 'latest') {
    queryParams.set('sort', sort);
  }

  if (page > 1) {
    queryParams.set('page', String(page));
  }

  if (typeof pageSize === 'number' && Number.isFinite(pageSize) && pageSize > 0) {
    queryParams.set('pageSize', String(pageSize));
  }

  const queryString = queryParams.toString();
  if (!queryString) {
    return '/board';
  }

  return `/board?${queryString}`;
};

export const buildMyReactionBoardListPath = (page = 1, pageSize = 100) => {
  const queryParams = new URLSearchParams();
  if (page > 1) {
    queryParams.set('page', String(page));
  }

  if (pageSize > 0) {
    queryParams.set('pageSize', String(pageSize));
  }

  const queryString = queryParams.toString();
  return queryString ? `/board/reactions/me?${queryString}` : '/board/reactions/me';
};
