import { useCallback, useEffect, useMemo, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { parseMembers } from '@/pages/member/lib/memberParsers';
import type { MemberUser } from '@/entities/user/types';

interface UseMemberListOptions {
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  onExpiredSession: () => void;
}

interface UseMemberListResult {
  users: MemberUser[];
  selectedUser: MemberUser | null;
  selectedUserId: number | null;
  setSelectedUserId: (id: number | null) => void;
  isLoading: boolean;
  loadMembers: () => Promise<void>;
}

/**
 * Owns the member directory fetch and the "currently selected member" pointer.
 * Keeps the previously-selected member pinned across refetches when possible,
 * otherwise falls back to the first member in the list.
 */
export default function useMemberList({
  isAuthLoading,
  isAuthenticated,
  onExpiredSession,
}: UseMemberListOptions): UseMemberListResult {
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch('/member');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(
          `회원 목록을 불러오지 못했습니다: ${getApiMessage(payload, '알 수 없는 에러')}`,
          {
            variant: 'error',
          },
        );
        setUsers([]);
        setSelectedUserId(null);
        return;
      }

      const parsedMembers = parseMembers(payload);
      setUsers(parsedMembers);

      if (parsedMembers.length === 0) {
        setSelectedUserId(null);
        return;
      }

      setSelectedUserId((previous) => {
        if (previous && parsedMembers.some((member) => member.id === previous)) {
          return previous;
        }

        return parsedMembers[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Member list fetch error:', error);
      enqueueSnackbar('회원 목록 조회 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [onExpiredSession]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    void loadMembers();
  }, [isAuthLoading, isAuthenticated, loadMembers]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  return {
    users,
    selectedUser,
    selectedUserId,
    setSelectedUserId,
    isLoading,
    loadMembers,
  };
}
