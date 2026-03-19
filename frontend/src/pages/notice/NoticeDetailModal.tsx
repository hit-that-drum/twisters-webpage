import { Checkbox, FormControlLabel, TextField } from '@mui/material';
import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { GlobalImageUpload, GlobalModal } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';

export type NoticeModalType = 'ADD' | 'EDIT';

export interface NoticeFormState {
  title: string;
  imageUrl: string;
  content: string;
  pinned: boolean;
}

const MAX_BULLET_TAB_DEPTH = 3;
const BULLET_PREFIX_PATTERN = /^(\t{0,3})(?:[-*]|•)\s*/;
const LIST_PREFIX_PATTERN = /^(\t{0,3}(?:[-*]|•)\s+)/;

interface NoticeDetailModalProps {
  type: NoticeModalType;
  open: boolean;
  handleClose: (event: object, reason: ModalCloseReason) => void;
  actions: TAction[];
  title: ReactNode;
  form: NoticeFormState;
  isSubmitting?: boolean;
  onFormChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onImageUrlsChange: (value: string[]) => void;
  onPinnedChange: (checked: boolean) => void;
}

function NoticeDetailForm({
  form,
  isSubmitting = false,
  onFormChange,
  onImageUrlsChange,
  onPinnedChange,
}: Pick<
  NoticeDetailModalProps,
  'form' | 'isSubmitting' | 'onFormChange' | 'onImageUrlsChange' | 'onPinnedChange'
>) {
  const handleContentKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    const lineStart = target.value.lastIndexOf('\n', Math.max(target.selectionStart - 1, 0)) + 1;
    const lineEnd = target.value.indexOf('\n', target.selectionStart);
    const currentLine = target.value.slice(
      lineStart,
      lineEnd === -1 ? target.value.length : lineEnd,
    );

    if (event.key === 'Tab') {
      const lineMatch = currentLine.match(BULLET_PREFIX_PATTERN);

      if (!lineMatch) {
        return;
      }

      event.preventDefault();

      if (target.selectionStart !== target.selectionEnd) {
        return;
      }

      const currentPrefix = lineMatch[0];
      const currentDepth = lineMatch[1].length;
      const contentWithoutPrefix = currentLine.slice(currentPrefix.length);
      const nextDepth = event.shiftKey
        ? Math.max(currentDepth - 1, 0)
        : currentPrefix.includes('•')
        ? Math.min(currentDepth + 1, MAX_BULLET_TAB_DEPTH)
        : currentDepth;
      const nextPrefix = `${'\t'.repeat(nextDepth)}• `;
      const nextLine = `${nextPrefix}${contentWithoutPrefix}`;

      if (nextLine === currentLine) {
        return;
      }

      const previousCaretOffset = target.selectionStart - lineStart;
      const nextCaretOffset =
        previousCaretOffset <= currentPrefix.length
          ? nextPrefix.length
          : previousCaretOffset - currentPrefix.length + nextPrefix.length;

      target.setRangeText(
        nextLine,
        lineStart,
        lineEnd === -1 ? target.value.length : lineEnd,
        'start',
      );
      target.setSelectionRange(lineStart + nextCaretOffset, lineStart + nextCaretOffset);
      target.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (event.key !== 'Enter' || event.shiftKey || target.selectionStart !== target.selectionEnd) {
      return;
    }

    const listPrefix = currentLine.match(LIST_PREFIX_PATTERN)?.[1];

    if (!listPrefix) {
      return;
    }

    event.preventDefault();
    target.setRangeText(`\n${listPrefix}`, target.selectionStart, target.selectionEnd, 'end');
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };

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
        value={form.imageUrl ? [form.imageUrl] : []}
        onChange={onImageUrlsChange}
        disabled={isSubmitting}
        maxImages={1}
        label="IMAGE"
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
        onKeyDown={handleContentKeyDown}
        helperText="tab키를 사용하면 불렛포인트를 사용 할 수 있습니다(최대 3 depth)"
        disabled={isSubmitting}
        placeholder="내용을 입력해주세요"
      />
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
  onImageUrlsChange,
  onPinnedChange,
}: NoticeDetailModalProps) {
  return (
    <GlobalModal
      open={open}
      handleClose={handleClose}
      title={title}
      actions={actions}
      maxWidth="md"
    >
      <NoticeDetailForm
        key={type}
        form={form}
        isSubmitting={isSubmitting}
        onFormChange={onFormChange}
        onImageUrlsChange={onImageUrlsChange}
        onPinnedChange={onPinnedChange}
      />
    </GlobalModal>
  );
}
