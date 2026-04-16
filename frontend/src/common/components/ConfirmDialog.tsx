import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, type DialogProps } from '@mui/material';
import { useId, type ReactNode } from 'react';
import GlobalButton from './GlobalButton';

const BUTTON_STYLE_CLASS_MAP = {
  error: 'bg-red-500 hover:bg-red-600',
  confirm: 'bg-green-500 hover:bg-green-600',
} as const;

export type ConfirmDialogButtonStyle = keyof typeof BUTTON_STYLE_CLASS_MAP;

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonStyle?: ConfirmDialogButtonStyle;
  maxWidth?: DialogProps['maxWidth'];
  onConfirm: () => void;
  onClose: () => void;
}

const actionButtonClassName = 'min-w-[88px] h-10 border-2 text-white text-sm';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirmButtonStyle = 'confirm',
  maxWidth = 'xs',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId}>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <GlobalButton
          label={cancelLabel}
          variant={`${actionButtonClassName} bg-gray-500 hover:bg-gray-600`}
          onClick={onClose}
        />
        <GlobalButton
          autoFocus
          label={confirmLabel}
          variant={`${actionButtonClassName} ${BUTTON_STYLE_CLASS_MAP[confirmButtonStyle]}`}
          onClick={onConfirm}
        />
      </DialogActions>
    </Dialog>
  );
}
