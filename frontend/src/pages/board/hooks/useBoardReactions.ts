import { useCallback, useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import {
  createEmptyBoardReactionSummary,
  normalizeBoardReactionSummary,
} from '@/pages/board/lib/boardParsers';
import type {
  BoardPostItem,
  BoardReactionSummary,
  BoardReactionType,
} from '@/pages/board/lib/boardTypes';

interface UseBoardReactionsOptions {
  boardPosts: BoardPostItem[];
  requireAuthenticatedAction: () => boolean;
  onExpiredSession: () => void;
}

interface UseBoardReactionsResult {
  reactionSummaryByPost: Record<number, BoardReactionSummary>;
  submittingReactionPostId: number | null;
  handleToggleReaction: (postId: number, reactionType: BoardReactionType) => Promise<void>;
}

export default function useBoardReactions({
  boardPosts,
  requireAuthenticatedAction,
  onExpiredSession,
}: UseBoardReactionsOptions): UseBoardReactionsResult {
  const [reactionSummaryByPost, setReactionSummaryByPost] = useState<
    Record<number, BoardReactionSummary>
  >({});
  const [submittingReactionPostId, setSubmittingReactionPostId] = useState<number | null>(null);

  useEffect(() => {
    setReactionSummaryByPost(
      Object.fromEntries(
        boardPosts.map((post) => [post.id, post.reactions ?? createEmptyBoardReactionSummary()]),
      ),
    );
  }, [boardPosts]);

  const handleToggleReaction = useCallback(
    async (postId: number, reactionType: BoardReactionType) => {
      if (!requireAuthenticatedAction()) {
        return;
      }

      setSubmittingReactionPostId(postId);

      try {
        const response = await apiFetch(`/board/${postId}/reactions`, {
          method: 'POST',
          body: JSON.stringify({ reactionType }),
        });
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            onExpiredSession();
            return;
          }

          enqueueSnackbar(`게시글 반응 처리 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        setReactionSummaryByPost((previous) => ({
          ...previous,
          [postId]: normalizeBoardReactionSummary(
            (payload as { reactions?: unknown } | null)?.reactions,
          ),
        }));
      } catch (error) {
        console.error('Board reaction toggle error:', error);
        enqueueSnackbar('게시글 반응 처리 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setSubmittingReactionPostId(null);
      }
    },
    [onExpiredSession, requireAuthenticatedAction],
  );

  return {
    reactionSummaryByPost,
    submittingReactionPostId,
    handleToggleReaction,
  };
}
