import { memo, type ChangeEvent, type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';

interface SettlementRecord {
  id: number;
  date: string;
  item: string;
  amount: number;
  relation: string;
}

interface SettlementFormState {
  date: string;
  item: string;
  amountType: SettlementAmountType;
  amount: string;
  relation: string;
}

type SettlementAmountType = 'deposit' | 'withdraw';

interface SettlementPayload {
  date: string;
  item: string;
  amount: number;
  relation: string;
}

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

const toInputDate = (rawDate: string) => {
  const normalized = rawDate.trim().replaceAll('/', '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return '';
  }

  return normalized;
};

const createDefaultForm = (): SettlementFormState => {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  return {
    date: localDate,
    item: '',
    amountType: 'deposit',
    amount: '',
    relation: '',
  };
};

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const formatAmount = (amount: number) => {
  const absoluteAmount = currencyFormatter.format(Math.abs(amount));
  return amount < 0 ? `-${absoluteAmount}` : absoluteAmount;
};

const buildSettlementPayload = (form: SettlementFormState) => {
  const date = toInputDate(form.date);
  const item = form.item.trim();
  const relation = form.relation.trim();
  const parsedAmount = Number(form.amount.trim().replaceAll(',', ''));

  if (!date) {
    return { error: '유효한 날짜(YYYY-MM-DD)를 입력해주세요.' };
  }

  if (!item) {
    return { error: '항목을 입력해주세요.' };
  }

  if (!Number.isFinite(parsedAmount) || !Number.isInteger(parsedAmount) || parsedAmount < 0) {
    return { error: '금액은 0 이상의 정수로 입력해주세요.' };
  }

  if (!relation) {
    return { error: 'Relation 값을 입력해주세요.' };
  }

  const signedAmount = form.amountType === 'withdraw' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

  return {
    value: {
      date,
      item,
      amount: signedAmount,
      relation,
    } satisfies SettlementPayload,
  };
};

const toFormStateFromRecord = (record: SettlementRecord): SettlementFormState => ({
  date: toInputDate(record.date),
  item: record.item,
  amountType: record.amount < 0 ? 'withdraw' : 'deposit',
  amount: String(Math.abs(record.amount)),
  relation: record.relation,
});

interface SettlementGridProps {
  rows: SettlementRecord[];
  isLoading: boolean;
  canManageSettlements: boolean;
  deletingSettlementId: number | null;
  onEdit: (record: SettlementRecord) => void;
  onDelete: (settlementId: number) => Promise<void>;
  totalAmount: number;
}

const SettlementGrid = memo(function SettlementGrid({
  rows,
  isLoading,
  canManageSettlements,
  deletingSettlementId,
  onEdit,
  onDelete,
  totalAmount,
}: SettlementGridProps) {
  const settlementColumns = useMemo<GridColDef<SettlementRecord>[]>(() => {
    const columns: GridColDef<SettlementRecord>[] = [
      {
        field: 'date',
        headerName: '날짜',
        minWidth: 130,
        flex: 0.85,
      },
      {
        field: 'item',
        headerName: '항목',
        minWidth: 220,
        flex: 1.3,
        sortable: false,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'amount',
        headerName: '금액',
        minWidth: 130,
        flex: 0.75,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{
              width: '100%',
              textAlign: 'right',
              color: params.value < 0 ? '#DC2626' : '#111827',
            }}
          >
            {formatAmount(params.value as number)}
          </Typography>
        ),
      },
      {
        field: 'relation',
        headerName: 'Relation',
        minWidth: 170,
        flex: 0.95,
        sortable: false,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#166534' }}>
            {params.value}
          </Typography>
        ),
      },
    ];

    if (canManageSettlements) {
      columns.push({
        field: 'actions',
        headerName: '관리',
        minWidth: 160,
        flex: 0.8,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" onClick={() => onEdit(params.row)}>
              Edit
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              disabled={deletingSettlementId === params.row.id}
              onClick={() => void onDelete(params.row.id)}
            >
              {deletingSettlementId === params.row.id ? 'Deleting...' : 'Delete'}
            </Button>
          </Box>
        ),
      });
    }

    return columns;
  }, [canManageSettlements, deletingSettlementId, onDelete, onEdit]);

  return (
    <>
      <Box
        sx={{
          height: { xs: 560, md: 920 },
          border: '1px solid #D1D5DB',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#FFFFFF',
        }}
      >
        <DataGrid
          rows={rows}
          columns={settlementColumns}
          rowHeight={42}
          loading={isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[20, 30, 50]}
          initialState={{
            sorting: {
              sortModel: [{ field: 'date', sort: 'desc' }],
            },
            pagination: {
              paginationModel: { pageSize: 20, page: 0 },
            },
          }}
          localeText={{
            noRowsLabel: '등록된 정산 내역이 없습니다.',
          }}
          sx={{
            border: 'none',
            color: '#111827',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
            },
            '& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell': {
              borderRight: '1px solid #E5E7EB',
            },
            '& .MuiDataGrid-row': {
              bgcolor: '#FFFFFF',
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: '#F3F4F6',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #E5E7EB',
            },
            '& .MuiDataGrid-footerContainer': {
              bgcolor: '#F9FAFB',
              borderTop: '1px solid #E5E7EB',
            },
            '& .MuiDataGrid-columnSeparator': {
              color: '#D1D5DB',
            },
            '& .MuiDataGrid-iconButtonContainer button, & .MuiDataGrid-menuIconButton': {
              color: '#6B7280',
            },
            '& .MuiDataGrid-sortIcon': {
              color: '#6B7280',
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
              outline: 'none',
            },
          }}
        />
      </Box>

      <Box
        sx={{
          mt: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#6B7280',
        }}
      >
        <Typography variant="caption">↓ 더 불러오기</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          합계 {formatAmount(totalAmount)}
        </Typography>
      </Box>
    </>
  );
});

interface AddSettlementDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: SettlementPayload) => Promise<void>;
}

const AddSettlementDialog = memo(function AddSettlementDialog({
  open,
  isSubmitting,
  onClose,
  onSubmit,
}: AddSettlementDialogProps) {
  const [form, setForm] = useState<SettlementFormState>(() => createDefaultForm());

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    const payloadData = buildSettlementPayload(form);
    if ('error' in payloadData) {
      enqueueSnackbar(payloadData.error, { variant: 'error' });
      return;
    }

    await onSubmit(payloadData.value);
  };

  const handleAmountTypeChange = (
    _event: MouseEvent<HTMLElement>,
    value: SettlementAmountType | null,
  ) => {
    if (!value) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      amountType: value,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Settlement</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          type="date"
          label="Date"
          name="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={form.date}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Item"
          name="item"
          fullWidth
          value={form.item}
          onChange={handleChange}
        />
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="body2" sx={{ mb: 0.75, color: '#374151', fontWeight: 600 }}>
            금액 구분
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            color="primary"
            value={form.amountType}
            onChange={handleAmountTypeChange}
            aria-label="amount type"
          >
            <ToggleButton value="deposit">입금</ToggleButton>
            <ToggleButton value="withdraw">출금</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <TextField
          margin="dense"
          type="number"
          label="Amount"
          name="amount"
          fullWidth
          inputProps={{ min: 0, step: 1 }}
          value={form.amount}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Relation"
          name="relation"
          fullWidth
          value={form.relation}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

interface EditSettlementDialogProps {
  open: boolean;
  isSubmitting: boolean;
  record: SettlementRecord | null;
  onClose: () => void;
  onSubmit: (settlementId: number, payload: SettlementPayload) => Promise<void>;
}

const EditSettlementDialog = memo(function EditSettlementDialog({
  open,
  isSubmitting,
  record,
  onClose,
  onSubmit,
}: EditSettlementDialogProps) {
  const [form, setForm] = useState<SettlementFormState>(() =>
    record ? toFormStateFromRecord(record) : createDefaultForm(),
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!record) {
      enqueueSnackbar('수정할 정산 내역을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    const payloadData = buildSettlementPayload(form);
    if ('error' in payloadData) {
      enqueueSnackbar(payloadData.error, { variant: 'error' });
      return;
    }

    await onSubmit(record.id, payloadData.value);
  };

  const handleAmountTypeChange = (
    _event: MouseEvent<HTMLElement>,
    value: SettlementAmountType | null,
  ) => {
    if (!value) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      amountType: value,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Settlement</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          type="date"
          label="Date"
          name="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={form.date}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Item"
          name="item"
          fullWidth
          value={form.item}
          onChange={handleChange}
        />
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="body2" sx={{ mb: 0.75, color: '#374151', fontWeight: 600 }}>
            금액 구분
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            color="primary"
            value={form.amountType}
            onChange={handleAmountTypeChange}
            aria-label="amount type"
          >
            <ToggleButton value="deposit">입금</ToggleButton>
            <ToggleButton value="withdraw">출금</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <TextField
          margin="dense"
          type="number"
          label="Amount"
          name="amount"
          fullWidth
          inputProps={{ min: 0, step: 1 }}
          value={form.amount}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Relation"
          name="relation"
          fullWidth
          value={form.relation}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default function Settlement() {
  const navigate = useNavigate();
  const { meInfo, logout } = useAuth();
  const [settlementRows, setSettlementRows] = useState<SettlementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingSettlementId, setDeletingSettlementId] = useState<number | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [addDialogEpoch, setAddDialogEpoch] = useState(0);
  const [editDialogEpoch, setEditDialogEpoch] = useState(0);
  const [editingRecord, setEditingRecord] = useState<SettlementRecord | null>(null);

  const canManageSettlements = meInfo?.isAdmin === true;

  const requireAdminAction = useCallback(() => {
    if (!meInfo) {
      enqueueSnackbar('로그인 후 정산 내역을 관리할 수 있습니다.', { variant: 'error' });
      navigate('/signin', { replace: true });
      return false;
    }

    if (!meInfo.isAdmin) {
      enqueueSnackbar('관리자만 정산 내역을 관리할 수 있습니다.', { variant: 'error' });
      return false;
    }

    return true;
  }, [meInfo, navigate]);

  const loadSettlements = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch('/settlement');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar(`정산 내역 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      if (!Array.isArray(payload)) {
        setSettlementRows([]);
        return;
      }

      const normalizedRows = payload
        .map((row) => {
          if (!row || typeof row !== 'object') {
            return null;
          }

          const record = row as {
            id?: unknown;
            date?: unknown;
            item?: unknown;
            amount?: unknown;
            relation?: unknown;
          };

          const parsedAmount =
            typeof record.amount === 'number'
              ? record.amount
              : typeof record.amount === 'string'
              ? Number(record.amount)
              : NaN;

          if (
            typeof record.id !== 'number' ||
            typeof record.date !== 'string' ||
            typeof record.item !== 'string' ||
            Number.isNaN(parsedAmount) ||
            typeof record.relation !== 'string'
          ) {
            return null;
          }

          return {
            id: record.id,
            date: record.date,
            item: record.item,
            amount: parsedAmount,
            relation: record.relation,
          } satisfies SettlementRecord;
        })
        .filter((row): row is SettlementRecord => row !== null);

      setSettlementRows(normalizedRows);
    } catch (error) {
      console.error('Settlement list fetch error:', error);
      enqueueSnackbar('정산 내역을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    void loadSettlements();
  }, [loadSettlements]);

  const handleOpenAddDialog = () => {
    if (!requireAdminAction()) {
      return;
    }

    setAddDialogEpoch((previous) => previous + 1);
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    if (isSubmitting) {
      return;
    }

    setOpenAddDialog(false);
  };

  const handleOpenEditDialog = useCallback(
    (record: SettlementRecord) => {
      if (!requireAdminAction()) {
        return;
      }

      setEditingRecord(record);
      setEditDialogEpoch((previous) => previous + 1);
      setOpenEditDialog(true);
    },
    [requireAdminAction],
  );

  const handleCloseEditDialog = () => {
    if (isSubmitting) {
      return;
    }

    setOpenEditDialog(false);
    setEditingRecord(null);
  };

  const handleCreateSettlement = async (formPayload: SettlementPayload) => {
    if (!requireAdminAction()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/settlement', {
        method: 'POST',
        body: JSON.stringify(formPayload),
      });
      const responsePayload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar(
          `정산 내역 등록 실패: ${getApiMessage(responsePayload, '알 수 없는 에러')}`,
          {
            variant: 'error',
          },
        );
        return;
      }

      enqueueSnackbar(getApiMessage(responsePayload, '정산 내역이 등록되었습니다.'), {
        variant: 'success',
      });
      setOpenAddDialog(false);
      await loadSettlements();
    } catch (error) {
      console.error('Settlement create error:', error);
      enqueueSnackbar('정산 내역 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSettlement = async (settlementId: number, formPayload: SettlementPayload) => {
    if (!requireAdminAction()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/settlement/${settlementId}`, {
        method: 'PUT',
        body: JSON.stringify(formPayload),
      });
      const responsePayload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar(
          `정산 내역 수정 실패: ${getApiMessage(responsePayload, '알 수 없는 에러')}`,
          {
            variant: 'error',
          },
        );
        return;
      }

      enqueueSnackbar(getApiMessage(responsePayload, '정산 내역이 수정되었습니다.'), {
        variant: 'success',
      });
      setOpenEditDialog(false);
      setEditingRecord(null);
      await loadSettlements();
    } catch (error) {
      console.error('Settlement update error:', error);
      enqueueSnackbar('정산 내역 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSettlement = useCallback(
    async (settlementId: number) => {
      if (!requireAdminAction()) {
        return;
      }

      const shouldDelete = window.confirm('해당 정산 내역을 삭제하시겠습니까?');
      if (!shouldDelete) {
        return;
      }

      setDeletingSettlementId(settlementId);

      try {
        const response = await apiFetch(`/settlement/${settlementId}`, {
          method: 'DELETE',
        });
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            logout();
            enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
            navigate('/signin', { replace: true });
            return;
          }

          enqueueSnackbar(`정산 내역 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        enqueueSnackbar(getApiMessage(payload, '정산 내역이 삭제되었습니다.'), {
          variant: 'success',
        });
        await loadSettlements();
      } catch (error) {
        console.error('Settlement delete error:', error);
        enqueueSnackbar('정산 내역 삭제 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setDeletingSettlementId(null);
      }
    },
    [loadSettlements, logout, navigate, requireAdminAction],
  );

  const totalAmount = settlementRows.reduce((sum, row) => sum + row.amount, 0);

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
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>
            🐝 정산
          </Typography>
          {meInfo && (
            <Typography variant="body2" sx={{ mt: 0.5, color: '#6B7280' }}>
              {meInfo.name} ({meInfo.email})
            </Typography>
          )}
        </Box>

        {canManageSettlements && (
          <Button variant="contained" onClick={handleOpenAddDialog}>
            ADD SETTLEMENT
          </Button>
        )}
      </Box>

      <SettlementGrid
        rows={settlementRows}
        isLoading={isLoading}
        canManageSettlements={canManageSettlements}
        deletingSettlementId={deletingSettlementId}
        onEdit={handleOpenEditDialog}
        onDelete={handleDeleteSettlement}
        totalAmount={totalAmount}
      />

      <AddSettlementDialog
        key={`add-${addDialogEpoch}`}
        open={openAddDialog}
        isSubmitting={isSubmitting}
        onClose={handleCloseAddDialog}
        onSubmit={handleCreateSettlement}
      />

      <EditSettlementDialog
        key={`edit-${editDialogEpoch}`}
        open={openEditDialog}
        isSubmitting={isSubmitting}
        record={editingRecord}
        onClose={handleCloseEditDialog}
        onSubmit={handleUpdateSettlement}
      />
    </Box>
  );
}
