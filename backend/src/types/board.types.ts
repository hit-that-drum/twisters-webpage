export const BOARD_REACTION_TYPES = ['thumbsUp', 'thumbsDown', 'favorite', 'heart'] as const;

export type BoardReactionType = (typeof BOARD_REACTION_TYPES)[number];

export interface BoardReactionSummary {
  thumbsUpCount: number;
  thumbsDownCount: number;
  favoriteCount: number;
  heartCount: number;
  userReactions: BoardReactionType[];
}

export const createEmptyBoardReactionSummary = (): BoardReactionSummary => ({
  thumbsUpCount: 0,
  thumbsDownCount: 0,
  favoriteCount: 0,
  heartCount: 0,
  userReactions: [],
});

export interface BoardRow {
  id: number;
  authorId: number | null;
  title: string;
  createUser: string;
  createDate: Date;
  updateUser: string;
  updateDate: Date;
  imageUrl: string[];
  content: string;
  pinned: boolean | number;
}

export interface Board {
  id: number;
  authorId: number | null;
  title: string;
  createUser: string;
  createDate: Date;
  updateUser: string;
  updateDate: Date;
  imageUrl: string[];
  imageRefs: string[];
  content: string;
  pinned: boolean;
  reactions: BoardReactionSummary;
}

export interface CreateBoardDTO {
  title?: string;
  imageUrl?: unknown;
  content?: string;
  pinned?: unknown;
}

export interface UpdateBoardDTO {
  title?: string;
  imageUrl?: unknown;
  content?: string;
  pinned?: unknown;
}

export interface ToggleBoardReactionDTO {
  reactionType?: unknown;
}

export interface BoardMutationPayload {
  authorId: number;
  title: string;
  imageUrl: string[];
  content: string;
  pinned: boolean;
  auditUser: string;
}

export interface BoardLookupRow {
  id: number;
  authorId: number | null;
  pinned: boolean | number;
}

export interface BoardReactionCountRow {
  boardId: number;
  type: string;
  reactionCount: number;
}

export interface BoardUserReactionRow {
  boardId: number;
  type: string;
}

export interface BoardReactionLookupRow {
  id: number;
}

export type BoardSortOption = 'latest' | 'oldest' | 'updated' | 'pinned';

export interface BoardListQuery {
  search?: string;
  sort?: string;
}

export interface BoardListFilters {
  search?: string;
  sort: BoardSortOption;
}

export interface BoardCommentRow {
  id: number;
  boardId: number;
  authorId: number | null;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardComment {
  id: number;
  boardId: number;
  authorId: number | null;
  authorName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBoardCommentDTO {
  content?: unknown;
}

export interface BoardCommentMutationPayload {
  boardId: number;
  authorId: number;
  authorName: string;
  content: string;
}

export interface BoardReactionMutationPayload {
  boardId: number;
  userId: number;
  reactionType: BoardReactionType;
}

export interface BoardCommentLookupRow {
  id: number;
  boardId: number;
  authorId: number | null;
}
