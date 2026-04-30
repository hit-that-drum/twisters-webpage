import type { CSSProperties } from 'react';
import type { BoardSortOption } from './boardTypes';

export const DEFAULT_VISIBLE_POSTS = 5;

export const BOARD_SORT_OPTIONS: Array<{ value: BoardSortOption; label: string }> = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'pinned', label: 'Pinned First' },
];

export const BOARD_IMAGE_PRESETS = [
  {
    alt: 'Community board post visual',
    gradient:
      'linear-gradient(135deg, rgba(26,54,93,0.95) 0%, rgba(60,114,178,0.82) 55%, rgba(178,214,242,0.75) 100%)',
  },
  {
    alt: 'Discussion and policy visual',
    gradient:
      'linear-gradient(135deg, rgba(26,49,66,0.96) 0%, rgba(74,104,129,0.86) 55%, rgba(191,211,230,0.75) 100%)',
  },
  {
    alt: 'Project and maintenance visual',
    gradient:
      'linear-gradient(135deg, rgba(59,62,82,0.95) 0%, rgba(109,130,171,0.84) 54%, rgba(236,223,170,0.76) 100%)',
  },
];

export const COLLAPSED_POST_CONTENT_STYLE: CSSProperties = {
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 5,
};
