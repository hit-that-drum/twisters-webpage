import { useCallback, useState, type ChangeEvent } from 'react';
import { enqueueSnackbar } from 'notistack';
import type useConfirmDialog from '@/common/components/useConfirmDialog';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import type { BoardFormState } from '@/pages/board/BoardDetailModal';
import type { BoardPostItem } from '@/pages/board/lib/boardTypes';

type ConfirmFn = ReturnType<typeof useConfirmDialog>['confirm'];

const EMPTY_FORM: BoardFormState = {
  title: '',
  imageUrl: [],
  content: '',
  pinned: false,
};

interface UseBoardPostMutationsOptions {
  canPinPost: boolean;
  canMutatePost: (post: BoardPostItem) => boolean;
  requireAuthenticatedAction: () => boolean;
  confirm: ConfirmFn;
  loadBoardPosts: () => Promise<void>;
  onExpiredSession: () => void;
}

interface UseBoardPostMutationsResult {
  openAddDialog: boolean;
  openEditDialog: boolean;
  editingPostId: number | null;
  newPost: BoardFormState;
  editPost: BoardFormState;
  isSubmitting: boolean;
  deletingPostId: number | null;
  setNewPost: (updater: (previous: BoardFormState) => BoardFormState) => void;
  setEditPost: (updater: (previous: BoardFormState) => BoardFormState) => void;
  handleOpenAddDialog: () => void;
  handleCloseAddDialog: (event: object, reason: ModalCloseReason) => void;
  handleOpenEditDialog: (post: BoardPostItem) => void;
  handleCloseEditDialog: (event: object, reason: ModalCloseReason) => void;
  handleChangeNewPost: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleChangeEditPost: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleCreatePost: () => Promise<void>;
  handleUpdatePost: () => Promise<void>;
  handleDeletePost: (post: BoardPostItem) => Promise<void>;
}

/**
 * Owns the add/edit dialog state and the create/update/delete post API calls.
 * `canPinPost` controls whether the pinned flag is forwarded to the server;
 * non-admins silently drop it.
 */
export default function useBoardPostMutations({
  canPinPost,
  canMutatePost,
  requireAuthenticatedAction,
  confirm,
  loadBoardPosts,
  onExpiredSession,
}: UseBoardPostMutationsOptions): UseBoardPostMutationsResult {
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [newPost, setNewPost] = useState<BoardFormState>(EMPTY_FORM);
  const [editPost, setEditPost] = useState<BoardFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  const handleOpenAddDialog = useCallback(() => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    setNewPost(EMPTY_FORM);
    setOpenAddDialog(true);
  }, [requireAuthenticatedAction]);

  const handleCloseAddDialog = useCallback(
    (event: object, reason: ModalCloseReason) => {
      void event;
      void reason;

      if (isSubmitting) {
        return;
      }

      setOpenAddDialog(false);
    },
    [isSubmitting],
  );

  const handleOpenEditDialog = useCallback(
    (post: BoardPostItem) => {
      if (!requireAuthenticatedAction()) {
        return;
      }

      if (!canMutatePost(post)) {
        enqueueSnackbar('작성자 또는 관리자만 게시글을 수정할 수 있습니다.', { variant: 'error' });
        return;
      }

      setEditingPostId(post.id);
      setEditPost({
        title: post.title,
        imageUrl: post.imageUrl,
        content: post.content,
        pinned: post.pinned,
      });
      setOpenEditDialog(true);
    },
    [canMutatePost, requireAuthenticatedAction],
  );

  const handleCloseEditDialog = useCallback(
    (event: object, reason: ModalCloseReason) => {
      void event;
      void reason;

      if (isSubmitting) {
        return;
      }

      setOpenEditDialog(false);
      setEditingPostId(null);
    },
    [isSubmitting],
  );

  const handleChangeNewPost = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setNewPost((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  const handleChangeEditPost = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setEditPost((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  const handleCreatePost = useCallback(async () => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    const title = newPost.title.trim();
    const content = newPost.content.trim();
    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody: { title: string; imageUrl: string[]; content: string; pinned?: boolean } =
        {
          imageUrl: newPost.imageUrl,
          title,
          content,
        };

      if (canPinPost) {
        requestBody.pinned = newPost.pinned;
      }

      const response = await apiFetch('/board', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(`게시글 등록 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '게시글이 등록되었습니다.'), { variant: 'success' });
      setOpenAddDialog(false);
      setNewPost(EMPTY_FORM);
      await loadBoardPosts();
    } catch (error) {
      console.error('Board post create error:', error);
      enqueueSnackbar('게시글 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [canPinPost, loadBoardPosts, newPost, onExpiredSession, requireAuthenticatedAction]);

  const handleUpdatePost = useCallback(async () => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    if (editingPostId === null) {
      enqueueSnackbar('수정할 게시글을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    const title = editPost.title.trim();
    const content = editPost.content.trim();
    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody: { title: string; imageUrl: string[]; content: string; pinned?: boolean } =
        {
          imageUrl: editPost.imageUrl,
          title,
          content,
        };

      if (canPinPost) {
        requestBody.pinned = editPost.pinned;
      }

      const response = await apiFetch(`/board/${editingPostId}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(`게시글 수정 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '게시글이 수정되었습니다.'), { variant: 'success' });
      setOpenEditDialog(false);
      setEditingPostId(null);
      await loadBoardPosts();
    } catch (error) {
      console.error('Board post update error:', error);
      enqueueSnackbar('게시글 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canPinPost,
    editPost,
    editingPostId,
    loadBoardPosts,
    onExpiredSession,
    requireAuthenticatedAction,
  ]);

  const handleDeletePost = useCallback(
    async (post: BoardPostItem) => {
      if (!requireAuthenticatedAction()) {
        return;
      }

      if (!canMutatePost(post)) {
        enqueueSnackbar('작성자 또는 관리자만 게시글을 삭제할 수 있습니다.', { variant: 'error' });
        return;
      }

      const shouldDelete = await confirm({
        title: '게시글 삭제',
        description: '해당 게시글을 삭제하시겠습니까?',
        confirmLabel: '삭제',
        confirmButtonStyle: 'error',
      });
      if (!shouldDelete) {
        return;
      }

      setDeletingPostId(post.id);

      try {
        const response = await apiFetch(`/board/${post.id}`, {
          method: 'DELETE',
        });
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            onExpiredSession();
            return;
          }

          enqueueSnackbar(`게시글 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        enqueueSnackbar(getApiMessage(payload, '게시글이 삭제되었습니다.'), { variant: 'success' });
        await loadBoardPosts();
      } catch (error) {
        console.error('Board post delete error:', error);
        enqueueSnackbar('게시글 삭제 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setDeletingPostId(null);
      }
    },
    [canMutatePost, confirm, loadBoardPosts, onExpiredSession, requireAuthenticatedAction],
  );

  return {
    openAddDialog,
    openEditDialog,
    editingPostId,
    newPost,
    editPost,
    isSubmitting,
    deletingPostId,
    setNewPost,
    setEditPost,
    handleOpenAddDialog,
    handleCloseAddDialog,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleChangeNewPost,
    handleChangeEditPost,
    handleCreatePost,
    handleUpdatePost,
    handleDeletePost,
  };
}
