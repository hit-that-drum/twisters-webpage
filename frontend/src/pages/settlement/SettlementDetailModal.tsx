import { TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { ChangeEvent, MouseEvent, ReactNode } from 'react';
import { FormModal } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';

export type SettlementModalType = 'ADD' | 'EDIT';
export type SettlementAmountType = 'deposit' | 'withdraw';

export interface SettlementFormState {
  date: string;
  item: string;
  amountType: SettlementAmountType;
  amount: string;
  relation: string;
}

interface SettlementDetailModalProps {
  type: SettlementModalType;
  open: boolean;
  handleClose: (event: object, reason: ModalCloseReason) => void;
  actions: TAction[];
  title: ReactNode;
  form: SettlementFormState;
  isSubmitting?: boolean;
  onFormChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onAmountTypeChange: (event: MouseEvent<HTMLElement>, value: SettlementAmountType | null) => void;
}

function SettlementDetailForm({
  form,
  isSubmitting = false,
  onFormChange,
  onAmountTypeChange,
}: Pick<
  SettlementDetailModalProps,
  'form' | 'isSubmitting' | 'onFormChange' | 'onAmountTypeChange'
>) {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <TextField
        margin="dense"
        type="date"
        label="DATE"
        name="date"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
        value={form.date}
        onChange={onFormChange}
        disabled={isSubmitting}
      />
      <TextField
        margin="dense"
        label="ITEM"
        name="item"
        fullWidth
        value={form.item}
        onChange={onFormChange}
        disabled={isSubmitting}
      />
      <div className="mt-3">
        <p className="mb-1.5 text-sm font-semibold text-slate-600">금액 구분</p>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="primary"
          value={form.amountType}
          onChange={onAmountTypeChange}
          aria-label="amount type"
          disabled={isSubmitting}
        >
          <ToggleButton value="deposit">입금</ToggleButton>
          <ToggleButton value="withdraw">출금</ToggleButton>
        </ToggleButtonGroup>
      </div>
      <TextField
        margin="dense"
        type="number"
        label="AMOUNT"
        name="amount"
        fullWidth
        slotProps={{ htmlInput: { min: 0, step: 1 } }}
        value={form.amount}
        onChange={onFormChange}
        disabled={isSubmitting}
      />
      <TextField
        margin="dense"
        label="RELATION"
        name="relation"
        fullWidth
        value={form.relation}
        onChange={onFormChange}
        disabled={isSubmitting}
      />
    </div>
  );
}

export default function SettlementDetailModal({
  type,
  open,
  handleClose,
  actions,
  title,
  form,
  isSubmitting,
  onFormChange,
  onAmountTypeChange,
}: SettlementDetailModalProps) {
  return (
    <FormModal
      open={open}
      handleClose={handleClose}
      title={title}
      actions={actions}
      formKey={type}
    >
      <SettlementDetailForm
        form={form}
        isSubmitting={isSubmitting}
        onFormChange={onFormChange}
        onAmountTypeChange={onAmountTypeChange}
      />
    </FormModal>
  );
}
