import { Checkbox, FormControlLabel, TextField } from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
import { GlobalImageUpload, GlobalModal } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';

export type BoardModalType = 'ADD' | 'EDIT';

export interface BoardFormState {
  title: string;
  imageUrl: string[];
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
  onImageUrlsChange: (value: string[]) => void;
  onPinnedChange: (checked: boolean) => void;
}

function BoardDetailForm({
  form,
  isSubmitting = false,
  canPinPost,
  onFormChange,
  onImageUrlsChange,
  onPinnedChange,
}: Pick<
  BoardDetailModalProps,
  'form' | 'isSubmitting' | 'canPinPost' | 'onFormChange' | 'onImageUrlsChange' | 'onPinnedChange'
>) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      <TextField
        margin="dense"
        label="TITLE"
        name="title"
        fullWidth
        value={form.title}
        onChange={onFormChange}
        disabled={isSubmitting}
        placeholder="제목을 입력해주세요"
      />
      <GlobalImageUpload
        value={form.imageUrl}
        onChange={onImageUrlsChange}
        disabled={isSubmitting}
        maxImages={12}
        label="IMAGES"
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
        placeholder="내용을 입력해주세요"
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
          label="PINNED"
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
  onImageUrlsChange,
  onPinnedChange,
}: BoardDetailModalProps) {
  return (
    <GlobalModal
      open={open}
      handleClose={handleClose}
      title={title}
      actions={actions}
      maxWidth="md"
    >
      <BoardDetailForm
        key={type}
        form={form}
        isSubmitting={isSubmitting}
        canPinPost={canPinPost}
        onFormChange={onFormChange}
        onImageUrlsChange={onImageUrlsChange}
        onPinnedChange={onPinnedChange}
      />
    </GlobalModal>
  );
}
