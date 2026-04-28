import type { BoardPostItem, BoardReactionType } from '@/pages/board/lib/boardTypes';

export const createBoardPostUrl = (postId: number) => `/board?postId=${postId}`;

export const getReactionCount = (post: BoardPostItem, reactionType: BoardReactionType) => {
  if (reactionType === 'thumbsUp') {
    return post.reactions.thumbsUpCount;
  }

  if (reactionType === 'thumbsDown') {
    return post.reactions.thumbsDownCount;
  }

  if (reactionType === 'favorite') {
    return post.reactions.favoriteCount;
  }

  return post.reactions.heartCount;
};
