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
import SubLNB from '../components/SubLNB';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';

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

export default function Member() {
  const navigate = useNavigate();
  const { meInfo, isAuthLoading, logout } = useAuth();

  const [users, setUsers] = useState<MemberUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState<MemberFormState>(() => createDefaultMemberForm());
  const [editMemberForm, setEditMemberForm] = useState<MemberFormState>(() => createDefaultMemberForm());

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

        enqueueSnackbar(`회원 목록을 불러오지 못했습니다: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
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

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!meInfo) {
      handleExpiredSession();
      return;
    }

    void loadMembers();
  }, [handleExpiredSession, isAuthLoading, loadMembers, meInfo]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const subLnbItems = useMemo(
    () =>
      users.map((user) => ({
        key: String(user.id),
        label: user.name,
        meta: user.email ?? undefined,
      })),
    [users],
  );

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
      await loadMembers();
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

      enqueueSnackbar(getApiMessage(payload, '회원 정보가 수정되었습니다.'), { variant: 'success' });
      setOpenEditDialog(false);
      await loadMembers();
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
      await loadMembers();
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
    <section className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member</h1>
          <p className="mt-1 text-sm text-gray-600">
            왼쪽 사용자 이름을 클릭하면 해당 회원의 상세 정보를 확인할 수 있습니다.
          </p>
        </div>

        {canManageMembers && (
          <Button variant="contained" onClick={handleOpenAddDialog}>
            ADD MEMBER
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full lg:w-72 lg:shrink-0">
          <SubLNB
            title="Members"
            items={subLnbItems}
            selectedKey={selectedUserId ? String(selectedUserId) : null}
            onSelect={(key) => {
              const parsed = Number(key);
              if (Number.isInteger(parsed)) {
                setSelectedUserId(parsed);
              }
            }}
            emptyMessage={isLoading ? 'Loading members...' : 'No members available.'}
          />
        </div>

        <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {isLoading ? (
            <p className="text-sm font-semibold text-gray-500">Loading member detail...</p>
          ) : selectedUser ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{selectedUser.name}</p>
                </div>

                {canManageMembers && (
                  <Button variant="outlined" onClick={handleOpenEditDialog}>
                    EDIT
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                  <p className="mt-1 text-base text-gray-700">{renderDetailValue(selectedUser.email)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</p>
                  <p className="mt-1 text-base text-gray-700">{selectedUser.isAdmin ? 'Yes' : 'No'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</p>
                  <p className="mt-1 text-base text-gray-700">{renderDetailValue(selectedUser.phone)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Joined At</p>
                  <p className="mt-1 text-base text-gray-700">{renderDetailValue(selectedUser.joinedAt)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</p>
                  <p className="mt-1 text-base text-gray-700">{renderDetailValue(selectedUser.role)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Department</p>
                  <p className="mt-1 text-base text-gray-700">{renderDetailValue(selectedUser.department)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bio</p>
                <p className="mt-1 whitespace-pre-wrap text-base text-gray-700">
                  {renderDetailValue(selectedUser.bio)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">선택된 회원이 없습니다.</p>
          )}
        </div>
      </div>

      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Name" name="name" fullWidth value={addMemberForm.name} onChange={handleChangeAddForm} />
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
          <TextField margin="dense" label="Phone" name="phone" fullWidth value={addMemberForm.phone} onChange={handleChangeAddForm} />
          <TextField margin="dense" label="Role" name="role" fullWidth value={addMemberForm.role} onChange={handleChangeAddForm} />
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
          <Button onClick={() => void handleCreateMember()} variant="contained" disabled={isSubmitting}>
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
          <Button onClick={() => void handleUpdateMember()} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
