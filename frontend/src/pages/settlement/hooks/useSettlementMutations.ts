import { type ChangeEvent, type MouseEvent, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import type useConfirmDialog from '@/common/components/useConfirmDialog';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import type {
  SettlementAmountType,
  SettlementFormState,
} from '@/pages/settlement/SettlementDetailModal';
import {
  buildSettlementPayload,
  createDefaultForm,
  toFormStateFromRecord,
} from '@/pages/settlement/lib/settlementHelpers';
import type { SettlementRecord } from '@/pages/settlement/lib/settlementTypes';
import type { MeInfo } from '@/entities/user/types';

type ConfirmFn = ReturnType<typeof useConfirmDialog>['confirm'];

interface UseSettlementMutationsOptions {
  meInfo: MeInfo | null;
  confirm: ConfirmFn;
  loadSettlements: () => Promise<void>;
  onExpiredSession: () => void;
}

interface UseSettlementMutationsResult {
  isSubmitting: boolean;
  deletingSettlementId: number | null;
  openAddDialog: boolean;
  openEditDialog: boolean;
  addSettlementForm: SettlementFormState;
  editSettlementForm: SettlementFormState;
  handleOpenAddDialog: () => void;
  handleCloseAddDialog: (event: object, reason: ModalCloseReason) => void;
  handleOpenEditDialog: (record: SettlementRecord) => void;
  handleCloseEditDialog: (event: object, reason: ModalCloseReason) => void;
  handleChangeAddSettlementForm: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleChangeEditSettlementForm: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleAddAmountTypeChange: (
    event: MouseEvent<HTMLElement>,
    value: SettlementAmountType | null,
  ) => void;
  handleEditAmountTypeChange: (
    event: MouseEvent<HTMLElement>,
    value: SettlementAmountType | null,
  ) => void;
  handleCreateSettlement: () => Promise<void>;
  handleUpdateSettlement: () => Promise<void>;
  handleDeleteSettlement: (settlementId: number) => Promise<void>;
}

/**
 * Owns the add/edit dialog state and the settlement CRUD endpoints.
 * All mutations gate on `requireAdminAction` (login + admin) and route
 * 401 responses to `onExpiredSession`. Mutations refetch via the injected
 * `loadSettlements` so the caller controls the source of truth.
 */
export default function useSettlementMutations({
  meInfo,
  confirm,
  loadSettlements,
  onExpiredSession,
}: UseSettlementMutationsOptions): UseSettlementMutationsResult {
  const navigate = useNavigate();
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

  const handleOpenAddDialog = useCallback(() => {
    if (!requireAdminAction()) {
      return;
    }

    setAddSettlementForm(createDefaultForm());
    setOpenAddDialog(true);
  }, [requireAdminAction]);

  const handleCloseAddDialog = useCallback(
    (event: object, reason: ModalCloseReason) => {
      void event;
      void reason;

      if (isSubmitting) {
        return;
      }

      setOpenAddDialog(false);
    },
    [isSubmitting],
  );

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

  const handleCloseEditDialog = useCallback(
    (event: object, reason: ModalCloseReason) => {
      void event;
      void reason;

      if (isSubmitting) {
        return;
      }

      setOpenEditDialog(false);
      setEditingRecord(null);
    },
    [isSubmitting],
  );

  const handleChangeAddSettlementForm = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setAddSettlementForm((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  const handleChangeEditSettlementForm = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setEditSettlementForm((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    [],
  );

  const handleAddAmountTypeChange = useCallback(
    (_event: MouseEvent<HTMLElement>, value: SettlementAmountType | null) => {
      if (!value) {
        return;
      }

      setAddSettlementForm((previous) => ({
        ...previous,
        amountType: value,
      }));
    },
    [],
  );

  const handleEditAmountTypeChange = useCallback(
    (_event: MouseEvent<HTMLElement>, value: SettlementAmountType | null) => {
      if (!value) {
        return;
      }

      setEditSettlementForm((previous) => ({
        ...previous,
        amountType: value,
      }));
    },
    [],
  );

  const handleCreateSettlement = useCallback(async () => {
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
          onExpiredSession();
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
  }, [addSettlementForm, loadSettlements, onExpiredSession, requireAdminAction]);

  const handleUpdateSettlement = useCallback(async () => {
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
          onExpiredSession();
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
  }, [editSettlementForm, editingRecord, loadSettlements, onExpiredSession, requireAdminAction]);

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
            onExpiredSession();
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
    [confirm, loadSettlements, onExpiredSession, requireAdminAction],
  );

  return {
    isSubmitting,
    deletingSettlementId,
    openAddDialog,
    openEditDialog,
    addSettlementForm,
    editSettlementForm,
    handleOpenAddDialog,
    handleCloseAddDialog,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleChangeAddSettlementForm,
    handleChangeEditSettlementForm,
    handleAddAmountTypeChange,
    handleEditAmountTypeChange,
    handleCreateSettlement,
    handleUpdateSettlement,
    handleDeleteSettlement,
  };
}
