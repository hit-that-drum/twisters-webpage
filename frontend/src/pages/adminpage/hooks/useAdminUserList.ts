import { useCallback, useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import type { AdminUserRecord, PendingUserRecord } from '@/entities/user/types';
import { parseAdminUsers, parsePendingUsers } from '@/pages/adminpage/lib/adminParsers';

interface UseAdminUserListOptions {
  canManageUsers: boolean;
  isAuthLoading: boolean;
  onExpiredSession: () => void;
}

interface UseAdminUserListResult {
  isLoading: boolean;
  pendingUsers: PendingUserRecord[];
  allUsers: AdminUserRecord[];
  loadUsers: () => Promise<void>;
}

export default function useAdminUserList({
  canManageUsers,
  isAuthLoading,
  onExpiredSession,
}: UseAdminUserListOptions): UseAdminUserListResult {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUserRecord[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserRecord[]>([]);

  const loadUsers = useCallback(async () => {
    if (!canManageUsers) {
      return;
    }

    setIsLoading(true);

    try {
      const [pendingResponse, allUsersResponse] = await Promise.all([
        apiFetch('/authentication/admin/pending-users'),
        apiFetch('/authentication/admin/users'),
      ]);

      const [pendingPayload, allUsersPayload] = await Promise.all([
        parseApiResponse(pendingResponse),
        parseApiResponse(allUsersResponse),
      ]);

      if (pendingResponse.status === 401 || allUsersResponse.status === 401) {
        onExpiredSession();
        return;
      }

      if (!pendingResponse.ok) {
        enqueueSnackbar(
          `승인 대기 사용자 조회 실패: ${getApiMessage(pendingPayload, '알 수 없는 에러')}`,
          { variant: 'error' },
        );
        return;
      }

      if (!allUsersResponse.ok) {
        enqueueSnackbar(
          `전체 사용자 조회 실패: ${getApiMessage(allUsersPayload, '알 수 없는 에러')}`,
          { variant: 'error' },
        );
        return;
      }

      setPendingUsers(parsePendingUsers(pendingPayload));
      setAllUsers(parseAdminUsers(allUsersPayload));
    } catch (error) {
      console.error('Admin user list fetch error:', error);
      enqueueSnackbar('사용자 목록을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [canManageUsers, onExpiredSession]);

  useEffect(() => {
    if (!isAuthLoading && canManageUsers) {
      void loadUsers();
    }
  }, [canManageUsers, isAuthLoading, loadUsers]);

  return { isLoading, pendingUsers, allUsers, loadUsers };
}
