export interface BoardPostItem {
  id: number;
  authorId: number | null;
  title: string;
  createUser: string;
  createDate: string;
  updateUser: string;
  updateDate: string;
  imageUrl: string[];
  content: string;
  pinned: boolean;
}

export interface BoardCommentItem {
  id: number;
  boardId: number;
  authorId: number | null;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type BoardSortOption = 'latest' | 'oldest' | 'updated' | 'pinned';
