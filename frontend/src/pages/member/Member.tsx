import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/features';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { EditDeleteButton, GlobalButton, useConfirmDialog } from '@/common/components';
import MemberDetailModal, { type MemberFormState } from './MemberDetailModal';
import MemberAvatar from './MemberAvatar';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import { BiMoneyWithdraw } from 'react-icons/bi';
import LoadingComponent from '@/common/LoadingComponent';
import type { MemberUser } from '@/entities/user/types';
import type { DetailInfoItem } from '@/pages/member/lib/memberTypes';
import {
  getAttendanceStatusKey,
  parseMemberAttendanceStatus,
  parseMemberDuesStatus,
  parseMembers,
} from '@/pages/member/lib/memberParsers';
import {
  createDefaultMemberForm,
  getDuesDisplayMeta,
  getMeetingAttendanceDisplayMeta,
  getMeetingPeriodLabel,
  renderDetailValue,
  toEditForm,
} from '@/pages/member/lib/memberFormatters';

const DetailInfoDesc = (detailInfo: DetailInfoItem[]) => {
  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-7 md:grid-cols-2 xl:grid-cols-2">
      {detailInfo.map((el) => {
        return (
          <div key={el.key} className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{el.label}</p>
            <p className="text-lg font-semibold text-slate-800">{renderDetailValue(el.value)}</p>
          </div>
        );
      })}
    </div>
  );
};

export default function Member() {
  const navigate = useNavigate();
  const { meInfo, isAuthLoading, logout } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [users, setUsers] = useState<MemberUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState<MemberFormState>(() =>
    createDefaultMemberForm(),
  );
  const [editMemberForm, setEditMemberForm] = useState<MemberFormState>(() =>
    createDefaultMemberForm(),
  );
  const [duesYears, setDuesYears] = useState<number[]>([]);
  const [duesStatusByMemberId, setDuesStatusByMemberId] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [attendancePeriods, setAttendancePeriods] = useState<Array<{ year: number; period: number }>>([]);
  const [attendanceStatusByMemberId, setAttendanceStatusByMemberId] = useState<
    Record<number, Record<string, boolean>>
  >({});
  const [updatingAttendanceKey, setUpdatingAttendanceKey] = useState<string | null>(null);

  const canManageMembers = meInfo?.isAdmin === true;

  const handleExpiredSession = useCallback(() => {
    logout();
    enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
    navigate('/signin', { replace: true });
  }, [logout, navigate]);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch('/member');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
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
  }, [handleExpiredSession]);

  const loadMemberDuesStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/member/dues/deposit-status');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
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
  }, [handleExpiredSession]);

  const loadMemberMeetingAttendanceStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/member/meeting/attendance-status');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
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
  }, [handleExpiredSession]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!meInfo) {
      handleExpiredSession();
      return;
    }

    void Promise.all([loadMembers(), loadMemberDuesStatus(), loadMemberMeetingAttendanceStatus()]);
  }, [
    handleExpiredSession,
    isAuthLoading,
    loadMemberDuesStatus,
    loadMemberMeetingAttendanceStatus,
    loadMembers,
    meInfo,
  ]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const selectedUserDuesStatus = useMemo(() => {
    if (!selectedUser) {
      return {} as Record<number, boolean>;
    }

    return duesStatusByMemberId[selectedUser.id] ?? ({} as Record<number, boolean>);
  }, [duesStatusByMemberId, selectedUser]);

  const selectedUserAttendanceStatus = useMemo(() => {
    if (!selectedUser) {
      return {} as Record<string, boolean>;
    }

    return attendanceStatusByMemberId[selectedUser.id] ?? ({} as Record<string, boolean>);
  }, [attendanceStatusByMemberId, selectedUser]);

  const userDetailInfo = useMemo<DetailInfoItem[]>(() => {
    if (!selectedUser) {
      return [];
    }

    return [
      {
        key: 'email',
        label: 'Email',
        value: selectedUser.email,
      },
      {
        key: 'phone',
        label: 'Phone',
        value: selectedUser.phone,
      },
      {
        key: 'birthDate',
        label: 'Birth Date',
        value: selectedUser.birthDate,
      },
      {
        key: 'joinedAt',
        label: 'Joined At',
        value: selectedUser.joinedAt,
      },
    ];
  }, [selectedUser]);

  const handleOpenAddDialog = () => {
    setAddMemberForm(createDefaultMemberForm());
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = (event: object, reason: ModalCloseReason) => {
    void event;
    void reason;

    if (isSubmitting) {
      return;
    }

    setOpenAddDialog(false);
  };

  const handleOpenEditDialog = () => {
    if (!selectedUser) {
      enqueueSnackbar('먼저 수정할 회원을 선택해주세요.', { variant: 'error' });
      return;
    }

    setEditMemberForm(toEditForm(selectedUser));
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = (event: object, reason: ModalCloseReason) => {
    void event;
    void reason;

    if (isSubmitting) {
      return;
    }

    setOpenEditDialog(false);
  };

  const handleChangeAddForm = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setAddMemberForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleChangeEditForm = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setEditMemberForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAddDateChange = (field: 'birthDate', value: string) => {
    setAddMemberForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleEditDateChange = (field: 'birthDate', value: string) => {
    setEditMemberForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCreateMember = async () => {
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/member', {
        method: 'POST',
        body: JSON.stringify(addMemberForm),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
          return;
        }

        enqueueSnackbar(`회원 등록 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '회원이 등록되었습니다.'), { variant: 'success' });
      setOpenAddDialog(false);
      await Promise.all([loadMembers(), loadMemberDuesStatus(), loadMemberMeetingAttendanceStatus()]);
    } catch (error) {
      console.error('Member create error:', error);
      enqueueSnackbar('회원 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMember = async () => {
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
          handleExpiredSession();
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
      await Promise.all([loadMembers(), loadMemberDuesStatus(), loadMemberMeetingAttendanceStatus()]);
    } catch (error) {
      console.error('Member update error:', error);
      enqueueSnackbar('회원 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
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
          handleExpiredSession();
          return;
        }

        enqueueSnackbar(`회원 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '회원이 삭제되었습니다.'), { variant: 'success' });
      setOpenEditDialog(false);
      await Promise.all([loadMembers(), loadMemberDuesStatus(), loadMemberMeetingAttendanceStatus()]);
    } catch (error) {
      console.error('Member delete error:', error);
      enqueueSnackbar('회원 삭제 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetMeetingAttendance = useCallback(
    async (year: number, period: number, attended: boolean) => {
      if (!selectedUser || !canManageMembers) {
        return;
      }

      const attendanceKey = getAttendanceStatusKey(year, period);
      setUpdatingAttendanceKey(attendanceKey);

      try {
        const response = await apiFetch(
          `/member/${selectedUser.id}/meeting/attendance/${year}/${period}`,
          {
          method: 'PATCH',
          body: JSON.stringify({ attended }),
          },
        );
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredSession();
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
          getApiMessage(payload, `${year}년 ${getMeetingPeriodLabel(period)} 참석 여부가 저장되었습니다.`),
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
    [canManageMembers, handleExpiredSession, loadMemberMeetingAttendanceStatus, selectedUser],
  );

  const handleResetMeetingAttendance = useCallback(
    async (year: number, period: number) => {
      if (!selectedUser || !canManageMembers) {
        return;
      }

      const attendanceKey = getAttendanceStatusKey(year, period);
      setUpdatingAttendanceKey(attendanceKey);

      try {
        const response = await apiFetch(
          `/member/${selectedUser.id}/meeting/attendance/${year}/${period}`,
          {
            method: 'DELETE',
          },
        );
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredSession();
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
          getApiMessage(payload, `${year}년 ${getMeetingPeriodLabel(period)} 수동 설정을 해제했습니다.`),
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
    [canManageMembers, handleExpiredSession, loadMemberMeetingAttendanceStatus, selectedUser],
  );

  // ===== 정리한 코드 =====

  const addModalActions: TAction[] = [
    {
      label: '저장',
      onClick: () => {
        void handleCreateMember();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting,
    },
  ];

  const editModalActions: TAction[] = [
    {
      label: '삭제',
      onClick: () => {
        void handleDeleteMember();
      },
      buttonStyle: 'error',
      disabled: isSubmitting,
    },
    {
      label: '수정',
      onClick: () => {
        void handleUpdateMember();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting,
    },
  ];

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <section className="px-3 py-6 sm:px-4 sm:py-8 lg:px-20">
      <div className="mx-auto flex w-full flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              MEMBER
            </h1>
          </div>

          {canManageMembers && (
            <GlobalButton
              onClick={handleOpenAddDialog}
              label="ADD MEMBER"
              iconBasicMappingType="ADD"
            />
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3 lg:sticky lg:top-6">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
              <h3
                id="member-directory-heading"
                className="text-sm font-bold uppercase tracking-wider text-slate-500"
              >
                Member Directory
              </h3>
            </div>

            <div
              className="flex flex-col"
              role="listbox"
              aria-labelledby="member-directory-heading"
            >
              {users.length === 0 ? (
                <p className="px-4 py-5 text-sm font-medium text-slate-500">
                  No members available.
                </p>
              ) : (
                users.map((user) => {
                  const isActive = user.id === selectedUserId;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      role="option"
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      className={`flex w-full items-center gap-3 border-r-4 px-4 py-3 text-left transition-all ${
                        isActive
                          ? 'border-amber-300 bg-amber-50/60 text-slate-900'
                          : 'border-transparent text-slate-600 hover:bg-slate-50'
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset`}
                    >
                      <MemberAvatar
                        name={user.name}
                        profileImage={user.profileImage}
                        containerClassName={`inline-flex size-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${
                          isActive ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'
                        }`}
                        fallbackClassName="text-xs font-bold"
                      />

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${
                            isActive ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          {user.name}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                          {renderDetailValue(user.email)}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex flex-col gap-6 lg:col-span-9">
            {selectedUser ? (
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/60">
                <div className="p-6 md:p-8">
                  <div className="mb-8 flex flex-col gap-5 border-b border-slate-100 pb-8 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-5">
                      <MemberAvatar
                        key={`${selectedUser.id}:${selectedUser.profileImage ?? ''}`}
                        name={selectedUser.name}
                        profileImage={selectedUser.profileImage}
                        containerClassName="inline-flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-amber-300 bg-slate-100 text-4xl font-black text-slate-500 shadow-inner"
                        fallbackClassName="text-4xl font-black text-slate-500"
                      />

                      <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900">
                          {selectedUser.name}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {selectedUser.isAdmin ? 'Administrator' : 'Member'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManageMembers && (
                      <EditDeleteButton
                        onEditClick={handleOpenEditDialog}
                        isExisteDeleteButton={false}
                      />
                    )}
                  </div>

                  {DetailInfoDesc(userDetailInfo)}
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-6 py-6 md:px-8">
                  <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <span aria-hidden="true" className="text-amber-500">
                      <BiMoneyWithdraw />
                    </span>
                    회비 입금 여부
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {duesYears.length > 0 ? (
                      duesYears.map((year) => {
                        const isPaid = selectedUserDuesStatus[year] === true;
                        const statusMeta = getDuesDisplayMeta(year, isPaid);

                        return (
                          <div
                            key={`dues-${year}`}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <span className="font-bold text-slate-600">{year}년</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${statusMeta.className}`}
                            >
                              <span aria-hidden="true">{statusMeta.icon}</span>
                              {statusMeta.label}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                        회비 데이터 없음
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-white px-6 py-6 md:px-8">
                  <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <span aria-hidden="true" className="text-sky-500">
                      📅
                    </span>
                    연도/차수별 모임 참석 여부
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {attendancePeriods.length > 0 ? (
                      attendancePeriods.map(({ year, period }) => {
                        const attendanceKey = getAttendanceStatusKey(year, period);
                        const isAttended = selectedUserAttendanceStatus[attendanceKey] === true;
                        const statusMeta = getMeetingAttendanceDisplayMeta(year, period, isAttended);
                        const isUpdatingYear = updatingAttendanceKey === attendanceKey;

                        return (
                          <div
                            key={`attendance-${attendanceKey}`}
                            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-slate-600">{year}년</span>
                              <span className="text-xs font-semibold text-slate-400">
                                {getMeetingPeriodLabel(period)}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${statusMeta.className}`}
                              >
                                <span aria-hidden="true">{statusMeta.icon}</span>
                                {statusMeta.label}
                              </span>

                              {canManageMembers && (
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleSetMeetingAttendance(year, period, true);
                                    }}
                                    disabled={isUpdatingYear}
                                    className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isUpdatingYear ? '저장 중...' : '참석'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleSetMeetingAttendance(year, period, false);
                                    }}
                                    disabled={isUpdatingYear}
                                    className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    미참석
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleResetMeetingAttendance(year, period);
                                    }}
                                    disabled={isUpdatingYear}
                                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    자동
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                        모임 참석 데이터 없음
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-sm font-semibold text-slate-500 shadow-sm">
                선택된 회원이 없습니다.
              </div>
            )}
          </section>
        </div>
      </div>

      <MemberDetailModal
        type="ADD"
        open={openAddDialog}
        handleClose={handleCloseAddDialog}
        title="ADD MEMBER"
        actions={addModalActions}
        form={addMemberForm}
        isSubmitting={isSubmitting}
        onFormChange={handleChangeAddForm}
        onDateChange={handleAddDateChange}
      />

      <MemberDetailModal
        type="EDIT"
        open={openEditDialog}
        handleClose={handleCloseEditDialog}
        title="EDIT MEMBER"
        actions={editModalActions}
        form={editMemberForm}
        isSubmitting={isSubmitting}
        onFormChange={handleChangeEditForm}
        onDateChange={handleEditDateChange}
      />

      {confirmDialog}
    </section>
  );
}
