import {
  type ChangeEvent,
  type MouseEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/features';
import { apiFetch } from '@/common/lib/api/apiClient';
import { EditDeleteButton, GlobalButton } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import SettlementDetailModal, {
  type SettlementAmountType,
  type SettlementFormState,
} from './SettlementDetailModal';
import LoadingComponent from '@/common/LoadingComponent.tsx';

interface SettlementRecord {
  id: number;
  date: string;
  item: string;
  amount: number;
  relation: string;
}

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

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

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

  const signedAmount =
    form.amountType === 'withdraw' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

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
  onOpenAddDialog: () => void;
  onEdit: (record: SettlementRecord) => void;
  onDelete: (settlementId: number) => Promise<void>;
  totalAmount: number;
  totalIncome: number;
  totalExpense: number;
  carryOverAmount: number;
  rowsPerPage: number;
  pageStart: number;
  pageEnd: number;
  totalRows: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

const SettlementGrid = memo(function SettlementGrid({
  rows,
  isLoading,
  canManageSettlements,
  deletingSettlementId,
  onOpenAddDialog,
  onEdit,
  onDelete,
  totalAmount,
  totalIncome,
  totalExpense,
  carryOverAmount,
  rowsPerPage,
  pageStart,
  pageEnd,
  totalRows,
  canGoPrevious,
  canGoNext,
  onRowsPerPageChange,
  onPreviousPage,
  onNextPage,
}: SettlementGridProps) {
  return (
    <>
      <main className="mx-auto w-full flex-1 px-4 py-8 md:px-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900">
            SETTLEMENT
          </h1>

          {canManageSettlements && (
            <GlobalButton
              onClick={onOpenAddDialog}
              label="ADD SETTLEMENT"
              iconBasicMappingType="ADD"
            />
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th
                    scope="col"
                    className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    날짜
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    항목
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    금액
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    Relation
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wider text-slate-500"
                  >
                    관리
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
                      정산 내역을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm font-medium text-slate-500"
                    >
                      등록된 정산 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const relationLabel =
                      row.relation.trim() || (row.amount < 0 ? 'Expense' : 'Income');
                    const relationClassName =
                      row.amount < 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700';

                    return (
                      <tr key={row.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-5 text-sm text-slate-600">{row.date}</td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-900">{row.item}</td>
                        <td
                          className={`px-6 py-5 text-sm font-bold ${
                            row.amount < 0 ? 'text-red-500' : 'text-slate-900'
                          }`}
                        >
                          {formatAmount(row.amount)}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${relationClassName}`}
                          >
                            {relationLabel}
                          </span>
                        </td>
                        <td className="space-x-2 px-6 py-5 text-right">
                          {canManageSettlements ? (
                            <EditDeleteButton
                              onEditClick={() => onEdit(row)}
                              onDeleteClick={() => {
                                void onDelete(row.id);
                              }}
                              isDeleting={deletingSettlementId === row.id}
                            />
                          ) : (
                            <span className="text-sm text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-6 lg:flex-row">
          <div
            className="w-full rounded-xl border px-6 py-4 lg:w-auto"
            style={{
              backgroundColor: 'rgba(255, 215, 0, 0.05)',
              borderColor: 'rgba(255, 215, 0, 0.2)',
            }}
          >
            <h3 className="text-lg font-medium text-slate-700">
              합계
              <span className="ml-2 text-2xl font-black" style={{ color: '#FFD700' }}>
                {formatAmount(totalAmount)}
              </span>
            </h3>
          </div>

          <nav
            aria-label="Settlement pagination"
            className="flex flex-col items-center gap-4 text-sm text-slate-500 sm:flex-row sm:gap-6"
          >
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <div className="relative">
                <select
                  value={rowsPerPage}
                  onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
                  className="cursor-pointer appearance-none rounded-lg border border-slate-300 bg-transparent py-1 pl-2 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-300"
                >
                  {ROWS_PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400"
                >
                  ▾
                </span>
              </div>
            </div>

            <span>{`${pageStart}-${pageEnd} of ${totalRows}`}</span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onPreviousPage}
                disabled={!canGoPrevious}
                className="rounded p-1 transition-colors hover:bg-slate-200 disabled:opacity-30"
                aria-label="Previous page"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={onNextPage}
                disabled={!canGoNext}
                className="rounded p-1 transition-colors hover:bg-slate-200 disabled:opacity-30"
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </nav>
        </div>
      </main>

      <section className="mx-auto w-full max-w-[1200px] px-4 pb-12 md:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-500">
              총 수입
            </p>
            <p className="text-2xl font-black text-emerald-500">{formatAmount(totalIncome)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-500">
              총 지출
            </p>
            <p className="text-2xl font-black text-red-500">{formatAmount(totalExpense)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-500">
              이월 잔액
            </p>
            <p className="text-2xl font-black" style={{ color: '#FFD700' }}>
              {formatAmount(carryOverAmount)}
            </p>
          </div>
        </div>
      </section>
    </>
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
  const [editingRecord, setEditingRecord] = useState<SettlementRecord | null>(null);
  const [addSettlementForm, setAddSettlementForm] = useState<SettlementFormState>(() =>
    createDefaultForm(),
  );
  const [editSettlementForm, setEditSettlementForm] = useState<SettlementFormState>(() =>
    createDefaultForm(),
  );

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

    setAddSettlementForm(createDefaultForm());
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

  const handleOpenEditDialog = useCallback(
    (record: SettlementRecord) => {
      if (!requireAdminAction()) {
        return;
      }

      setEditingRecord(record);
      setEditSettlementForm(toFormStateFromRecord(record));
      setOpenEditDialog(true);
    },
    [requireAdminAction],
  );

  const handleCloseEditDialog = (event: object, reason: ModalCloseReason) => {
    void event;
    void reason;

    if (isSubmitting) {
      return;
    }

    setOpenEditDialog(false);
    setEditingRecord(null);
  };

  const handleChangeAddSettlementForm = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setAddSettlementForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleChangeEditSettlementForm = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setEditSettlementForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAddAmountTypeChange = (
    _event: MouseEvent<HTMLElement>,
    value: SettlementAmountType | null,
  ) => {
    if (!value) {
      return;
    }

    setAddSettlementForm((previous) => ({
      ...previous,
      amountType: value,
    }));
  };

  const handleEditAmountTypeChange = (
    _event: MouseEvent<HTMLElement>,
    value: SettlementAmountType | null,
  ) => {
    if (!value) {
      return;
    }

    setEditSettlementForm((previous) => ({
      ...previous,
      amountType: value,
    }));
  };

  const handleCreateSettlement = async () => {
    if (!requireAdminAction()) {
      return;
    }

    const payloadData = buildSettlementPayload(addSettlementForm);
    if ('error' in payloadData) {
      enqueueSnackbar(payloadData.error, { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/settlement', {
        method: 'POST',
        body: JSON.stringify(payloadData.value),
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

  const handleUpdateSettlement = async () => {
    if (!requireAdminAction()) {
      return;
    }

    if (!editingRecord) {
      enqueueSnackbar('수정할 정산 내역을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    const payloadData = buildSettlementPayload(editSettlementForm);
    if ('error' in payloadData) {
      enqueueSnackbar(payloadData.error, { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/settlement/${editingRecord.id}`, {
        method: 'PUT',
        body: JSON.stringify(payloadData.value),
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

  const addSettlementActions: TAction[] = [
    {
      label: isSubmitting ? 'Saving...' : 'Save',
      onClick: () => {
        void handleCreateSettlement();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting,
    },
  ];

  const editSettlementActions: TAction[] = [
    {
      label: isSubmitting ? 'Updating...' : 'Update',
      onClick: () => {
        void handleUpdateSettlement();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting,
    },
  ];

  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [page, setPage] = useState(0);

  const sortedRows = useMemo(
    () => [...settlementRows].sort((left, right) => right.date.localeCompare(left.date)),
    [settlementRows],
  );

  const totalRows = sortedRows.length;
  const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);

  useEffect(() => {
    setPage((previous) => Math.min(previous, maxPage));
  }, [maxPage]);

  const pagedRows = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [page, rowsPerPage, sortedRows]);

  const totalAmount = settlementRows.reduce((sum, row) => sum + row.amount, 0);
  const totalIncome = settlementRows.reduce(
    (sum, row) => (row.amount > 0 ? sum + row.amount : sum),
    0,
  );
  const totalExpense = settlementRows.reduce(
    (sum, row) => (row.amount < 0 ? sum + row.amount : sum),
    0,
  );
  const carryOverAmount = totalAmount;

  const pageStart = totalRows === 0 ? 0 : page * rowsPerPage + 1;
  const pageEnd = totalRows === 0 ? 0 : Math.min((page + 1) * rowsPerPage, totalRows);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-6 py-10">
        <LoadingComponent
          size={72}
          speed={1.2}
          className="drop-shadow-[0_12px_32px_rgba(248,250,252,0.18)]"
        />
      </div>
    );
  }

  return (
    <>
      <SettlementGrid
        rows={pagedRows}
        isLoading={isLoading}
        canManageSettlements={canManageSettlements}
        deletingSettlementId={deletingSettlementId}
        onOpenAddDialog={handleOpenAddDialog}
        onEdit={handleOpenEditDialog}
        onDelete={handleDeleteSettlement}
        totalAmount={totalAmount}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        carryOverAmount={carryOverAmount}
        rowsPerPage={rowsPerPage}
        pageStart={pageStart}
        pageEnd={pageEnd}
        totalRows={totalRows}
        canGoPrevious={page > 0}
        canGoNext={page < maxPage}
        onRowsPerPageChange={(nextRowsPerPage) => {
          if (
            !ROWS_PER_PAGE_OPTIONS.includes(
              nextRowsPerPage as (typeof ROWS_PER_PAGE_OPTIONS)[number],
            )
          ) {
            return;
          }

          setRowsPerPage(nextRowsPerPage);
          setPage(0);
        }}
        onPreviousPage={() => {
          setPage((previous) => Math.max(0, previous - 1));
        }}
        onNextPage={() => {
          setPage((previous) => Math.min(maxPage, previous + 1));
        }}
      />

      <SettlementDetailModal
        type="ADD"
        open={openAddDialog}
        handleClose={handleCloseAddDialog}
        title="ADD SETTLEMENT"
        actions={addSettlementActions}
        form={addSettlementForm}
        isSubmitting={isSubmitting}
        onFormChange={handleChangeAddSettlementForm}
        onAmountTypeChange={handleAddAmountTypeChange}
      />

      <SettlementDetailModal
        type="EDIT"
        open={openEditDialog}
        handleClose={handleCloseEditDialog}
        title="EDIT SETTLEMENT"
        actions={editSettlementActions}
        form={editSettlementForm}
        isSubmitting={isSubmitting}
        onFormChange={handleChangeEditSettlementForm}
        onAmountTypeChange={handleEditAmountTypeChange}
      />
    </>
  );
}
