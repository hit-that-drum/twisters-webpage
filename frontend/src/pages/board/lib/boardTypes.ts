export const BOARD_REACTION_TYPES = ['thumbsUp', 'thumbsDown', 'favorite', 'heart'] as const;

export type BoardReactionType = (typeof BOARD_REACTION_TYPES)[number];

export interface BoardReactionSummary {
  thumbsUpCount: number;
  thumbsDownCount: number;
  favoriteCount: number;
  heartCount: number;
  userReactions: BoardReactionType[];
}

export interface BoardPostItem {
  id: number;
  authorId: number | null;
  title: string;
  createUser: string;
  createDate: string;
  updateUser: string;
  updateDate: string;
  imageUrl: string[];
  imageRefs: string[];
  content: string;
  pinned: boolean;
  reactions: BoardReactionSummary;
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
