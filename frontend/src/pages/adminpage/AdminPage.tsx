import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import useConfirmDialog from '@/common/components/useConfirmDialog';
import GlobalButton from '@/common/components/GlobalButton';
import type { TAction } from '@/common/components/GlobalModal';
import useExpiredSession from '@/common/hooks/useExpiredSession';
import LoadingComponent from '@/common/LoadingComponent';
import { useAuth } from '@/features';
import AdminPendingUsersPanel from '@/pages/adminpage/components/AdminPendingUsersPanel';
import AdminStatsCards from '@/pages/adminpage/components/AdminStatsCards';
import AdminUsersTable from '@/pages/adminpage/components/AdminUsersTable';
import AdminUserDetailModal from '@/pages/adminpage/AdminUserDetailModal';
import useAdminUserActions from '@/pages/adminpage/hooks/useAdminUserActions';
import useAdminUserEditing from '@/pages/adminpage/hooks/useAdminUserEditing';
import useAdminUserFilter from '@/pages/adminpage/hooks/useAdminUserFilter';
import useAdminUserList from '@/pages/adminpage/hooks/useAdminUserList';
import { formatJoinedDate } from '@/pages/adminpage/lib/adminFormatters';

export default function AdminPage() {
  const navigate = useNavigate();
  const { meInfo, isAuthLoading, refreshMeInfo } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();

  const canManageUsers = meInfo?.isAdmin === true;
  const currentUserId = meInfo?.id;

  const handleExpiredSession = useExpiredSession();

  const { isLoading, pendingUsers, allUsers, loadUsers } = useAdminUserList({
    canManageUsers,
    isAuthLoading,
    onExpiredSession: handleExpiredSession,
  });

  const {
    approvingUserId,
    decliningUserId,
    deletingUserId,
    removingProfileImageUserId,
    handleApproveUser,
    handleDeclineUser,
    handleDeleteUser,
    handleDeleteUserProfileImage,
  } = useAdminUserActions({
    canManageUsers,
    currentUserId,
    confirm,
    loadUsers,
    refreshMeInfo,
    onExpiredSession: handleExpiredSession,
  });

  const {
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
  } = useAdminUserEditing({
    canManageUsers,
    currentUserId,
    allUsers,
    confirm,
    loadUsers,
    refreshMeInfo,
    onExpiredSession: handleExpiredSession,
  });

  const {
    statusFilter,
    usersPage,
    filteredUsers,
    pagedUsers,
    maxPage,
    showingStart,
    showingEnd,
    handleToggleFilter,
    handlePreviousPage,
    handleNextPage,
  } = useAdminUserFilter({ allUsers });

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!meInfo) {
      navigate('/signin', { replace: true });
      return;
    }

    if (!meInfo.isAdmin) {
      enqueueSnackbar('관리자만 접근할 수 있는 페이지입니다.', { variant: 'error' });
      navigate(`/${meInfo.id}`, { replace: true });
    }
  }, [isAuthLoading, meInfo, navigate]);

  const handleAddNewUser = () => {
    console.log('handleAddNewUser');
  };

  const editModalActions: TAction[] = [
    {
      label: isSubmitting ? 'Updating...' : hasEditChanges ? 'Update' : 'No changes',
      onClick: () => {
        void handleUpdateUser();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting || !hasEditChanges || !isEditFormValid,
    },
  ];

  if (isAuthLoading) {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-10">
        <p className="text-sm font-medium text-slate-500">관리자 페이지를 확인 중입니다...</p>
      </main>
    );
  }

  if (isLoading) {
    return <LoadingComponent />;
  }

  const activeUsersCount = allUsers.filter((user) => user.isAllowed).length;

  return (
    <main className="mx-auto flex w-full flex-1 flex-col px-4 py-8 md:px-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">ADMIN DASHBOARD</h1>
        </div>

        <div className="flex gap-3">
          <GlobalButton
            onClick={handleAddNewUser}
            label="Add New User"
            iconBasicMappingType="ADD"
          />
        </div>
      </div>

      <AdminStatsCards
        totalMembersCount={allUsers.length}
        pendingApprovalsCount={pendingUsers.length}
        activeUsersCount={activeUsersCount}
      />

      <AdminPendingUsersPanel
        pendingUsers={pendingUsers}
        approvingUserId={approvingUserId}
        decliningUserId={decliningUserId}
        isRefreshing={isLoading}
        onApprove={(userId) => void handleApproveUser(userId)}
        onDecline={(userId) => void handleDeclineUser(userId)}
        onRefresh={() => void loadUsers()}
      />

      <AdminUsersTable
        pagedUsers={pagedUsers}
        filteredUsersCount={filteredUsers.length}
        isLoading={isLoading}
        statusFilter={statusFilter}
        currentUserId={currentUserId}
        deletingUserId={deletingUserId}
        removingProfileImageUserId={removingProfileImageUserId}
        usersPage={usersPage}
        maxPage={maxPage}
        showingStart={showingStart}
        showingEnd={showingEnd}
        onToggleFilter={handleToggleFilter}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onEditUser={handleOpenEditDialog}
        onDeleteUser={(user) => void handleDeleteUser(user)}
        onDeleteProfileImage={(user) => void handleDeleteUserProfileImage(user)}
      />

      <AdminUserDetailModal
        open={openEditDialog}
        handleClose={handleCloseEditDialog}
        title="EDIT USER"
        actions={editModalActions}
        form={editUserForm}
        initialForm={initialEditUserForm}
        isSubmitting={isSubmitting}
        disablePrivilegeControls={currentUserId === editingUserId}
        disableRoleControl={false}
        disableStatusControl={false}
        emailOptional={false}
        userName={editingUser?.name}
        joinedLabel={editingUser ? formatJoinedDate(editingUser.createdAt) : undefined}
        authProvider={editingUser?.authProvider}
        onFormChange={handleEditFormChange}
      />

      {confirmDialog}
    </main>
  );
}
