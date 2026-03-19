import { MenuItem, TextField } from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
import { GlobalModal } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';

export interface AdminUserFormState {
  name: string;
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'inactive';
}

interface AdminUserDetailModalProps {
  open: boolean;
  handleClose: (event: object, reason: ModalCloseReason) => void;
  actions: TAction[];
  title: ReactNode;
  form: AdminUserFormState;
  isSubmitting?: boolean;
  disablePrivilegeControls?: boolean;
  onFormChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

function AdminUserDetailForm({
  form,
  isSubmitting = false,
  disablePrivilegeControls = false,
  onFormChange,
}: Pick<
  AdminUserDetailModalProps,
  'form' | 'isSubmitting' | 'disablePrivilegeControls' | 'onFormChange'
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
        select
        margin="dense"
        label="ROLE"
        name="role"
        fullWidth
        value={form.role}
        onChange={onFormChange}
        disabled={isSubmitting || disablePrivilegeControls}
        helperText={
          disablePrivilegeControls
            ? '현재 로그인한 관리자 계정의 권한은 여기서 변경할 수 없습니다.'
            : '사용자 권한을 선택해주세요.'
        }
      >
        <MenuItem value="member">Member</MenuItem>
        <MenuItem value="admin">Moderator</MenuItem>
      </TextField>
      <TextField
        select
        margin="dense"
        label="STATUS"
        name="status"
        fullWidth
        value={form.status}
        onChange={onFormChange}
        disabled={isSubmitting || disablePrivilegeControls}
        helperText={
          disablePrivilegeControls
            ? '현재 로그인한 관리자 계정의 활성 상태는 여기서 변경할 수 없습니다.'
            : '사용자 접근 상태를 선택해주세요.'
        }
      >
        <MenuItem value="active">Active</MenuItem>
        <MenuItem value="inactive">Inactive</MenuItem>
      </TextField>
    </div>
  );
}

export default function AdminUserDetailModal({
  open,
  handleClose,
  actions,
  title,
  form,
  isSubmitting,
  disablePrivilegeControls,
  onFormChange,
}: AdminUserDetailModalProps) {
  return (
    <GlobalModal open={open} handleClose={handleClose} title={title} actions={actions}>
      <AdminUserDetailForm
        form={form}
        isSubmitting={isSubmitting}
        disablePrivilegeControls={disablePrivilegeControls}
        onFormChange={onFormChange}
      />
    </GlobalModal>
  );
}
