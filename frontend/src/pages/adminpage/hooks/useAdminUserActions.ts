import { useCallback, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import type useConfirmDialog from '@/common/components/useConfirmDialog';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import type { AdminUserRecord } from '@/entities/user/types';

type ConfirmFn = ReturnType<typeof useConfirmDialog>['confirm'];

interface UseAdminUserActionsOptions {
  canManageUsers: boolean;
  currentUserId: number | undefined;
  confirm: ConfirmFn;
  loadUsers: () => Promise<void>;
  refreshMeInfo: () => Promise<unknown>;
  onExpiredSession: () => void;
}

interface UseAdminUserActionsResult {
  approvingUserId: number | null;
  decliningUserId: number | null;
  deletingUserId: number | null;
  removingProfileImageUserId: number | null;
  handleApproveUser: (userId: number) => Promise<void>;
  handleDeclineUser: (userId: number) => Promise<void>;
  handleDeleteUser: (user: AdminUserRecord) => Promise<void>;
  handleDeleteUserProfileImage: (user: AdminUserRecord) => Promise<void>;
}

export default function useAdminUserActions({
  canManageUsers,
  currentUserId,
  confirm,
  loadUsers,
  refreshMeInfo,
  onExpiredSession,
}: UseAdminUserActionsOptions): UseAdminUserActionsResult {
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);
  const [decliningUserId, setDecliningUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [removingProfileImageUserId, setRemovingProfileImageUserId] = useState<number | null>(null);

  const handleApproveUser = useCallback(
    async (userId: number) => {
      if (!canManageUsers) {
        enqueueSnackbar('관리자 권한이 필요합니다.', { variant: 'error' });
        return;
      }

      const shouldApprove = await confirm({
        title: '사용자 승인',
        description: '해당 사용자를 승인하시겠습니까?',
        confirmLabel: '승인',
      });
      if (!shouldApprove) {
        return;
      }

      setApprovingUserId(userId);

      try {
        const response = await apiFetch(`/authentication/admin/users/${userId}/approve`, {
          method: 'PATCH',
        });
        const payload = await parseApiResponse(response);

        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        if (!response.ok) {
          enqueueSnackbar(`사용자 승인 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        enqueueSnackbar(getApiMessage(payload, '사용자가 승인되었습니다.'), { variant: 'success' });
        await loadUsers();
      } catch (error) {
        console.error('User approve error:', error);
        enqueueSnackbar('사용자 승인 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setApprovingUserId(null);
      }
    },
    [canManageUsers, confirm, loadUsers, onExpiredSession],
  );

  const handleDeclineUser = useCallback(
    async (userId: number) => {
      const shouldDecline = await confirm({
        title: '가입 요청 거절',
        description: '해당 사용자의 가입 요청을 거절하고 대기 중인 계정을 삭제하시겠습니까?',
        confirmLabel: '거절',
        confirmButtonStyle: 'error',
      });
      if (!shouldDecline) {
        return;
      }

      setDecliningUserId(userId);

      try {
        const response = await apiFetch(`/authentication/admin/users/${userId}/decline`, {
          method: 'PATCH',
        });
        const payload = await parseApiResponse(response);

        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        if (!response.ok) {
          enqueueSnackbar(`사용자 거절 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        enqueueSnackbar(getApiMessage(payload, '사용자 가입 요청이 거절되었습니다.'), {
          variant: 'success',
        });
        await loadUsers();
      } catch (error) {
        console.error('User decline error:', error);
        enqueueSnackbar('사용자 거절 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setDecliningUserId(null);
      }
    },
    [confirm, loadUsers, onExpiredSession],
  );

  const handleDeleteUser = useCallback(
    async (user: AdminUserRecord) => {
      if (currentUserId === user.id) {
        enqueueSnackbar('현재 로그인한 관리자 계정은 삭제할 수 없습니다.', { variant: 'error' });
        return;
      }

      const shouldDelete = await confirm({
        title: '사용자 삭제',
        description: `'${user.name}' 사용자를 삭제하시겠습니까? 연결된 세션은 종료되며 작성 기록의 작성자는 비워질 수 있습니다.`,
        confirmLabel: '삭제',
        confirmButtonStyle: 'error',
      });
      if (!shouldDelete) {
        return;
      }

      setDeletingUserId(user.id);

      try {
        const response = await apiFetch(`/authentication/admin/users/${user.id}`, {
          method: 'DELETE',
        });
        const payload = await parseApiResponse(response);

        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        if (!response.ok) {
          enqueueSnackbar(`사용자 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        enqueueSnackbar(getApiMessage(payload, '사용자가 삭제되었습니다.'), { variant: 'success' });
        await loadUsers();
      } catch (error) {
        console.error('User delete error:', error);
        enqueueSnackbar('사용자 삭제 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setDeletingUserId(null);
      }
    },
    [confirm, currentUserId, loadUsers, onExpiredSession],
  );

  const handleDeleteUserProfileImage = useCallback(
    async (user: AdminUserRecord) => {
      if (!user.profileImage) {
        enqueueSnackbar('삭제할 프로필 이미지가 없습니다.', { variant: 'info' });
        return;
      }

      const shouldDeleteProfileImage = await confirm({
        title: '프로필 이미지 삭제',
        description: `'${user.name}' 사용자의 프로필 이미지를 삭제하시겠습니까? 삭제 후에는 이니셜 아바타로 표시됩니다.`,
        confirmLabel: '삭제',
        confirmButtonStyle: 'error',
      });
      if (!shouldDeleteProfileImage) {
        return;
      }

      setRemovingProfileImageUserId(user.id);

      try {
        const response = await apiFetch(`/authentication/admin/users/${user.id}/profile-image`, {
          method: 'DELETE',
        });
        const payload = await parseApiResponse(response);

        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        if (!response.ok) {
          enqueueSnackbar(
            `프로필 이미지 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`,
            { variant: 'error' },
          );
          return;
        }

        enqueueSnackbar(getApiMessage(payload, '사용자 프로필 이미지가 삭제되었습니다.'), {
          variant: 'success',
        });

        await Promise.all([
          loadUsers(),
          currentUserId === user.id ? refreshMeInfo() : Promise.resolve(null),
        ]);
      } catch (error) {
        console.error('User profile image delete error:', error);
        enqueueSnackbar('프로필 이미지 삭제 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setRemovingProfileImageUserId(null);
      }
    },
    [confirm, currentUserId, loadUsers, onExpiredSession, refreshMeInfo],
  );

  return {
    approvingUserId,
    decliningUserId,
    deletingUserId,
    removingProfileImageUserId,
    handleApproveUser,
    handleDeclineUser,
    handleDeleteUser,
    handleDeleteUserProfileImage,
  };
}
