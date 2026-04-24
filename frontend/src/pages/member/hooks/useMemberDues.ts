import { useCallback, useEffect, useMemo, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { parseMemberDuesStatus } from '@/pages/member/lib/memberParsers';

interface UseMemberDuesOptions {
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  selectedUserId: number | null;
  onExpiredSession: () => void;
}

interface UseMemberDuesResult {
  duesYears: number[];
  selectedUserDuesStatus: Record<number, boolean>;
  loadMemberDuesStatus: () => Promise<void>;
}

/**
 * Loads the per-member dues deposit matrix and exposes the row for the
 * currently selected member.
 */
export default function useMemberDues({
  isAuthLoading,
  isAuthenticated,
  selectedUserId,
  onExpiredSession,
}: UseMemberDuesOptions): UseMemberDuesResult {
  const [duesYears, setDuesYears] = useState<number[]>([]);
  const [duesStatusByMemberId, setDuesStatusByMemberId] = useState<
    Record<number, Record<number, boolean>>
  >({});

  const loadMemberDuesStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/member/dues/deposit-status');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(
          `회원 회비 현황을 불러오지 못했습니다: ${getApiMessage(payload, '알 수 없는 에러')}`,
          {
            variant: 'error',
          },
        );
        setDuesYears([]);
        setDuesStatusByMemberId({});
        return;
      }

      const parsedDuesStatus = parseMemberDuesStatus(payload);
      setDuesYears(parsedDuesStatus.years);
      setDuesStatusByMemberId(parsedDuesStatus.byMemberId);
    } catch (error) {
      console.error('Member dues status fetch error:', error);
      enqueueSnackbar('회원 회비 현황 조회 중 오류가 발생했습니다.', { variant: 'error' });
    }
  }, [onExpiredSession]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    void loadMemberDuesStatus();
  }, [isAuthLoading, isAuthenticated, loadMemberDuesStatus]);

  const selectedUserDuesStatus = useMemo(() => {
    if (selectedUserId === null) {
      return {} as Record<number, boolean>;
    }

    return duesStatusByMemberId[selectedUserId] ?? ({} as Record<number, boolean>);
  }, [duesStatusByMemberId, selectedUserId]);

  return {
    duesYears,
    selectedUserDuesStatus,
    loadMemberDuesStatus,
  };
}
