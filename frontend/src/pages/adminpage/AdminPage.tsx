import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import EditDeleteButton from '@/common/components/EditDeleteButton';
import { apiFetch } from '@/common/lib/api/apiClient';
import { useAuth } from '@/features';
import GlobalButton from '@/common/components/GlobalButton';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import AdminUserDetailModal, { type AdminUserFormState } from './AdminUserDetailModal';

interface PendingUserRecord {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

interface AdminUserRecord {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isAllowed: boolean;
  createdAt: string;
  phone?: string | null;
  department?: string | null;
  joinedAt?: string | null;
}

type UserStatusFilter = 'all' | 'active' | 'inactive';

const USERS_PAGE_SIZE = 3;
const USER_STATUS_FILTER_LABEL: Record<UserStatusFilter, string> = {
  all: 'All',
  active: 'Active',
  inactive: 'Inactive',
};

const AVATAR_TONES = [
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
] as const;

const countFormatter = new Intl.NumberFormat('en-US');

const parseApiResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text || null;
};

const getApiMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object') {
    const errorMessage = (payload as { error?: unknown }).error;
    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage;
    }

    const successMessage = (payload as { message?: unknown }).message;
    if (typeof successMessage === 'string' && successMessage.trim()) {
      return successMessage;
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return fallback;
};

const normalizeBoolean = (rawValue: unknown, fallbackValue = false) => {
  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'number') {
    return rawValue === 1;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return fallbackValue;
};

const parsePendingUsers = (payload: unknown): PendingUserRecord[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const parsed = row as {
        id?: unknown;
        name?: unknown;
        email?: unknown;
        createdAt?: unknown;
      };

      if (
        typeof parsed.id !== 'number' ||
        typeof parsed.name !== 'string' ||
        typeof parsed.email !== 'string'
      ) {
        return null;
      }

      const createdAtValue =
        typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString();

      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        createdAt: createdAtValue,
      } satisfies PendingUserRecord;
    })
    .filter((row): row is PendingUserRecord => row !== null);
};

const parseAdminUsers = (payload: unknown): AdminUserRecord[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const parsed = row as {
        id?: unknown;
        name?: unknown;
        email?: unknown;
        isAdmin?: unknown;
        isAllowed?: unknown;
        createdAt?: unknown;
      };

      if (
        typeof parsed.id !== 'number' ||
        typeof parsed.name !== 'string' ||
        typeof parsed.email !== 'string'
      ) {
        return null;
      }

      const createdAtValue =
        typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString();

      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        isAdmin: normalizeBoolean(parsed.isAdmin, false),
        isAllowed: normalizeBoolean(parsed.isAllowed, false),
        createdAt: createdAtValue,
      } satisfies AdminUserRecord;
    })
    .filter((row): row is AdminUserRecord => row !== null);
};

const formatDateTime = (raw: string) => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatJoinedDate = (raw: string) => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  const first = tokens[0]?.charAt(0) ?? '';
  const last = tokens[tokens.length - 1]?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
};

const getAvatarToneClassName = (userId: number) => {
  return AVATAR_TONES[userId % AVATAR_TONES.length] ?? AVATAR_TONES[0];
};

const formatCount = (count: number) => {
  return countFormatter.format(count);
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const toAdminUserForm = (user: AdminUserRecord): AdminUserFormState => ({
  name: user.name,
  email: user.email,
  role: user.isAdmin ? 'admin' : 'member',
  status: user.isAllowed ? 'active' : 'inactive',
});

const EMPTY_ADMIN_USER_FORM: AdminUserFormState = {
  name: '',
  email: '',
  role: 'member',
  status: 'active',
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { meInfo, isAuthLoading, logout, refreshMeInfo } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);
  const [decliningUserId, setDecliningUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editUserForm, setEditUserForm] = useState<AdminUserFormState>(EMPTY_ADMIN_USER_FORM);
  const [pendingUsers, setPendingUsers] = useState<PendingUserRecord[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');
  const [usersPage, setUsersPage] = useState(0);

  const canManageUsers = meInfo?.isAdmin === true;

  const handleExpiredSession = useCallback(() => {
    logout();
    enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
    navigate('/signin', { replace: true });
  }, [logout, navigate]);

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
        handleExpiredSession();
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
  }, [canManageUsers, handleExpiredSession]);

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

  useEffect(() => {
    if (!isAuthLoading && canManageUsers) {
      void loadUsers();
    }
  }, [canManageUsers, isAuthLoading, loadUsers]);

  const handleApproveUser = useCallback(
    async (userId: number) => {
      if (!canManageUsers) {
        enqueueSnackbar('관리자 권한이 필요합니다.', { variant: 'error' });
        return;
      }

      const shouldApprove = window.confirm('해당 사용자를 승인하시겠습니까?');
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
          handleExpiredSession();
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
    [canManageUsers, handleExpiredSession, loadUsers],
  );

  const handleDeclineUser = useCallback(
    async (userId: number) => {
      const shouldDecline = window.confirm(
        '해당 사용자의 가입 요청을 거절하고 대기 중인 계정을 삭제하시겠습니까?',
      );
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
          handleExpiredSession();
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
    [handleExpiredSession, loadUsers],
  );

  const handleOpenEditDialog = useCallback(
    (user: AdminUserRecord) => {
      setEditingUserId(user.id);
      setEditUserForm(toAdminUserForm(user));
      setOpenEditDialog(true);
    },
    [],
  );

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

  const handleCloseEditDialog = useCallback(
    (event: object, reason: ModalCloseReason) => {
      void event;
      void reason;

      if (isSubmitting) {
        return;
      }

      if (hasEditChanges) {
        const shouldClose = window.confirm(
          '변경 사항이 있습니다. 저장하지 않고 닫으면 변경사항이 유실됩니다. 닫으시겠습니까?',
        );
        if (!shouldClose) {
          return;
        }
      }

      setOpenEditDialog(false);
      setEditingUserId(null);
      setEditUserForm(EMPTY_ADMIN_USER_FORM);
    },
    [hasEditChanges, isSubmitting],
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
      meInfo?.id === editingUserId &&
      (editUserForm.role !== initialEditUserForm.role || editUserForm.status !== initialEditUserForm.status)
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
        handleExpiredSession();
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

      await Promise.all([loadUsers(), meInfo?.id === editingUserId ? refreshMeInfo() : Promise.resolve(null)]);
    } catch (error) {
      console.error('User update error:', error);
      enqueueSnackbar('사용자 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canManageUsers,
    editUserForm.email,
    editUserForm.name,
    editUserForm.role,
    editUserForm.status,
    editingUserId,
    handleExpiredSession,
    hasEditChanges,
    initialEditUserForm.role,
    initialEditUserForm.status,
    loadUsers,
    meInfo?.id,
    refreshMeInfo,
  ]);

  const handleDeleteUser = useCallback(
    async (user: AdminUserRecord) => {
      if (meInfo?.id === user.id) {
        enqueueSnackbar('현재 로그인한 관리자 계정은 삭제할 수 없습니다.', { variant: 'error' });
        return;
      }

      const shouldDelete = window.confirm(
        `'${user.name}' 사용자를 삭제하시겠습니까? 연결된 세션은 종료되며 작성 기록의 작성자는 비워질 수 있습니다.`,
      );
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
          handleExpiredSession();
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
    [handleExpiredSession, loadUsers, meInfo?.id],
  );

  const sortedAllUsers = useMemo(
    () => [...allUsers].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [allUsers],
  );

  const filteredUsers = useMemo(() => {
    if (statusFilter === 'active') {
      return sortedAllUsers.filter((user) => user.isAllowed);
    }

    if (statusFilter === 'inactive') {
      return sortedAllUsers.filter((user) => !user.isAllowed);
    }

    return sortedAllUsers;
  }, [sortedAllUsers, statusFilter]);

  const maxPage = Math.max(0, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE) - 1);

  useEffect(() => {
    setUsersPage((previous) => Math.min(previous, maxPage));
  }, [maxPage]);

  const pagedUsers = useMemo(() => {
    const start = usersPage * USERS_PAGE_SIZE;
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE);
  }, [filteredUsers, usersPage]);

  const totalMembersCount = allUsers.length;
  const pendingApprovalsCount = pendingUsers.length;
  const activeUsersCount = allUsers.filter((user) => user.isAllowed).length;

  const showingStart = filteredUsers.length === 0 ? 0 : usersPage * USERS_PAGE_SIZE + 1;
  const showingEnd =
    filteredUsers.length === 0
      ? 0
      : Math.min((usersPage + 1) * USERS_PAGE_SIZE, filteredUsers.length);

  const handleToggleFilter = () => {
    setStatusFilter((previous) => {
      if (previous === 'all') {
        return 'active';
      }

      if (previous === 'active') {
        return 'inactive';
      }

      return 'all';
    });
    setUsersPage(0);
  };

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

      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className="rounded-lg p-3 text-amber-400"
              style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)' }}
            >
              👥
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Members</p>
              <p className="text-2xl font-bold text-slate-900">{formatCount(totalMembersCount)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-3 text-amber-600">⏳</div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCount(pendingApprovalsCount)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600">✓</div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Today</p>
              <p className="text-2xl font-bold text-slate-900">{formatCount(activeUsersCount)}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span aria-hidden="true" className="text-amber-400">
              ⌛
            </span>
            Pending Approvals
          </h2>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm font-medium text-slate-500">
            Loading approval requests...
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-slate-50 text-5xl text-slate-300">
              ☑
            </div>
            <h3 className="mb-1 text-lg font-bold text-slate-900">No pending approvals</h3>
            <p className="mb-6 max-w-sm text-slate-500">
              All community requests and content approvals have been processed. Good job!
            </p>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              <span aria-hidden="true">↻</span>
              <span>{isLoading ? 'Refreshing...' : 'Refresh List'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-bold text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs text-slate-400">
                      Requested at {formatDateTime(user.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={approvingUserId === user.id || decliningUserId === user.id}
                      onClick={() => void handleDeclineUser(user.id)}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {decliningUserId === user.id ? 'Declining...' : 'Decline'}
                    </button>
                    <button
                      type="button"
                      disabled={approvingUserId === user.id || decliningUserId === user.id}
                      onClick={() => void handleApproveUser(user.id)}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {approvingUserId === user.id ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <span aria-hidden="true" className="text-amber-400">
              ⚙
            </span>
            All Users
          </h2>

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleToggleFilter}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50 sm:flex-none"
            >
              <span aria-hidden="true">☰</span>
              <span>{`Filter (${USER_STATUS_FILTER_LABEL[statusFilter]})`}</span>
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    Member
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    Joined
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm font-medium text-slate-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : pagedUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm font-medium text-slate-500"
                    >
                      No users found for this filter.
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((user) => {
                    const roleLabel = user.isAdmin ? 'Moderator' : 'Member';
                    const statusLabel = user.isAllowed ? 'Active' : 'Inactive';
                    const statusTextClassName = user.isAllowed
                      ? 'text-emerald-600'
                      : 'text-slate-400';
                    const statusDotClassName = user.isAllowed ? 'bg-emerald-500' : 'bg-slate-300';
                    const isCurrentAdminUser = meInfo?.id === user.id;

                    return (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-10 items-center justify-center rounded-full text-xs font-bold ${getAvatarToneClassName(
                                user.id,
                              )}`}
                            >
                              {getInitials(user.name)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">
                            {roleLabel}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div
                            className={`flex items-center gap-1.5 text-sm font-medium ${statusTextClassName}`}
                          >
                            <span className={`size-2 rounded-full ${statusDotClassName}`} />
                            {statusLabel}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatJoinedDate(user.createdAt)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <EditDeleteButton
                            onEditClick={() => {
                              handleOpenEditDialog(user);
                            }}
                            onDeleteClick={() => {
                              void handleDeleteUser(user);
                            }}
                            isDeleting={deletingUserId === user.id}
                            isDeleteDisabled={deletingUserId !== null || isCurrentAdminUser}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-sm text-slate-500">
              {`Showing ${showingStart}-${showingEnd} of ${formatCount(
                filteredUsers.length,
              )} members`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUsersPage((previous) => Math.max(0, previous - 1))}
                disabled={usersPage === 0}
                className="rounded border border-slate-200 p-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
                aria-label="Previous users page"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setUsersPage((previous) => Math.min(maxPage, previous + 1))}
                disabled={usersPage >= maxPage}
                className="rounded border border-slate-200 p-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
                aria-label="Next users page"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </section>

      <AdminUserDetailModal
        open={openEditDialog}
        handleClose={handleCloseEditDialog}
        title="EDIT USER"
        actions={editModalActions}
        form={editUserForm}
        initialForm={initialEditUserForm}
        isSubmitting={isSubmitting}
        disablePrivilegeControls={meInfo?.id === editingUserId}
        disableRoleControl={false}
        disableStatusControl={false}
        emailOptional={false}
        userName={editingUser?.name}
        joinedLabel={editingUser ? formatJoinedDate(editingUser.createdAt) : undefined}
        onFormChange={handleEditFormChange}
      />
    </main>
  );
}
