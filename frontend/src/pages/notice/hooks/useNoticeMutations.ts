import { type ChangeEvent, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import type useConfirmDialog from '@/common/components/useConfirmDialog';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import type { NoticeFormState } from '@/pages/notice/NoticeDetailModal';
import type { NoticeItem } from '@/pages/notice/lib/noticeTypes';
import type { MeInfo } from '@/entities/user/types';

type ConfirmFn = ReturnType<typeof useConfirmDialog>['confirm'];

interface UseNoticeMutationsOptions {
  meInfo: MeInfo | null;
  confirm: ConfirmFn;
  loadNotices: () => Promise<void>;
  onExpiredSession: () => void;
}

interface UseNoticeMutationsResult {
  isSubmitting: boolean;
  deletingNoticeId: number | null;
  openAddDialog: boolean;
  openEditDialog: boolean;
  newNotice: NoticeFormState;
  editNotice: NoticeFormState;
  setNewNotice: React.Dispatch<React.SetStateAction<NoticeFormState>>;
  setEditNotice: React.Dispatch<React.SetStateAction<NoticeFormState>>;
  handleOpenAddDialog: () => void;
  handleCloseAddDialog: (event: object, reason: ModalCloseReason) => void;
  handleOpenEditDialog: (notice: NoticeItem) => void;
  handleCloseEditDialog: (event: object, reason: ModalCloseReason) => void;
  handleChangeNewNotice: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleChangeEditNotice: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleCreateNotice: () => Promise<void>;
  handleUpdateNotice: () => Promise<void>;
  handleDeleteNotice: (noticeId: number) => Promise<void>;
}

const EMPTY_NOTICE: NoticeFormState = {
  title: '',
  imageUrl: '',
  content: '',
  pinned: false,
};

/**
 * Owns notice add/edit dialog state and the create/update/delete mutations.
 * All mutations first pass through a `requireAuthForMutation` gate that
 * enforces login + admin. 401 responses are routed to `onExpiredSession`.
 */
export default function useNoticeMutations({
  meInfo,
  confirm,
  loadNotices,
  onExpiredSession,
}: UseNoticeMutationsOptions): UseNoticeMutationsResult {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [newNotice, setNewNotice] = useState<NoticeFormState>(EMPTY_NOTICE);
  const [editNotice, setEditNotice] = useState<NoticeFormState>(EMPTY_NOTICE);

  const requireAuthForMutation = useCallback(() => {
    if (!meInfo) {
      enqueueSnackbar('공지사항 작성/수정/삭제는 로그인 후 가능합니다.', { variant: 'error' });
      navigate('/signin', { replace: true });
      return false;
    }

    if (!meInfo.isAdmin) {
      enqueueSnackbar('관리자만 공지사항을 작성/수정/삭제할 수 있습니다.', { variant: 'error' });
      return false;
    }

    return true;
  }, [meInfo, navigate]);

  const handleOpenAddDialog = useCallback(() => {
    if (!requireAuthForMutation()) {
      return;
    }

    setNewNotice(EMPTY_NOTICE);
    setOpenAddDialog(true);
  }, [requireAuthForMutation]);

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
    (notice: NoticeItem) => {
      if (!requireAuthForMutation()) {
        return;
      }

      setEditingNoticeId(notice.id);
      setEditNotice({
        title: notice.title,
        imageUrl: notice.imageRef ?? notice.imageUrl ?? '',
        content: notice.content,
        pinned: notice.pinned,
      });
      setOpenEditDialog(true);
    },
    [requireAuthForMutation],
  );

  const handleCloseEditDialog = useCallback(
    (event: object, reason: ModalCloseReason) => {
      void event;
      void reason;

      if (isSubmitting) {
        return;
      }

      setOpenEditDialog(false);
      setEditingNoticeId(null);
    },
    [isSubmitting],
  );

  const handleChangeNewNotice = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setNewNotice((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  const handleChangeEditNotice = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setEditNotice((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  const handleCreateNotice = useCallback(async () => {
    if (!requireAuthForMutation()) {
      return;
    }

    const title = newNotice.title.trim();
    const content = newNotice.content.trim();

    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/notice', {
        method: 'POST',
        body: JSON.stringify({
          title,
          imageUrl: newNotice.imageUrl.trim() || null,
          content,
          pinned: newNotice.pinned,
        }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(`공지사항 등록 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '공지사항이 등록되었습니다.'), { variant: 'success' });
      setOpenAddDialog(false);
      setNewNotice(EMPTY_NOTICE);
      await loadNotices();
    } catch (error) {
      console.error('Notice create error:', error);
      enqueueSnackbar('공지사항 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [loadNotices, newNotice, onExpiredSession, requireAuthForMutation]);

  const handleUpdateNotice = useCallback(async () => {
    if (!requireAuthForMutation()) {
      return;
    }

    if (editingNoticeId === null) {
      enqueueSnackbar('수정할 공지사항을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    const title = editNotice.title.trim();
    const content = editNotice.content.trim();

    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/notice/${editingNoticeId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          imageUrl: editNotice.imageUrl.trim() || null,
          content,
          pinned: editNotice.pinned,
        }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(`공지사항 수정 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '공지사항이 수정되었습니다.'), { variant: 'success' });
      setOpenEditDialog(false);
      setEditingNoticeId(null);
      await loadNotices();
    } catch (error) {
      console.error('Notice update error:', error);
      enqueueSnackbar('공지사항 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [editNotice, editingNoticeId, loadNotices, onExpiredSession, requireAuthForMutation]);

  const handleDeleteNotice = useCallback(
    async (noticeId: number) => {
      if (!requireAuthForMutation()) {
        return;
      }

      const shouldDelete = await confirm({
        title: '공지사항 삭제',
        description: '해당 공지사항을 삭제하시겠습니까?',
        confirmLabel: '삭제',
        confirmButtonStyle: 'error',
      });
      if (!shouldDelete) {
        return;
      }

      setDeletingNoticeId(noticeId);

      try {
        const response = await apiFetch(`/notice/${noticeId}`, {
          method: 'DELETE',
        });
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            onExpiredSession();
            return;
          }

          enqueueSnackbar(`공지사항 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        enqueueSnackbar(getApiMessage(payload, '공지사항이 삭제되었습니다.'), {
          variant: 'success',
        });
        await loadNotices();
      } catch (error) {
        console.error('Notice delete error:', error);
        enqueueSnackbar('공지사항 삭제 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setDeletingNoticeId(null);
      }
    },
    [confirm, loadNotices, onExpiredSession, requireAuthForMutation],
  );

  return {
    isSubmitting,
    deletingNoticeId,
    openAddDialog,
    openEditDialog,
    newNotice,
    editNotice,
    setNewNotice,
    setEditNotice,
    handleOpenAddDialog,
    handleCloseAddDialog,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleChangeNewNotice,
    handleChangeEditNotice,
    handleCreateNotice,
    handleUpdateNotice,
    handleDeleteNotice,
  };
}
