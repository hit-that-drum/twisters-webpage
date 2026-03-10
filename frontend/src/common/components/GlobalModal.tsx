import { Dialog, DialogActions, DialogContent, DialogTitle, type ButtonProps } from '@mui/material';
import type { ReactNode } from 'react';
import GlobalButton from './GlobalButton';

export type ModalCloseReason = 'escapeKeyDown' | 'backdropClick' | 'buttonClick';

const BUTTON_STYLE_CLASS_MAP = {
  error: 'bg-red-500 hover:bg-red-600',
  confirm: 'bg-green-500 hover:bg-green-600',
} as const;

type ButtonStyleKey = keyof typeof BUTTON_STYLE_CLASS_MAP;

export type TAction = {
  label: string;
  hidden?: boolean;
  buttonStyle?: ButtonStyleKey;
} & ButtonProps;

interface GlobalModalProps {
  open: boolean;
  handleClose: (event: object, reason: ModalCloseReason) => void;
  actions: TAction[];
  title: ReactNode;
  children: ReactNode;
  keepOnBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
}

const modalButtonStyle = 'min-w-[60px] h-10 border-2 text-white text-sm';

export default function GlobalModal({
  open,
  handleClose,
  actions,
  title,
  children,
  keepOnBackdropClick = true,
  disableEscapeKeyDown,
}: GlobalModalProps) {
  const closeDialog = (e: object, reason: ModalCloseReason) => {
    if (keepOnBackdropClick && reason === 'backdropClick') return;
    if (disableEscapeKeyDown && reason === 'escapeKeyDown') return;

    handleClose?.(e, reason);
  };

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => closeDialog(e, reason as ModalCloseReason)}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers={true}>{children || '내용을 입력해주세요'}</DialogContent>
      <DialogActions>
        <GlobalButton
          label="닫기"
          variant={`${modalButtonStyle} bg-gray-500 hover:bg-gray-600`}
          onClick={(e) => handleClose(e, 'buttonClick')}
        />
        {actions?.map(({ label, hidden, buttonStyle, ...buttonProps }) =>
          !hidden ? (
            <GlobalButton
              {...buttonProps}
              key={label}
              label={label}
              variant={
                buttonStyle
                  ? `${modalButtonStyle} ${BUTTON_STYLE_CLASS_MAP[buttonStyle]}`
                  : modalButtonStyle
              }
            />
          ) : null,
        )}
      </DialogActions>
    </Dialog>
  );
}
