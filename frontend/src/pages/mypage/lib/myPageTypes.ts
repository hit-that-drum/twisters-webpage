import { FaHeart, FaRegStar, FaThumbsDown, FaThumbsUp } from 'react-icons/fa';
import type { BoardReactionType } from '@/pages/board/lib/boardTypes';

type ReactionIcon =
  | typeof FaHeart
  | typeof FaRegStar
  | typeof FaThumbsDown
  | typeof FaThumbsUp;

export type ReactionSectionDefinition = {
  key: BoardReactionType;
  title: string;
  emptyMessage: string;
  accentClassName: string;
  icon: ReactionIcon;
};
