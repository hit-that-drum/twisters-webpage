import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { enqueueSnackbar } from 'notistack';
import type useConfirmDialog from '@/common/components/useConfirmDialog';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import type { AdminUserRecord } from '@/entities/user/types';
import type { AdminUserFormState } from '@/pages/adminpage/AdminUserDetailModal';
import { EMPTY_ADMIN_USER_FORM } from '@/pages/adminpage/lib/adminConstants';
import { isValidEmail, toAdminUserForm } from '@/pages/adminpage/lib/adminFormatters';

type ConfirmFn = ReturnType<typeof useConfirmDialog>['confirm'];

interface UseAdminUserEditingOptions {
  canManageUsers: boolean;
  currentUserId: number | undefined;
  allUsers: AdminUserRecord[];
  confirm: ConfirmFn;
  loadUsers: () => Promise<void>;
  refreshMeInfo: () => Promise<unknown>;
  onExpiredSession: () => void;
}

interface UseAdminUserEditingResult {
  editingUserId: number | null;
  editingUser: AdminUserRecord | null;
  openEditDialog: boolean;
  editUserForm: AdminUserFormState;
  initialEditUserForm: AdminUserFormState;
  hasEditChanges: boolean;
  isEditFormValid: boolean;
  isSubmitting: boolean;
  handleOpenEditDialog: (user: AdminUserRecord) => void;
  handleCloseEditDialog: (event: object, reason: ModalCloseReason) => Promise<void>;
  handleEditFormChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleUpdateUser: () => Promise<void>;
}

export default function useAdminUserEditing({
  canManageUsers,
  currentUserId,
  allUsers,
  confirm,
  loadUsers,
  refreshMeInfo,
  onExpiredSession,
}: UseAdminUserEditingOptions): UseAdminUserEditingResult {
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editUserForm, setEditUserForm] = useState<AdminUserFormState>(EMPTY_ADMIN_USER_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editingUser = useMemo(
    () => allUsers.find((user) => user.id === editingUserId) ?? null,
    [allUsers, editingUserId],
  );

  const initialEditUserForm = useMemo(
    () => (editingUser ? toAdminUserForm(editingUser) : EMPTY_ADMIN_USER_FORM),
    [editingUser],
  );

  const hasEditChanges = useMemo(
    () =>
      editUserForm.name.trim() !== initialEditUserForm.name.trim() ||
      editUserForm.email.trim().toLowerCase() !== initialEditUserForm.email.trim().toLowerCase() ||
      editUserForm.role !== initialEditUserForm.role ||
      editUserForm.status !== initialEditUserForm.status,
    [editUserForm, initialEditUserForm],
  );

  const isEditFormValid = useMemo(() => {
    const normalizedName = editUserForm.name.trim();
    const normalizedEmail = editUserForm.email.trim().toLowerCase();

    return normalizedName.length > 0 && isValidEmail(normalizedEmail);
  }, [editUserForm.email, editUserForm.name]);

  const handleOpenEditDialog = useCallback((user: AdminUserRecord) => {
    setEditingUserId(user.id);
    setEditUserForm(toAdminUserForm(user));
    setOpenEditDialog(true);
  }, []);

  const handleCloseEditDialog = useCallback(
    async (event: object, reason: ModalCloseReason) => {
      void event;
      void reason;

      if (isSubmitting) {
        return;
      }

      if (hasEditChanges) {
        const shouldClose = await confirm({
          title: '변경 사항 닫기',
          description:
            '변경 사항이 있습니다. 저장하지 않고 닫으면 변경사항이 유실됩니다. 닫으시겠습니까?',
          confirmLabel: '닫기',
          confirmButtonStyle: 'error',
        });
        if (!shouldClose) {
          return;
        }
      }

      setOpenEditDialog(false);
      setEditingUserId(null);
      setEditUserForm(EMPTY_ADMIN_USER_FORM);
    },
    [confirm, hasEditChanges, isSubmitting],
  );

  const handleEditFormChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setEditUserForm((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  const handleUpdateUser = useCallback(async () => {
    if (!canManageUsers) {
      enqueueSnackbar('관리자 권한이 필요합니다.', { variant: 'error' });
      return;
    }

    if (editingUserId === null) {
      enqueueSnackbar('수정할 사용자를 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    if (!hasEditChanges) {
      enqueueSnackbar('변경된 내용이 없습니다.', { variant: 'info' });
      return;
    }

    const normalizedName = editUserForm.name.trim();
    const normalizedEmail = editUserForm.email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      enqueueSnackbar('이름과 이메일을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      enqueueSnackbar('이메일 형식이 올바르지 않습니다.', { variant: 'error' });
      return;
    }

    if (
      currentUserId === editingUserId &&
      (editUserForm.role !== initialEditUserForm.role ||
        editUserForm.status !== initialEditUserForm.status)
    ) {
      enqueueSnackbar('현재 로그인한 관리자 계정의 권한 상태는 변경할 수 없습니다.', {
        variant: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/authentication/admin/users/${editingUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          isAdmin: editUserForm.role === 'admin',
          isAllowed: editUserForm.status === 'active',
        }),
      });
      const payload = await parseApiResponse(response);

      if (response.status === 401) {
        onExpiredSession();
        return;
      }

      if (!response.ok) {
        enqueueSnackbar(`사용자 수정 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '사용자 정보가 수정되었습니다.'), {
        variant: 'success',
      });
      setOpenEditDialog(false);
      setEditingUserId(null);
      setEditUserForm(EMPTY_ADMIN_USER_FORM);

      await Promise.all([
        loadUsers(),
        currentUserId === editingUserId ? refreshMeInfo() : Promise.resolve(null),
      ]);
    } catch (error) {
      console.error('User update error:', error);
      enqueueSnackbar('사용자 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canManageUsers,
    currentUserId,
    editUserForm.email,
    editUserForm.name,
    editUserForm.role,
    editUserForm.status,
    editingUserId,
    hasEditChanges,
    initialEditUserForm.role,
    initialEditUserForm.status,
    loadUsers,
    onExpiredSession,
    refreshMeInfo,
  ]);

  return {
    editingUserId,
    editingUser,
    openEditDialog,
    editUserForm,
    initialEditUserForm,
    hasEditChanges,
    isEditFormValid,
    isSubmitting,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleEditFormChange,
    handleUpdateUser,
  };
}
