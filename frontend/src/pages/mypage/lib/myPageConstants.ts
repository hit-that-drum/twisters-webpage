import { FaHeart, FaRegStar, FaThumbsDown, FaThumbsUp } from 'react-icons/fa';
import type { ReactionSectionDefinition } from '@/pages/mypage/lib/myPageTypes';

export const REACTION_SECTIONS: ReactionSectionDefinition[] = [
  {
    key: 'thumbsUp',
    title: 'Thumbs Up Posts',
    emptyMessage: 'You have not given a thumbs up to any posts yet.',
    accentClassName: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    icon: FaThumbsUp,
  },
  {
    key: 'thumbsDown',
    title: 'Thumbs Down Posts',
    emptyMessage: 'You have not given a thumbs down to any posts yet.',
    accentClassName: 'text-rose-600 bg-rose-50 border-rose-200',
    icon: FaThumbsDown,
  },
  {
    key: 'favorite',
    title: 'Favorite Posts',
    emptyMessage: 'You have not favorited any posts yet.',
    accentClassName: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: FaRegStar,
  },
  {
    key: 'heart',
    title: 'Heart Posts',
    emptyMessage: 'You have not hearted any posts yet.',
    accentClassName: 'text-pink-600 bg-pink-50 border-pink-200',
    icon: FaHeart,
  },
];

export const REACTION_INLINE_LIMIT = 4;
export const REACTION_MODAL_THRESHOLD = 5;
