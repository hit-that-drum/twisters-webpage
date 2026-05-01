import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, isEmptyListResponse, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { DEFAULT_VISIBLE_POSTS } from '@/pages/board/lib/boardConstants';
import {
  buildBoardListPath,
  parseBoardPostList,
  parseBoardPosts,
} from '@/pages/board/lib/boardParsers';
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
  isFetchingNextPage: boolean;
  searchInput: string;
  appliedSearch: string;
  sortOption: BoardSortOption;
  setSearchInput: (value: string) => void;
  setSortOption: (value: BoardSortOption) => void;
  ensurePostVisible: (postId: number) => Promise<boolean>;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortOption, setSortOption] = useState<BoardSortOption>('latest');

  const fetchBoardPosts = useCallback(async (page: number, mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
    }

    try {
      const response = await apiFetch(
        buildBoardListPath(appliedSearch, sortOption, page, DEFAULT_VISIBLE_POSTS),
      );
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        if (isEmptyListResponse(response, payload, ['게시글', 'board', 'post', 'data'])) {
          if (mode === 'replace') {
            setBoardPosts([]);
          }
          setCurrentPage(page);
          setHasMorePosts(false);
          return;
        }

        enqueueSnackbar(`게시글 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      const parsedResult = parseBoardPostList(payload);
      setBoardPosts((previousPosts) => {
        if (mode === 'replace') {
          return parsedResult.posts;
        }

        const previousPostIds = new Set(previousPosts.map((post) => post.id));
        return [
          ...previousPosts,
          ...parsedResult.posts.filter((post) => !previousPostIds.has(post.id)),
        ];
      });
      setCurrentPage(parsedResult.page);
      setHasMorePosts(parsedResult.hasMore);
    } catch (error) {
      console.error('Board posts fetch error:', error);
      enqueueSnackbar('게시글을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      if (mode === 'replace') {
        setIsLoading(false);
      } else {
        setIsFetchingNextPage(false);
      }
    }
  }, [appliedSearch, onExpiredSession, sortOption]);

  const loadBoardPosts = useCallback(async () => {
    await fetchBoardPosts(1, 'replace');
  }, [fetchBoardPosts]);

  useEffect(() => {
    void loadBoardPosts();
  }, [loadBoardPosts]);

  const displayedPosts = useMemo(() => boardPosts, [boardPosts]);

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
    if (isLoading || isFetchingNextPage || !hasMorePosts) {
      return;
    }

    void fetchBoardPosts(currentPage + 1, 'append');
  }, [currentPage, fetchBoardPosts, hasMorePosts, isFetchingNextPage, isLoading]);

  const ensurePostVisible = useCallback(
    async (postId: number) => {
      if (boardPosts.some((post) => post.id === postId)) {
        return true;
      }

      try {
        const response = await apiFetch(`/board/${postId}`);
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            onExpiredSession();
            return false;
          }

          enqueueSnackbar(`게시글 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return false;
        }

        const targetPost = parseBoardPosts([payload])[0] ?? null;
        if (!targetPost) {
          enqueueSnackbar('게시글을 찾을 수 없습니다.', { variant: 'error' });
          return false;
        }

        setBoardPosts((previousPosts) => {
          if (previousPosts.some((post) => post.id === targetPost.id)) {
            return previousPosts;
          }

          return [targetPost, ...previousPosts];
        });
        return true;
      } catch (error) {
        console.error('Board post fetch error:', error);
        enqueueSnackbar('게시글을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
        return false;
      }
    },
    [boardPosts, onExpiredSession],
  );

  return {
    boardPosts,
    displayedPosts,
    hasMorePosts,
    visiblePostCount: boardPosts.length,
    isLoading,
    isFetchingNextPage,
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
