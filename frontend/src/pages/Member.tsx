import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import SubLNB from '../components/SubLNB';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';

interface MemberUser {
  id: number;
  name: string;
  email: string;
}

const parseUsers = (payload: unknown): MemberUser[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as { id?: unknown; name?: unknown; email?: unknown };
      if (typeof row.id !== 'number' || typeof row.name !== 'string' || typeof row.email !== 'string') {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        email: row.email,
      } satisfies MemberUser;
    })
    .filter((item): item is MemberUser => item !== null);
};

export default function Member() {
  const navigate = useNavigate();
  const { meInfo, isAuthLoading, logout } = useAuth();
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch('/authentication/users');
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar('회원 목록을 불러오지 못했습니다.', { variant: 'error' });
        setUsers([]);
        setSelectedUserId(null);
        return;
      }

      const parsedUsers = parseUsers(payload);
      setUsers(parsedUsers);

      if (parsedUsers.length === 0) {
        setSelectedUserId(null);
        return;
      }

      setSelectedUserId((previous) => {
        if (previous && parsedUsers.some((user) => user.id === previous)) {
          return previous;
        }

        if (meInfo && parsedUsers.some((user) => user.id === meInfo.id)) {
          return meInfo.id;
        }

        return parsedUsers[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Member user list fetch error:', error);
      enqueueSnackbar('회원 목록 조회 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [logout, meInfo, navigate]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!meInfo) {
      logout();
      navigate('/signin', { replace: true });
      return;
    }

    void loadUsers();
  }, [isAuthLoading, loadUsers, logout, meInfo, navigate]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const subLnbItems = useMemo(
    () =>
      users.map((user) => ({
        key: String(user.id),
        label: user.name,
        meta: user.email,
      })),
    [users],
  );

  return (
    <section className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Member</h1>
        <p className="mt-1 text-sm text-gray-600">
          왼쪽 사용자 이름을 클릭하면 해당 회원의 상세 정보를 확인할 수 있습니다.
        </p>
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
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{selectedUser.name}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                <p className="mt-1 text-base text-gray-700">{selectedUser.email}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Member ID</p>
                <p className="mt-1 text-base text-gray-700">{selectedUser.id}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">선택된 회원이 없습니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}
