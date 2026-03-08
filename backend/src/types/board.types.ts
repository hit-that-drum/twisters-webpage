export interface BoardRow {
  id: number;
  authorId: number | null;
  title: string;
  createUser: string;
  createDate: Date;
  updateUser: string;
  updateDate: Date;
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
  content: string;
  pinned: boolean;
}

export interface CreateBoardDTO {
  title?: string;
  content?: string;
  pinned?: unknown;
}

export interface UpdateBoardDTO {
  title?: string;
  content?: string;
  pinned?: unknown;
}

export interface BoardMutationPayload {
  authorId: number;
  title: string;
  content: string;
  pinned: boolean;
  auditUser: string;
}

export interface BoardLookupRow {
  id: number;
  authorId: number | null;
  pinned: boolean | number;
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

export interface BoardCommentLookupRow {
  id: number;
  boardId: number;
  authorId: number | null;
}
