import { Checkbox, FormControlLabel, TextField } from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
import { GlobalModal } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';

export type NoticeModalType = 'ADD' | 'EDIT';

export interface NoticeFormState {
  title: string;
  content: string;
  pinned: boolean;
}

interface NoticeDetailModalProps {
  type: NoticeModalType;
  open: boolean;
  handleClose: (event: object, reason: ModalCloseReason) => void;
  actions: TAction[];
  title: ReactNode;
  form: NoticeFormState;
  isSubmitting?: boolean;
  onFormChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPinnedChange: (checked: boolean) => void;
}

function NoticeDetailForm({
  form,
  isSubmitting = false,
  onFormChange,
  onPinnedChange,
}: Pick<NoticeDetailModalProps, 'form' | 'isSubmitting' | 'onFormChange' | 'onPinnedChange'>) {
  return (
    <div className="flex flex-col gap-1 pt-1">
      <TextField
        margin="dense"
        label="TITLE"
        name="title"
        fullWidth
        value={form.title}
        onChange={onFormChange}
        disabled={isSubmitting}
      />
      <TextField
        margin="dense"
        label="CONTENT"
        name="content"
        fullWidth
        multiline
        minRows={5}
        value={form.content}
        onChange={onFormChange}
        disabled={isSubmitting}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={form.pinned}
            onChange={(event) => onPinnedChange(event.target.checked)}
            disabled={isSubmitting}
          />
        }
        label="고정하기"
      />
    </div>
  );
}

export default function NoticeDetailModal({
  type,
  open,
  handleClose,
  actions,
  title,
  form,
  isSubmitting,
  onFormChange,
  onPinnedChange,
}: NoticeDetailModalProps) {
  return (
    <GlobalModal open={open} handleClose={handleClose} title={title} actions={actions}>
      <NoticeDetailForm
        key={type}
        form={form}
        isSubmitting={isSubmitting}
        onFormChange={onFormChange}
        onPinnedChange={onPinnedChange}
      />
    </GlobalModal>
  );
}
