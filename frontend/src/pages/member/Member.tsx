import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/features';
import { apiFetch } from '@/common/lib/api/apiClient';

interface MemberUser {
  id: number;
  name: string;
  email: string | null;
  isAdmin: boolean;
  phone: string | null;
  role: string | null;
  department: string | null;
  joinedAt: string | null;
  bio: string | null;
}

interface MemberFormState {
  name: string;
  email: string;
  isAdmin: boolean;
  phone: string;
  role: string;
  department: string;
  joinedAt: string;
  bio: string;
}

interface ParsedMemberDuesStatus {
  years: number[];
  byMemberId: Record<number, Record<number, boolean>>;
}

interface DuesDisplayMeta {
  label: string;
  icon: string;
  className: string;
}

const DEPOSIT_KEY_PATTERN = /^deposit(\d{4})$/;

const createDefaultMemberForm = (): MemberFormState => ({
  name: '',
  email: '',
  isAdmin: false,
  phone: '',
  role: '',
  department: '',
  joinedAt: '',
  bio: '',
});

const parseBoolean = (rawValue: unknown) => {
  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'number') {
    return rawValue === 1;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true') {
      return true;
    }
    if (normalized === '0' || normalized === 'false') {
      return false;
    }
  }

  return false;
};

const parseMembers = (payload: unknown): MemberUser[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as {
        id?: unknown;
        name?: unknown;
        email?: unknown;
        isAdmin?: unknown;
        phone?: unknown;
        role?: unknown;
        department?: unknown;
        joinedAt?: unknown;
        bio?: unknown;
      };

      if (
        typeof row.id !== 'number' ||
        typeof row.name !== 'string' ||
        (row.email !== null && row.email !== undefined && typeof row.email !== 'string')
      ) {
        return null;
      }

      const normalizeNullableString = (rawValue: unknown) => {
        if (rawValue === null || rawValue === undefined) {
          return null;
        }

        return typeof rawValue === 'string' ? rawValue : null;
      };

      return {
        id: row.id,
        name: row.name,
        email: normalizeNullableString(row.email),
        isAdmin: parseBoolean(row.isAdmin),
        phone: normalizeNullableString(row.phone),
        role: normalizeNullableString(row.role),
        department: normalizeNullableString(row.department),
        joinedAt: normalizeNullableString(row.joinedAt),
        bio: normalizeNullableString(row.bio),
      } satisfies MemberUser;
    })
    .filter((item): item is MemberUser => item !== null);
};

const parseMemberDuesStatus = (payload: unknown): ParsedMemberDuesStatus => {
  if (!Array.isArray(payload)) {
    return { years: [], byMemberId: {} };
  }

  const years = new Set<number>();
  const byMemberId: Record<number, Record<number, boolean>> = {};

  payload.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const row = item as Record<string, unknown>;
    const memberId =
      typeof row.memberId === 'number' && Number.isInteger(row.memberId) ? row.memberId : null;
    if (!memberId) {
      return;
    }

    if (!byMemberId[memberId]) {
      byMemberId[memberId] = {};
    }

    Object.entries(row).forEach(([key, value]) => {
      const matched = DEPOSIT_KEY_PATTERN.exec(key);
      if (!matched) {
        return;
      }

      const year = Number(matched[1]);
      if (!Number.isInteger(year)) {
        return;
      }

      years.add(year);
      byMemberId[memberId][year] = parseBoolean(value);
    });
  });

  return {
    years: [...years].sort((a, b) => a - b),
    byMemberId,
  };
};

const toEditForm = (member: MemberUser): MemberFormState => ({
  name: member.name,
  email: member.email ?? '',
  isAdmin: member.isAdmin,
  phone: member.phone ?? '',
  role: member.role ?? '',
  department: member.department ?? '',
  joinedAt: member.joinedAt ?? '',
  bio: member.bio ?? '',
});

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

const getDuesDisplayMeta = (year: number, isPaid: boolean): DuesDisplayMeta => {
  const currentYear = new Date().getFullYear();

  if (year > currentYear) {
    return {
      label: '예정',
      icon: '⌛',
      className: 'bg-slate-100 text-slate-500',
    };
  }

  if (isPaid) {
    return {
      label: '완납',
      icon: '✓',
      className: 'bg-emerald-50 text-emerald-700',
    };
  }

  return {
    label: '미납',
    icon: '•',
    className: 'bg-amber-50 text-amber-700',
  };
};

export default function Member() {
  const navigate = useNavigate();
  const { meInfo, isAuthLoading, logout } = useAuth();

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

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!meInfo) {
      handleExpiredSession();
      return;
    }

    void Promise.all([loadMembers(), loadMemberDuesStatus()]);
  }, [handleExpiredSession, isAuthLoading, loadMemberDuesStatus, loadMembers, meInfo]);

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

  const requireAdminAction = () => {
    if (!meInfo) {
      handleExpiredSession();
      return false;
    }

    if (!canManageMembers) {
      enqueueSnackbar('관리자만 회원 정보를 관리할 수 있습니다.', { variant: 'error' });
      return false;
    }

    return true;
  };

  const handleOpenAddDialog = () => {
    if (!requireAdminAction()) {
      return;
    }

    setAddMemberForm(createDefaultMemberForm());
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    if (isSubmitting) {
      return;
    }

    setOpenAddDialog(false);
  };

  const handleOpenEditDialog = () => {
    if (!requireAdminAction()) {
      return;
    }

    if (!selectedUser) {
      enqueueSnackbar('먼저 수정할 회원을 선택해주세요.', { variant: 'error' });
      return;
    }

    setEditMemberForm(toEditForm(selectedUser));
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
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

  const handleCreateMember = async () => {
    if (!requireAdminAction()) {
      return;
    }

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
      await Promise.all([loadMembers(), loadMemberDuesStatus()]);
    } catch (error) {
      console.error('Member create error:', error);
      enqueueSnackbar('회원 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!requireAdminAction()) {
      return;
    }

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
      await Promise.all([loadMembers(), loadMemberDuesStatus()]);
    } catch (error) {
      console.error('Member update error:', error);
      enqueueSnackbar('회원 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!requireAdminAction()) {
      return;
    }

    if (!selectedUser) {
      enqueueSnackbar('삭제할 회원을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    const isConfirmed = window.confirm(`정말로 '${selectedUser.name}' 회원을 삭제하시겠습니까?`);
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
      await Promise.all([loadMembers(), loadMemberDuesStatus()]);
    } catch (error) {
      console.error('Member delete error:', error);
      enqueueSnackbar('회원 삭제 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDetailValue = (value: string | null) => {
    if (!value || !value.trim()) {
      return '-';
    }

    return value;
  };

  return (
    <section className="px-3 py-6 sm:px-4 sm:py-8 lg:px-20">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Members</h1>
            <p className="mt-1 text-sm text-slate-500">
              왼쪽 Member Directory에서 회원을 선택하면 상세 정보를 확인할 수 있습니다.
            </p>
          </div>

          {canManageMembers && (
            <button
              type="button"
              onClick={handleOpenAddDialog}
              className="flex h-11 items-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-black uppercase tracking-wider text-slate-900 shadow-lg shadow-amber-200 transition-all hover:bg-amber-200 sm:h-12 sm:px-6"
            >
              <span aria-hidden="true" className="text-base">
                ⊕
              </span>
              ADD MEMBER
            </button>
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

            <div className="flex flex-col" role="listbox" aria-labelledby="member-directory-heading">
              {isLoading ? (
                <p className="px-4 py-5 text-sm font-medium text-slate-500">Loading members...</p>
              ) : users.length === 0 ? (
                <p className="px-4 py-5 text-sm font-medium text-slate-500">No members available.</p>
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
                      <span
                        aria-hidden="true"
                        className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                          isActive ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {user.name.trim().charAt(0) || '?'}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${isActive ? 'font-bold' : 'font-semibold'}`}>
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
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-sm font-semibold text-slate-500 shadow-sm">
                Loading member detail...
              </div>
            ) : selectedUser ? (
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/60">
                <div className="p-6 md:p-8">
                  <div className="mb-8 flex flex-col gap-5 border-b border-slate-100 pb-8 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-5">
                      <div className="inline-flex size-24 items-center justify-center rounded-full border-4 border-amber-300 bg-slate-100 text-4xl font-black text-slate-500 shadow-inner">
                        {selectedUser.name.trim().charAt(0) || '?'}
                      </div>

                      <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900">
                          {selectedUser.name}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {selectedUser.isAdmin ? 'Administrator' : 'Member'}
                          </span>
                          <span className="text-sm font-medium italic text-slate-400">Active Member</span>
                        </div>
                      </div>
                    </div>

                    {canManageMembers && (
                      <button
                        type="button"
                        onClick={handleOpenEditDialog}
                        className="flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50"
                      >
                        <span aria-hidden="true">✎</span>
                        EDIT
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-x-12 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Email</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {renderDetailValue(selectedUser.email)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {selectedUser.isAdmin ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Phone</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {renderDetailValue(selectedUser.phone)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Joined At</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {renderDetailValue(selectedUser.joinedAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Role</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {renderDetailValue(selectedUser.role)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Department</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {renderDetailValue(selectedUser.department)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-6 py-6 md:px-8">
                  <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <span aria-hidden="true" className="text-amber-500">
                      ₩
                    </span>
                    회비 입금 여부 (Membership Fee Payment)
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

                <div className="border-t border-slate-100 px-6 py-6 md:px-8">
                  <h3 className="mb-3 text-lg font-bold uppercase tracking-tight text-slate-900">Bio</h3>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-600">
                    {renderDetailValue(selectedUser.bio)}
                  </p>
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

      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Name"
            name="name"
            fullWidth
            value={addMemberForm.name}
            onChange={handleChangeAddForm}
          />
          <TextField
            margin="dense"
            label="Email (Optional)"
            name="email"
            type="email"
            fullWidth
            value={addMemberForm.email}
            onChange={handleChangeAddForm}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={addMemberForm.isAdmin}
                onChange={(event) => {
                  setAddMemberForm((previous) => ({
                    ...previous,
                    isAdmin: event.target.checked,
                  }));
                }}
              />
            }
            label="Admin Member"
          />
          <TextField
            margin="dense"
            label="Phone"
            name="phone"
            fullWidth
            value={addMemberForm.phone}
            onChange={handleChangeAddForm}
          />
          <TextField
            margin="dense"
            label="Role"
            name="role"
            fullWidth
            value={addMemberForm.role}
            onChange={handleChangeAddForm}
          />
          <TextField
            margin="dense"
            label="Department"
            name="department"
            fullWidth
            value={addMemberForm.department}
            onChange={handleChangeAddForm}
          />
          <TextField
            margin="dense"
            label="Joined At"
            name="joinedAt"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={addMemberForm.joinedAt}
            onChange={handleChangeAddForm}
          />
          <TextField
            margin="dense"
            label="Bio"
            name="bio"
            fullWidth
            multiline
            minRows={4}
            value={addMemberForm.bio}
            onChange={handleChangeAddForm}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleCreateMember()}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Edit Member</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Name"
            name="name"
            fullWidth
            value={editMemberForm.name}
            onChange={handleChangeEditForm}
          />
          <TextField
            margin="dense"
            label="Email (Optional)"
            name="email"
            type="email"
            fullWidth
            value={editMemberForm.email}
            onChange={handleChangeEditForm}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editMemberForm.isAdmin}
                onChange={(event) => {
                  setEditMemberForm((previous) => ({
                    ...previous,
                    isAdmin: event.target.checked,
                  }));
                }}
              />
            }
            label="Admin Member"
          />
          <TextField
            margin="dense"
            label="Phone"
            name="phone"
            fullWidth
            value={editMemberForm.phone}
            onChange={handleChangeEditForm}
          />
          <TextField
            margin="dense"
            label="Role"
            name="role"
            fullWidth
            value={editMemberForm.role}
            onChange={handleChangeEditForm}
          />
          <TextField
            margin="dense"
            label="Department"
            name="department"
            fullWidth
            value={editMemberForm.department}
            onChange={handleChangeEditForm}
          />
          <TextField
            margin="dense"
            label="Joined At"
            name="joinedAt"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={editMemberForm.joinedAt}
            onChange={handleChangeEditForm}
          />
          <TextField
            margin="dense"
            label="Bio"
            name="bio"
            fullWidth
            multiline
            minRows={4}
            value={editMemberForm.bio}
            onChange={handleChangeEditForm}
          />
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => void handleDeleteMember()} disabled={isSubmitting}>
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </Button>
          <Button onClick={handleCloseEditDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleUpdateMember()}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
