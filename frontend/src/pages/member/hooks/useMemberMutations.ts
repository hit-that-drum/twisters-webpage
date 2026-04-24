import { type ChangeEvent, useCallback, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import type useConfirmDialog from '@/common/components/useConfirmDialog';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import type { MemberFormState } from '@/pages/member/MemberDetailModal';
import { createDefaultMemberForm, toEditForm } from '@/pages/member/lib/memberFormatters';
import type { MemberUser } from '@/entities/user/types';

type ConfirmFn = ReturnType<typeof useConfirmDialog>['confirm'];

interface UseMemberMutationsOptions {
  selectedUser: MemberUser | null;
  confirm: ConfirmFn;
  refetchAll: () => Promise<unknown>;
  onExpiredSession: () => void;
}

interface UseMemberMutationsResult {
  isSubmitting: boolean;
  openAddDialog: boolean;
  openEditDialog: boolean;
  addMemberForm: MemberFormState;
  editMemberForm: MemberFormState;
  handleOpenAddDialog: () => void;
  handleCloseAddDialog: (event: object, reason: ModalCloseReason) => void;
  handleOpenEditDialog: () => void;
  handleCloseEditDialog: (event: object, reason: ModalCloseReason) => void;
  handleChangeAddForm: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleChangeEditForm: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleAddDateChange: (field: 'birthDate', value: string) => void;
  handleEditDateChange: (field: 'birthDate', value: string) => void;
  handleCreateMember: () => Promise<void>;
  handleUpdateMember: () => Promise<void>;
  handleDeleteMember: () => Promise<void>;
}

/**
 * Owns the add/edit dialog state and the member CRUD endpoints.
 * All successful mutations call `refetchAll` so callers can re-pull the
 * member list, dues, and attendance together in one round trip.
 */
export default function useMemberMutations({
  selectedUser,
  confirm,
  refetchAll,
  onExpiredSession,
}: UseMemberMutationsOptions): UseMemberMutationsResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState<MemberFormState>(() =>
    createDefaultMemberForm(),
  );
  const [editMemberForm, setEditMemberForm] = useState<MemberFormState>(() =>
    createDefaultMemberForm(),
  );

  const handleOpenAddDialog = useCallback(() => {
    setAddMemberForm(createDefaultMemberForm());
    setOpenAddDialog(true);
  }, []);

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

  const handleOpenEditDialog = useCallback(() => {
    if (!selectedUser) {
      enqueueSnackbar('먼저 수정할 회원을 선택해주세요.', { variant: 'error' });
      return;
    }

    setEditMemberForm(toEditForm(selectedUser));
    setOpenEditDialog(true);
  }, [selectedUser]);

  const handleCloseEditDialog = useCallback(
    (event: object, reason: ModalCloseReason) => {
      void event;
      void reason;

      if (isSubmitting) {
        return;
      }

      setOpenEditDialog(false);
    },
    [isSubmitting],
  );

  const handleChangeAddForm = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setAddMemberForm((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  const handleChangeEditForm = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setEditMemberForm((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  const handleAddDateChange = useCallback((field: 'birthDate', value: string) => {
    setAddMemberForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const handleEditDateChange = useCallback((field: 'birthDate', value: string) => {
    setEditMemberForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const handleCreateMember = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/member', {
        method: 'POST',
        body: JSON.stringify(addMemberForm),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(`회원 등록 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '회원이 등록되었습니다.'), { variant: 'success' });
      setOpenAddDialog(false);
      await refetchAll();
    } catch (error) {
      console.error('Member create error:', error);
      enqueueSnackbar('회원 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [addMemberForm, onExpiredSession, refetchAll]);

  const handleUpdateMember = useCallback(async () => {
    if (!selectedUser) {
      enqueueSnackbar('수정할 회원을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/member/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editMemberForm),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(`회원 수정 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '회원 정보가 수정되었습니다.'), {
        variant: 'success',
      });
      setOpenEditDialog(false);
      await refetchAll();
    } catch (error) {
      console.error('Member update error:', error);
      enqueueSnackbar('회원 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [editMemberForm, onExpiredSession, refetchAll, selectedUser]);

  const handleDeleteMember = useCallback(async () => {
    if (!selectedUser) {
      enqueueSnackbar('삭제할 회원을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    const isConfirmed = await confirm({
      title: '회원 삭제',
      description: `정말로 '${selectedUser.name}' 회원을 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      confirmButtonStyle: 'error',
    });
    if (!isConfirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/member/${selectedUser.id}`, {
        method: 'DELETE',
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(`회원 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '회원이 삭제되었습니다.'), { variant: 'success' });
      setOpenEditDialog(false);
      await refetchAll();
    } catch (error) {
      console.error('Member delete error:', error);
      enqueueSnackbar('회원 삭제 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [confirm, onExpiredSession, refetchAll, selectedUser]);

  return {
    isSubmitting,
    openAddDialog,
    openEditDialog,
    addMemberForm,
    editMemberForm,
    handleOpenAddDialog,
    handleCloseAddDialog,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleChangeAddForm,
    handleChangeEditForm,
    handleAddDateChange,
    handleEditDateChange,
    handleCreateMember,
    handleUpdateMember,
    handleDeleteMember,
  };
}
