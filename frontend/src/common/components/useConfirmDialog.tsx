import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import ConfirmDialog, { type ConfirmDialogButtonStyle } from './ConfirmDialog';

interface ConfirmDialogOptions {
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonStyle?: ConfirmDialogButtonStyle;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean;
}

const DEFAULT_DIALOG_STATE: ConfirmDialogState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: '확인',
  cancelLabel: '취소',
  confirmButtonStyle: 'confirm',
};

export default function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(DEFAULT_DIALOG_STATE);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const closeDialog = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setDialogState((previous) => ({
      ...previous,
      open: false,
    }));
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    resolverRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        ...DEFAULT_DIALOG_STATE,
        ...options,
        open: true,
      });
    });
  }, []);

  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  return {
    confirm,
    confirmDialog: (
      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        description={dialogState.description}
        confirmLabel={dialogState.confirmLabel}
        cancelLabel={dialogState.cancelLabel}
        confirmButtonStyle={dialogState.confirmButtonStyle}
        onClose={() => closeDialog(false)}
        onConfirm={() => closeDialog(true)}
      />
    ),
  };
}
