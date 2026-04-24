import { useCallback, useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import type useConfirmDialog from '@/common/components/useConfirmDialog';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { parseBoardComments } from '@/pages/board/lib/boardParsers';
import type { BoardCommentItem, BoardPostItem } from '@/pages/board/lib/boardTypes';

type ConfirmFn = ReturnType<typeof useConfirmDialog>['confirm'];

interface UseBoardCommentsOptions {
  boardPosts: BoardPostItem[];
  displayedPosts: BoardPostItem[];
  canDeleteComment: (comment: BoardCommentItem) => boolean;
  requireAuthenticatedAction: () => boolean;
  confirm: ConfirmFn;
  onExpiredSession: () => void;
}

interface UseBoardCommentsResult {
  commentsByPost: Record<number, BoardCommentItem[]>;
  commentDraftByPost: Record<number, string>;
  loadingCommentsPostIds: number[];
  submittingCommentPostId: number | null;
  deletingCommentKey: string | null;
  expandedPostIds: number[];
  togglePostExpand: (postId: number) => void;
  handleCommentDraftChange: (postId: number, value: string) => void;
  handleCreateComment: (postId: number) => Promise<void>;
  handleDeleteComment: (postId: number, comment: BoardCommentItem) => Promise<void>;
}

/**
 * Owns comment fetching/creation/deletion plus the per-post expand state.
 * Watches `boardPosts` identity to reset caches + expand pinned posts when
 * the upstream list is refetched. Pinned posts auto-load their comments as
 * soon as they enter `displayedPosts`.
 */
export default function useBoardComments({
  boardPosts,
  displayedPosts,
  canDeleteComment,
  requireAuthenticatedAction,
  confirm,
  onExpiredSession,
}: UseBoardCommentsOptions): UseBoardCommentsResult {
  const [commentsByPost, setCommentsByPost] = useState<Record<number, BoardCommentItem[]>>({});
  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<number, string>>({});
  const [loadingCommentsPostIds, setLoadingCommentsPostIds] = useState<number[]>([]);
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState<number | null>(null);
  const [deletingCommentKey, setDeletingCommentKey] = useState<string | null>(null);
  const [expandedPostIds, setExpandedPostIds] = useState<number[]>([]);

  useEffect(() => {
    setCommentsByPost({});
    setCommentDraftByPost({});
    setLoadingCommentsPostIds([]);
    setSubmittingCommentPostId(null);
    setDeletingCommentKey(null);
    setExpandedPostIds(boardPosts.filter((post) => post.pinned).map((post) => post.id));
  }, [boardPosts]);

  const loadBoardComments = useCallback(
    async (postId: number) => {
      setLoadingCommentsPostIds((previous) => {
        if (previous.includes(postId)) {
          return previous;
        }

        return [...previous, postId];
      });

      try {
        const response = await apiFetch(`/board/${postId}/comments`);
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            onExpiredSession();
            return;
          }

          enqueueSnackbar(`댓글 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        const normalizedComments = parseBoardComments(payload);
        setCommentsByPost((previous) => ({
          ...previous,
          [postId]: normalizedComments,
        }));
      } catch (error) {
        console.error('Board comments fetch error:', error);
        enqueueSnackbar('댓글을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setLoadingCommentsPostIds((previous) => previous.filter((id) => id !== postId));
      }
    },
    [onExpiredSession],
  );

  useEffect(() => {
    displayedPosts.forEach((post) => {
      if (post.pinned && commentsByPost[post.id] === undefined) {
        void loadBoardComments(post.id);
      }
    });
  }, [commentsByPost, displayedPosts, loadBoardComments]);

  const togglePostExpand = useCallback(
    (postId: number) => {
      setExpandedPostIds((previous) => {
        const isExpanded = previous.includes(postId);
        if (isExpanded) {
          return previous.filter((id) => id !== postId);
        }

        if (commentsByPost[postId] === undefined) {
          void loadBoardComments(postId);
        }

        return [...previous, postId];
      });
    },
    [commentsByPost, loadBoardComments],
  );

  const handleCommentDraftChange = useCallback((postId: number, value: string) => {
    setCommentDraftByPost((previous) => ({
      ...previous,
      [postId]: value,
    }));
  }, []);

  const handleCreateComment = useCallback(
    async (postId: number) => {
      if (!requireAuthenticatedAction()) {
        return;
      }

      const rawDraft = commentDraftByPost[postId] ?? '';
      const content = rawDraft.trim();
      if (!content) {
        enqueueSnackbar('댓글 내용을 입력해주세요.', { variant: 'error' });
        return;
      }

      setSubmittingCommentPostId(postId);

      try {
        const response = await apiFetch(`/board/${postId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ content }),
        });
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            onExpiredSession();
            return;
          }

          enqueueSnackbar(`댓글 등록 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        enqueueSnackbar(getApiMessage(payload, '댓글이 등록되었습니다.'), { variant: 'success' });
        setCommentDraftByPost((previous) => ({
          ...previous,
          [postId]: '',
        }));
        await loadBoardComments(postId);
      } catch (error) {
        console.error('Board comment create error:', error);
        enqueueSnackbar('댓글 등록 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setSubmittingCommentPostId(null);
      }
    },
    [commentDraftByPost, loadBoardComments, onExpiredSession, requireAuthenticatedAction],
  );

  const handleDeleteComment = useCallback(
    async (postId: number, comment: BoardCommentItem) => {
      if (!requireAuthenticatedAction()) {
        return;
      }

      if (!canDeleteComment(comment)) {
        enqueueSnackbar('댓글 작성자 또는 관리자만 댓글을 삭제할 수 있습니다.', {
          variant: 'error',
        });
        return;
      }

      const shouldDelete = await confirm({
        title: '댓글 삭제',
        description: '해당 댓글을 삭제하시겠습니까?',
        confirmLabel: '삭제',
        confirmButtonStyle: 'error',
      });
      if (!shouldDelete) {
        return;
      }

      const commentKey = `${postId}:${comment.id}`;
      setDeletingCommentKey(commentKey);

      try {
        const response = await apiFetch(`/board/${postId}/comments/${comment.id}`, {
          method: 'DELETE',
        });
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            onExpiredSession();
            return;
          }

          enqueueSnackbar(`댓글 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        enqueueSnackbar(getApiMessage(payload, '댓글이 삭제되었습니다.'), { variant: 'success' });
        await loadBoardComments(postId);
      } catch (error) {
        console.error('Board comment delete error:', error);
        enqueueSnackbar('댓글 삭제 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setDeletingCommentKey(null);
      }
    },
    [canDeleteComment, confirm, loadBoardComments, onExpiredSession, requireAuthenticatedAction],
  );

  return {
    commentsByPost,
    commentDraftByPost,
    loadingCommentsPostIds,
    submittingCommentPostId,
    deletingCommentKey,
    expandedPostIds,
    togglePostExpand,
    handleCommentDraftChange,
    handleCreateComment,
    handleDeleteComment,
  };
}
