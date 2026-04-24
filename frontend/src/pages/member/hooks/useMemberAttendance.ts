import { useCallback, useEffect, useMemo, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import {
  getAttendanceStatusKey,
  parseMemberAttendanceStatus,
} from '@/pages/member/lib/memberParsers';
import { getMeetingPeriodLabel } from '@/pages/member/lib/memberFormatters';

interface UseMemberAttendanceOptions {
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  selectedUserId: number | null;
  canManageMembers: boolean;
  onExpiredSession: () => void;
}

interface UseMemberAttendanceResult {
  attendancePeriods: Array<{ year: number; period: number }>;
  selectedUserAttendanceStatus: Record<string, boolean>;
  updatingAttendanceKey: string | null;
  loadMemberMeetingAttendanceStatus: () => Promise<void>;
  handleSetMeetingAttendance: (year: number, period: number, attended: boolean) => Promise<void>;
  handleResetMeetingAttendance: (year: number, period: number) => Promise<void>;
}

/**
 * Owns meeting attendance fetch and the manual set/reset mutations.
 * Set/reset require `canManageMembers` and a `selectedUserId` — callers still
 * see the fine-grained `updatingAttendanceKey` for spinner UI.
 */
export default function useMemberAttendance({
  isAuthLoading,
  isAuthenticated,
  selectedUserId,
  canManageMembers,
  onExpiredSession,
}: UseMemberAttendanceOptions): UseMemberAttendanceResult {
  const [attendancePeriods, setAttendancePeriods] = useState<Array<{ year: number; period: number }>>(
    [],
  );
  const [attendanceStatusByMemberId, setAttendanceStatusByMemberId] = useState<
    Record<number, Record<string, boolean>>
  >({});
  const [updatingAttendanceKey, setUpdatingAttendanceKey] = useState<string | null>(null);

  const loadMemberMeetingAttendanceStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/member/meeting/attendance-status');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          onExpiredSession();
          return;
        }

        enqueueSnackbar(
          `회원 모임 참석 현황을 불러오지 못했습니다: ${getApiMessage(payload, '알 수 없는 에러')}`,
          {
            variant: 'error',
          },
        );
        setAttendancePeriods([]);
        setAttendanceStatusByMemberId({});
        return;
      }

      const parsedAttendanceStatus = parseMemberAttendanceStatus(payload);
      setAttendancePeriods(parsedAttendanceStatus.periods);
      setAttendanceStatusByMemberId(parsedAttendanceStatus.byMemberId);
    } catch (error) {
      console.error('Member meeting attendance status fetch error:', error);
      enqueueSnackbar('회원 모임 참석 현황 조회 중 오류가 발생했습니다.', { variant: 'error' });
    }
  }, [onExpiredSession]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    void loadMemberMeetingAttendanceStatus();
  }, [isAuthLoading, isAuthenticated, loadMemberMeetingAttendanceStatus]);

  const selectedUserAttendanceStatus = useMemo(() => {
    if (selectedUserId === null) {
      return {} as Record<string, boolean>;
    }

    return attendanceStatusByMemberId[selectedUserId] ?? ({} as Record<string, boolean>);
  }, [attendanceStatusByMemberId, selectedUserId]);

  const handleSetMeetingAttendance = useCallback(
    async (year: number, period: number, attended: boolean) => {
      if (selectedUserId === null || !canManageMembers) {
        return;
      }

      const attendanceKey = getAttendanceStatusKey(year, period);
      setUpdatingAttendanceKey(attendanceKey);

      try {
        const response = await apiFetch(
          `/member/${selectedUserId}/meeting/attendance/${year}/${period}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ attended }),
          },
        );
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            onExpiredSession();
            return;
          }

          enqueueSnackbar(
            `회원 모임 참석 상태 저장 실패: ${getApiMessage(payload, '알 수 없는 에러')}`,
            {
              variant: 'error',
            },
          );
          return;
        }

        enqueueSnackbar(
          getApiMessage(
            payload,
            `${year}년 ${getMeetingPeriodLabel(period)} 참석 여부가 저장되었습니다.`,
          ),
          {
            variant: 'success',
          },
        );
        await loadMemberMeetingAttendanceStatus();
      } catch (error) {
        console.error('Member meeting attendance update error:', error);
        enqueueSnackbar('회원 모임 참석 상태 저장 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setUpdatingAttendanceKey(null);
      }
    },
    [canManageMembers, loadMemberMeetingAttendanceStatus, onExpiredSession, selectedUserId],
  );

  const handleResetMeetingAttendance = useCallback(
    async (year: number, period: number) => {
      if (selectedUserId === null || !canManageMembers) {
        return;
      }

      const attendanceKey = getAttendanceStatusKey(year, period);
      setUpdatingAttendanceKey(attendanceKey);

      try {
        const response = await apiFetch(
          `/member/${selectedUserId}/meeting/attendance/${year}/${period}`,
          {
            method: 'DELETE',
          },
        );
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            onExpiredSession();
            return;
          }

          enqueueSnackbar(
            `회원 모임 참석 수동 설정 해제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`,
            {
              variant: 'error',
            },
          );
          return;
        }

        enqueueSnackbar(
          getApiMessage(
            payload,
            `${year}년 ${getMeetingPeriodLabel(period)} 수동 설정을 해제했습니다.`,
          ),
          {
            variant: 'success',
          },
        );
        await loadMemberMeetingAttendanceStatus();
      } catch (error) {
        console.error('Member meeting attendance reset error:', error);
        enqueueSnackbar('회원 모임 참석 수동 설정 해제 중 오류가 발생했습니다.', {
          variant: 'error',
        });
      } finally {
        setUpdatingAttendanceKey(null);
      }
    },
    [canManageMembers, loadMemberMeetingAttendanceStatus, onExpiredSession, selectedUserId],
  );

  return {
    attendancePeriods,
    selectedUserAttendanceStatus,
    updatingAttendanceKey,
    loadMemberMeetingAttendanceStatus,
    handleSetMeetingAttendance,
    handleResetMeetingAttendance,
  };
}
