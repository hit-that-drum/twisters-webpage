import { useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/features';
import { GlobalButton, useConfirmDialog } from '@/common/components';
import type { TAction } from '@/common/components/GlobalModal';
import useExpiredSession from '@/common/hooks/useExpiredSession';
import LoadingComponent from '@/common/LoadingComponent';
import MemberDetailModal from '@/pages/member/MemberDetailModal';
import MemberSidebar from '@/pages/member/components/MemberSidebar';
import MemberProfileHeader from '@/pages/member/components/MemberProfileHeader';
import MemberDuesPanel from '@/pages/member/components/MemberDuesPanel';
import MemberAttendancePanel from '@/pages/member/components/MemberAttendancePanel';
import useMemberList from '@/pages/member/hooks/useMemberList';
import useMemberDues from '@/pages/member/hooks/useMemberDues';
import useMemberAttendance from '@/pages/member/hooks/useMemberAttendance';
import useMemberMutations from '@/pages/member/hooks/useMemberMutations';
import type { DetailInfoItem } from '@/pages/member/lib/memberTypes';

export default function Member() {
  const { meInfo, isAuthLoading } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const handleExpiredSession = useExpiredSession();

  const canManageMembers = meInfo?.isAdmin === true;
  const isAuthenticated = Boolean(meInfo);

  const {
    users,
    selectedUser,
    selectedUserId,
    setSelectedUserId,
    isLoading,
    loadMembers,
  } = useMemberList({
    isAuthLoading,
    isAuthenticated,
    onExpiredSession: handleExpiredSession,
  });

  const { duesYears, selectedUserDuesStatus, loadMemberDuesStatus } = useMemberDues({
    isAuthLoading,
    isAuthenticated,
    selectedUserId,
    onExpiredSession: handleExpiredSession,
  });

  const {
    attendancePeriods,
    selectedUserAttendanceStatus,
    updatingAttendanceKey,
    loadMemberMeetingAttendanceStatus,
    handleSetMeetingAttendance,
    handleResetMeetingAttendance,
  } = useMemberAttendance({
    isAuthLoading,
    isAuthenticated,
    selectedUserId,
    canManageMembers,
    onExpiredSession: handleExpiredSession,
  });

  const refetchAll = useCallback(
    () =>
      Promise.all([loadMembers(), loadMemberDuesStatus(), loadMemberMeetingAttendanceStatus()]),
    [loadMembers, loadMemberDuesStatus, loadMemberMeetingAttendanceStatus],
  );

  const mutations = useMemberMutations({
    selectedUser,
    confirm,
    refetchAll,
    onExpiredSession: handleExpiredSession,
  });

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!meInfo) {
      handleExpiredSession();
    }
  }, [handleExpiredSession, isAuthLoading, meInfo]);

  const userDetailInfo = useMemo<DetailInfoItem[]>(() => {
    if (!selectedUser) {
      return [];
    }

    return [
      { key: 'email', label: 'Email', value: selectedUser.email },
      { key: 'phone', label: 'Phone', value: selectedUser.phone },
      { key: 'birthDate', label: 'Birth Date', value: selectedUser.birthDate },
      { key: 'joinedAt', label: 'Joined At', value: selectedUser.joinedAt },
    ];
  }, [selectedUser]);

  const addModalActions: TAction[] = [
    {
      label: '저장',
      onClick: () => {
        void mutations.handleCreateMember();
      },
      buttonStyle: 'confirm',
      disabled: mutations.isSubmitting,
    },
  ];

  const editModalActions: TAction[] = [
    {
      label: '삭제',
      onClick: () => {
        void mutations.handleDeleteMember();
      },
      buttonStyle: 'error',
      disabled: mutations.isSubmitting,
    },
    {
      label: '수정',
      onClick: () => {
        void mutations.handleUpdateMember();
      },
      buttonStyle: 'confirm',
      disabled: mutations.isSubmitting,
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
              onClick={mutations.handleOpenAddDialog}
              label="ADD MEMBER"
              iconBasicMappingType="ADD"
            />
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <MemberSidebar
            users={users}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
          />

          <section className="flex flex-col gap-6 lg:col-span-9">
            {selectedUser ? (
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/60">
                <MemberProfileHeader
                  selectedUser={selectedUser}
                  detailInfo={userDetailInfo}
                  canManageMembers={canManageMembers}
                  onEditClick={mutations.handleOpenEditDialog}
                />

                <MemberDuesPanel
                  duesYears={duesYears}
                  selectedUserDuesStatus={selectedUserDuesStatus}
                />

                <MemberAttendancePanel
                  attendancePeriods={attendancePeriods}
                  selectedUserAttendanceStatus={selectedUserAttendanceStatus}
                  updatingAttendanceKey={updatingAttendanceKey}
                  canManageMembers={canManageMembers}
                  onSetAttendance={(year, period, attended) => {
                    void handleSetMeetingAttendance(year, period, attended);
                  }}
                  onResetAttendance={(year, period) => {
                    void handleResetMeetingAttendance(year, period);
                  }}
                />
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
        open={mutations.openAddDialog}
        handleClose={mutations.handleCloseAddDialog}
        title="ADD MEMBER"
        actions={addModalActions}
        form={mutations.addMemberForm}
        isSubmitting={mutations.isSubmitting}
        onFormChange={mutations.handleChangeAddForm}
        onDateChange={mutations.handleAddDateChange}
      />

      <MemberDetailModal
        type="EDIT"
        open={mutations.openEditDialog}
        handleClose={mutations.handleCloseEditDialog}
        title="EDIT MEMBER"
        actions={editModalActions}
        form={mutations.editMemberForm}
        isSubmitting={mutations.isSubmitting}
        onFormChange={mutations.handleChangeEditForm}
        onDateChange={mutations.handleEditDateChange}
      />

      {confirmDialog}
    </section>
  );
}
