import { useEffect, useMemo, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import {
  getApiMessage,
  isEmptyListResponse,
  parseApiResponse,
} from '@/common/lib/api/apiHelpers';
import { buildMyReactionBoardListPath, parseBoardPostList } from '@/pages/board/lib/boardParsers';
import type { BoardPostItem, BoardReactionType } from '@/pages/board/lib/boardTypes';
import { REACTION_SECTIONS } from '@/pages/mypage/lib/myPageConstants';

interface UseReactionPostsOptions {
  isAuthenticated: boolean;
  onExpiredSession: () => void;
}

interface UseReactionPostsResult {
  reactionPosts: BoardPostItem[];
  reactionPostsByType: Record<BoardReactionType, BoardPostItem[]>;
  isLoadingReactionPosts: boolean;
}

const REACTION_POSTS_PAGE_SIZE = 100;

const useReactionPosts = ({
  isAuthenticated,
  onExpiredSession,
}: UseReactionPostsOptions): UseReactionPostsResult => {
  const [reactionPosts, setReactionPosts] = useState<BoardPostItem[]>([]);
  const [isLoadingReactionPosts, setIsLoadingReactionPosts] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setReactionPosts([]);
      setIsLoadingReactionPosts(false);
      return;
    }

    const loadReactionPosts = async () => {
      setIsLoadingReactionPosts(true);

      try {
        const posts: BoardPostItem[] = [];
        const seenPostIds = new Set<number>();
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await apiFetch(
            buildMyReactionBoardListPath(page, REACTION_POSTS_PAGE_SIZE),
          );
          const payload = await parseApiResponse(response);

          if (!response.ok) {
            if (response.status === 401) {
              onExpiredSession();
              return;
            }

            if (isEmptyListResponse(response, payload, ['게시글', 'board', 'post', 'data'])) {
              setReactionPosts([]);
              return;
            }

            enqueueSnackbar(`게시글 반응 목록 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
              variant: 'error',
            });
            return;
          }

          const parsedResult = parseBoardPostList(payload);
          parsedResult.posts.forEach((post) => {
            if (seenPostIds.has(post.id)) {
              return;
            }

            seenPostIds.add(post.id);
            posts.push(post);
          });

          hasMore = parsedResult.hasMore && parsedResult.posts.length > 0;
          page += 1;
        }

        setReactionPosts(posts);
      } catch (error) {
        console.error('My page reaction posts fetch error:', error);
        enqueueSnackbar('반응한 게시글을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setIsLoadingReactionPosts(false);
      }
    };

    void loadReactionPosts();
  }, [isAuthenticated, onExpiredSession]);

  const reactionPostsByType = useMemo(() => {
    return Object.fromEntries(
      REACTION_SECTIONS.map((section) => [
        section.key,
        reactionPosts.filter((post) => post.reactions.userReactions.includes(section.key)),
      ]),
    ) as Record<BoardReactionType, BoardPostItem[]>;
  }, [reactionPosts]);

  return {
    reactionPosts,
    reactionPostsByType,
    isLoadingReactionPosts,
  };
};

export default useReactionPosts;
