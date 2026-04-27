/**
 * FormModal — the shared ADD/EDIT dialog wrapper used by Board, Notice,
 * Member, Settlement, and AdminPage detail modals.
 *
 * It wraps the generic `GlobalModal` and adds the "remount form content
 * when a form mode changes" trick (via the optional `formKey` prop). This
 * centralizes a pattern each per-page detail modal used to implement
 * inline — so cross-cutting dialog behavior (dirty-form confirm, focus
 * management, analytics, a11y tweaks) can be added in one place.
 */
import type { DialogProps } from '@mui/material';
import type { ReactNode } from 'react';
import GlobalModal, {
  type ModalCloseReason,
  type TAction,
} from './GlobalModal';

interface FormModalProps {
  open: boolean;
  handleClose: (event: object, reason: ModalCloseReason) => void;
  actions: TAction[];
  title: ReactNode;
  children: ReactNode;
  /**
   * When provided, a change to this value remounts the form content so
   * internal/uncontrolled state resets. Detail modals typically pass the
   * mode discriminant (e.g. `'ADD' | 'EDIT'`) or the record id being
   * edited.
   */
  formKey?: string | number;
  maxWidth?: DialogProps['maxWidth'];
}

export default function FormModal({
  open,
  handleClose,
  actions,
  title,
  children,
  formKey,
  maxWidth,
}: FormModalProps) {
  return (
    <GlobalModal
      open={open}
      handleClose={handleClose}
      actions={actions}
      title={title}
      maxWidth={maxWidth}
    >
      {formKey === undefined ? children : <div key={formKey}>{children}</div>}
    </GlobalModal>
  );
}
