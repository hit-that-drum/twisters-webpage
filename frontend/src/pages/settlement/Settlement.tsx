import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/features';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { useConfirmDialog } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import useExpiredSession from '@/common/hooks/useExpiredSession';
import SettlementDetailModal, {
  type SettlementAmountType,
  type SettlementFormState,
} from './SettlementDetailModal';
import SettlementGrid from './SettlementGrid';
import LoadingComponent from '@/common/LoadingComponent.tsx';
import {
  ROWS_PER_PAGE_OPTIONS,
  type SettlementRecord,
} from '@/pages/settlement/lib/settlementTypes';
import {
  buildSettlementPayload,
  createDefaultForm,
  toFormStateFromRecord,
} from '@/pages/settlement/lib/settlementHelpers';

export default function Settlement() {
  const navigate = useNavigate();
  const { meInfo } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const handleExpiredSession = useExpiredSession();
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
          handleExpiredSession();
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
  }, [handleExpiredSession]);

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
          handleExpiredSession();
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
          handleExpiredSession();
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

      const shouldDelete = await confirm({
        title: '정산 내역 삭제',
        description: '해당 정산 내역을 삭제하시겠습니까?',
        confirmLabel: '삭제',
        confirmButtonStyle: 'error',
      });
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
            handleExpiredSession();
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
    [confirm, handleExpiredSession, loadSettlements, requireAdminAction],
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
  const [relationFilter, setRelationFilter] = useState('');

  const sortedRows = useMemo(
    () => [...settlementRows].sort((left, right) => right.date.localeCompare(left.date)),
    [settlementRows],
  );

  const relationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sortedRows
            .map((row) => row.relation.trim())
            .filter((relation): relation is string => relation.length > 0),
        ),
      ),
    [sortedRows],
  );

  useEffect(() => {
    if (relationFilter && !relationOptions.includes(relationFilter)) {
      setRelationFilter('');
      setPage(0);
    }
  }, [relationFilter, relationOptions]);

  const filteredRows = useMemo(() => {
    if (!relationFilter) {
      return sortedRows;
    }

    return sortedRows.filter((row) => row.relation.trim() === relationFilter);
  }, [relationFilter, sortedRows]);

  const totalRows = filteredRows.length;
  const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);
  const currentPage = Math.min(page, maxPage);

  useEffect(() => {
    setPage((previous) => Math.min(previous, maxPage));
  }, [maxPage]);

  const pagedRows = useMemo(() => {
    const startIndex = currentPage * rowsPerPage;
    return filteredRows.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, filteredRows, rowsPerPage]);

  const totalAmount = filteredRows.reduce((sum, row) => sum + row.amount, 0);
  const totalIncome = filteredRows.reduce(
    (sum, row) => (row.amount > 0 ? sum + row.amount : sum),
    0,
  );
  const totalExpense = filteredRows.reduce(
    (sum, row) => (row.amount < 0 ? sum + row.amount : sum),
    0,
  );
  const carryOverAmount = totalAmount;

  const pageStart = totalRows === 0 ? 0 : currentPage * rowsPerPage + 1;
  const pageEnd = totalRows === 0 ? 0 : Math.min((currentPage + 1) * rowsPerPage, totalRows);

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <>
      <SettlementGrid
        rows={pagedRows}
        canManageSettlements={canManageSettlements}
        deletingSettlementId={deletingSettlementId}
        onOpenAddDialog={handleOpenAddDialog}
        relationFilter={relationFilter}
        relationOptions={relationOptions}
        onRelationFilterChange={(nextRelationFilter) => {
          setRelationFilter(nextRelationFilter);
          setPage(0);
        }}
        emptyStateMessage={
          relationFilter
            ? '선택한 Relation에 해당하는 정산 내역이 없습니다.'
            : '등록된 정산 내역이 없습니다.'
        }
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
        canGoPrevious={currentPage > 0}
        canGoNext={currentPage < maxPage}
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

      {confirmDialog}
    </>
  );
}
