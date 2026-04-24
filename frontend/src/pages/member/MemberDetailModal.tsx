import { TextField } from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { FormModal } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

export interface MemberFormState {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
}

interface MemberDetailModalProps {
  type: 'ADD' | 'EDIT';
  open: boolean;
  handleClose: (event: object, reason: ModalCloseReason) => void;
  actions: TAction[];
  title: ReactNode;
  form: MemberFormState;
  isSubmitting?: boolean;
  onFormChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onDateChange: (field: 'birthDate', value: string) => void;
}

const toPickerDateValue = (value: string): Dayjs | null => {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = dayjs(value);
  return parsedValue.isValid() ? parsedValue : null;
};

function MemberDetailForm({
  form,
  isSubmitting = false,
  onFormChange,
  onDateChange,
}: Pick<
  MemberDetailModalProps,
  'form' | 'isSubmitting' | 'onFormChange' | 'onDateChange'
>) {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <TextField
        margin="dense"
        label="NAME"
        name="name"
        fullWidth
        value={form.name}
        onChange={onFormChange}
        disabled={isSubmitting}
      />
      <TextField
        margin="dense"
        label="EMAIL"
        name="email"
        type="email"
        fullWidth
        value={form.email}
        onChange={onFormChange}
        disabled={isSubmitting}
      />
      <TextField
        margin="dense"
        label="PHONE"
        name="phone"
        fullWidth
        value={form.phone}
        onChange={onFormChange}
        disabled={isSubmitting}
      />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="BIRTH DATE"
          value={toPickerDateValue(form.birthDate)}
          onChange={(value) => {
            onDateChange('birthDate', value?.isValid() ? value.format('YYYY-MM-DD') : '');
          }}
          format="YYYY.MM.DD"
          disabled={isSubmitting}
          slotProps={{
            textField: {
              margin: 'dense',
              fullWidth: true,
              size: 'small',
            },
          }}
        />
      </LocalizationProvider>
    </div>
  );
}

export default function MemberDetailModal({
  open,
  handleClose,
  actions,
  title,
  form,
  isSubmitting,
  onFormChange,
  onDateChange,
}: MemberDetailModalProps) {
  return (
    <FormModal open={open} handleClose={handleClose} title={title} actions={actions}>
      <MemberDetailForm
        form={form}
        isSubmitting={isSubmitting}
        onFormChange={onFormChange}
        onDateChange={onDateChange}
      />
    </FormModal>
  );
}
