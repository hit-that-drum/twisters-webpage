import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { useAuth } from '@/features';

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
}

const dataGridSx = {
  border: 'none',
  color: 'text.primary',
  '& .MuiDataGrid-columnHeaders': {
    bgcolor: 'grey.50',
    borderBottom: '1px solid',
    borderBottomColor: 'grey.200',
  },
  '& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell': {
    borderRight: '1px solid',
    borderRightColor: 'grey.200',
  },
  '& .MuiDataGrid-row': {
    bgcolor: 'background.paper',
  },
  '& .MuiDataGrid-row:hover': {
    bgcolor: 'grey.100',
  },
  '& .MuiDataGrid-cell': {
    borderBottom: '1px solid',
    borderBottomColor: 'grey.200',
  },
  '& .MuiDataGrid-footerContainer': {
    bgcolor: 'grey.50',
    borderTop: '1px solid',
    borderTopColor: 'grey.200',
  },
  '& .MuiDataGrid-columnSeparator': {
    color: 'grey.300',
  },
  '& .MuiDataGrid-iconButtonContainer button, & .MuiDataGrid-menuIconButton': {
    color: 'text.secondary',
  },
  '& .MuiDataGrid-sortIcon': {
    color: 'text.secondary',
  },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
    outline: 'none',
  },
} as const;

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

export default function AdminPage() {
  const navigate = useNavigate();
  const { meInfo, isAuthLoading, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUserRecord[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserRecord[]>([]);

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

  const pendingColumns = useMemo<GridColDef<PendingUserRecord>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        minWidth: 160,
        flex: 1,
      },
      {
        field: 'email',
        headerName: 'Email',
        minWidth: 240,
        flex: 1.4,
      },
      {
        field: 'createdAt',
        headerName: '가입일',
        minWidth: 180,
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {formatDateTime(params.row.createdAt)}
          </Typography>
        ),
      },
      {
        field: 'actions',
        headerName: '승인',
        minWidth: 140,
        flex: 0.8,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Button
            variant="contained"
            size="small"
            disabled={approvingUserId === params.row.id}
            onClick={() => void handleApproveUser(params.row.id)}
          >
            {approvingUserId === params.row.id ? 'Approving...' : 'Approve'}
          </Button>
        ),
      },
    ],
    [approvingUserId, handleApproveUser],
  );

  const allUsersColumns = useMemo<GridColDef<AdminUserRecord>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        minWidth: 160,
        flex: 1,
      },
      {
        field: 'email',
        headerName: 'Email',
        minWidth: 240,
        flex: 1.4,
      },
      {
        field: 'isAdmin',
        headerName: 'Admin',
        minWidth: 100,
        flex: 0.6,
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: params.row.isAdmin ? 'error.main' : 'text.secondary' }}
          >
            {params.row.isAdmin ? 'Yes' : 'No'}
          </Typography>
        ),
      },
      {
        field: 'isAllowed',
        headerName: '승인 상태',
        minWidth: 120,
        flex: 0.75,
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: params.row.isAllowed ? 'success.dark' : 'warning.dark' }}
          >
            {params.row.isAllowed ? 'Approved' : 'Pending'}
          </Typography>
        ),
      },
      {
        field: 'createdAt',
        headerName: '가입일',
        minWidth: 180,
        flex: 1,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {formatDateTime(params.row.createdAt)}
          </Typography>
        ),
      },
    ],
    [],
  );

  if (isAuthLoading) {
    return (
      <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          관리자 페이지를 확인 중입니다...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            관리자 사용자 관리
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            회원가입 승인 대기 사용자를 승인하고 전체 사용자 정보를 조회할 수 있습니다.
          </Typography>
        </Box>

        <Button variant="outlined" onClick={() => void loadUsers()} disabled={isLoading}>
          {isLoading ? 'Loading...' : '새로고침'}
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          승인 대기 사용자 ({pendingUsers.length})
        </Typography>
        <Box
          sx={{
            height: { xs: 360, md: 420 },
            border: 1,
            borderColor: 'grey.300',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          <DataGrid
            rows={pendingUsers}
            columns={pendingColumns}
            loading={isLoading}
            rowHeight={44}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 20, 50]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
            }}
            localeText={{
              noRowsLabel: '승인 대기 중인 사용자가 없습니다.',
            }}
            sx={dataGridSx}
          />
        </Box>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          전체 사용자 ({allUsers.length})
        </Typography>
        <Box
          sx={{
            height: { xs: 460, md: 620 },
            border: 1,
            borderColor: 'grey.300',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          <DataGrid
            rows={allUsers}
            columns={allUsersColumns}
            loading={isLoading}
            rowHeight={44}
            disableRowSelectionOnClick
            pageSizeOptions={[20, 30, 50]}
            initialState={{
              sorting: {
                sortModel: [{ field: 'createdAt', sort: 'desc' }],
              },
              pagination: {
                paginationModel: { pageSize: 20, page: 0 },
              },
            }}
            localeText={{
              noRowsLabel: '등록된 사용자가 없습니다.',
            }}
            sx={dataGridSx}
          />
        </Box>
      </Box>
    </Box>
  );
}
