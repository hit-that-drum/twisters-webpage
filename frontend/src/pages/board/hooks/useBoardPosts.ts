import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { DEFAULT_VISIBLE_POSTS } from '@/pages/board/lib/boardConstants';
import { buildBoardListPath, parseBoardPosts } from '@/pages/board/lib/boardParsers';
import type { BoardPostItem, BoardSortOption } from '@/pages/board/lib/boardTypes';

interface UseBoardPostsOptions {
  onExpiredSession: () => void;
}

interface UseBoardPostsResult {
  boardPosts: BoardPostItem[];
  displayedPosts: BoardPostItem[];
  hasMorePosts: boolean;
  visiblePostCount: number;
  isLoading: boolean;
  searchInput: string;
  appliedSearch: string;
  sortOption: BoardSortOption;
  setSearchInput: (value: string) => void;
  setSortOption: (value: BoardSortOption) => void;
  ensurePostVisible: (postId: number) => void;
  loadBoardPosts: () => Promise<void>;
  handleSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleResetFilters: () => void;
  handleLoadMorePosts: () => void;
}

/**
 * Owns the board list fetch, search/sort filters, and the "load more" window.
 * Downstream hooks (comments, image modal) watch `boardPosts` identity to
 * reset their own caches after every refetch — this hook deliberately does
 * not own that cross-state reset.
 */
export default function useBoardPosts({
  onExpiredSession,
}: UseBoardPostsOptions): UseBoardPostsResult {
  const [boardPosts, setBoardPosts] = useState<BoardPostItem[]>([]);
  const [visiblePostCount, setVisiblePostCount] = useState(DEFAULT_VISIBLE_POSTS);
  const [isLoading, setIsLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortOption, setSortOption] = useState<BoardSortOption>('latest');

  const loadBoardPosts = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch(buildBoardListPath(appliedSearch, sortOption));
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(`게시글 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      setBoardPosts(parseBoardPosts(payload));
      setVisiblePostCount(DEFAULT_VISIBLE_POSTS);
    } catch (error) {
      console.error('Board posts fetch error:', error);
      enqueueSnackbar('게시글을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch, onExpiredSession, sortOption]);

  useEffect(() => {
    void loadBoardPosts();
  }, [loadBoardPosts]);

  const displayedPosts = useMemo(
    () => boardPosts.slice(0, visiblePostCount),
    [boardPosts, visiblePostCount],
  );
  const hasMorePosts = boardPosts.length > visiblePostCount;

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAppliedSearch(searchInput.trim());
    },
    [searchInput],
  );

  const handleResetFilters = useCallback(() => {
    setSearchInput('');
    setAppliedSearch('');
    setSortOption('latest');
  }, []);

  const handleLoadMorePosts = useCallback(() => {
    setVisiblePostCount((previous) => previous + DEFAULT_VISIBLE_POSTS);
  }, []);

  const ensurePostVisible = useCallback(
    (postId: number) => {
      const postIndex = boardPosts.findIndex((post) => post.id === postId);
      if (postIndex < 0) {
        return;
      }

      setVisiblePostCount((previous) => Math.max(previous, postIndex + 1));
    },
    [boardPosts],
  );

  return {
    boardPosts,
    displayedPosts,
    hasMorePosts,
    visiblePostCount,
    isLoading,
    searchInput,
    appliedSearch,
    sortOption,
    setSearchInput,
    setSortOption,
    ensurePostVisible,
    loadBoardPosts,
    handleSearchSubmit,
    handleResetFilters,
    handleLoadMorePosts,
  };
}
