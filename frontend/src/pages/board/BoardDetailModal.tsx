import { Checkbox, FormControlLabel, TextField } from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
import { GlobalModal } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';

export type BoardModalType = 'ADD' | 'EDIT';

export interface BoardFormState {
  title: string;
  content: string;
  pinned: boolean;
}

interface BoardDetailModalProps {
  type: BoardModalType;
  open: boolean;
  handleClose: (event: object, reason: ModalCloseReason) => void;
  actions: TAction[];
  title: ReactNode;
  form: BoardFormState;
  isSubmitting?: boolean;
  canPinPost: boolean;
  onFormChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPinnedChange: (checked: boolean) => void;
}

function BoardDetailForm({
  form,
  isSubmitting = false,
  canPinPost,
  onFormChange,
  onPinnedChange,
}: Pick<
  BoardDetailModalProps,
  'form' | 'isSubmitting' | 'canPinPost' | 'onFormChange' | 'onPinnedChange'
>) {
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
      {canPinPost && (
        <FormControlLabel
          control={
            <Checkbox
              checked={form.pinned}
              onChange={(event) => onPinnedChange(event.target.checked)}
              disabled={isSubmitting}
            />
          }
          label="Pinned"
        />
      )}
    </div>
  );
}

export default function BoardDetailModal({
  type,
  open,
  handleClose,
  actions,
  title,
  form,
  isSubmitting,
  canPinPost,
  onFormChange,
  onPinnedChange,
}: BoardDetailModalProps) {
  return (
    <GlobalModal open={open} handleClose={handleClose} title={title} actions={actions}>
      <BoardDetailForm
        key={type}
        form={form}
        isSubmitting={isSubmitting}
        canPinPost={canPinPost}
        onFormChange={onFormChange}
        onPinnedChange={onPinnedChange}
      />
    </GlobalModal>
  );
}
