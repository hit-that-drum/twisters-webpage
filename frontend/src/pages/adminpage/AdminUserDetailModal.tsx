import { MenuItem, TextField } from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
import { FormModal } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const formatRoleLabel = (role: AdminUserFormState['role']) => {
  return role === 'admin' ? 'Moderator' : 'Member';
};

const formatStatusLabel = (status: AdminUserFormState['status']) => {
  return status === 'active' ? 'Active' : 'Inactive';
};

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
  initialForm: AdminUserFormState;
  isSubmitting?: boolean;
  disablePrivilegeControls?: boolean;
  disableRoleControl?: boolean;
  disableStatusControl?: boolean;
  emailOptional?: boolean;
  userName?: string;
  joinedLabel?: string;
  onFormChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

function AdminUserDetailForm({
  form,
  initialForm,
  isSubmitting = false,
  disablePrivilegeControls = false,
  disableRoleControl = false,
  disableStatusControl = false,
  emailOptional = false,
  userName,
  joinedLabel,
  onFormChange,
}: Pick<
  AdminUserDetailModalProps,
  | 'form'
  | 'initialForm'
  | 'isSubmitting'
  | 'disablePrivilegeControls'
  | 'disableRoleControl'
  | 'disableStatusControl'
  | 'emailOptional'
  | 'userName'
  | 'joinedLabel'
  | 'onFormChange'
>) {
  const trimmedName = form.name.trim();
  const trimmedEmail = form.email.trim().toLowerCase();
  const initialName = initialForm.name.trim();
  const initialEmail = initialForm.email.trim().toLowerCase();

  const hasNameChange = trimmedName !== initialName;
  const hasEmailChange = trimmedEmail !== initialEmail;
  const hasRoleChange = !disableRoleControl && form.role !== initialForm.role;
  const hasStatusChange = form.status !== initialForm.status;
  const hasAccessChange = hasRoleChange || (!disableStatusControl && hasStatusChange);

  const isNameInvalid = trimmedName.length === 0;
  const isEmailInvalid = emailOptional
    ? trimmedEmail.length > 0 && !isValidEmail(trimmedEmail)
    : trimmedEmail.length === 0 || !isValidEmail(trimmedEmail);

  return (
    <div className="flex flex-col gap-1 pt-1">
      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">{userName || 'Selected user'}</p>
        {joinedLabel ? <p className="mt-1">Joined {joinedLabel}</p> : null}
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {disableStatusControl
            ? 'Name and email update the selected test-member record. Test-member role and status do not control app sign-in authority here.'
            : 'Name and email update profile details. Role and status control admin access and sign-in availability.'}
        </p>
      </div>

      {disablePrivilegeControls ? (
        <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-semibold">Current admin safeguard</p>
          <p className="mt-1 leading-5 text-sky-800">
            You can update your own name and email here, but role and status stay locked to prevent accidental loss of admin access.
          </p>
        </div>
      ) : null}

      {hasAccessChange ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Access change warning</p>
          {hasRoleChange ? (
            <p className="mt-1 leading-5 text-amber-900">
              Role changes from {formatRoleLabel(initialForm.role)} to {formatRoleLabel(form.role)}.
            </p>
          ) : null}
          {hasStatusChange ? (
            <p className="mt-1 leading-5 text-amber-900">
              Status changes from {formatStatusLabel(initialForm.status)} to {formatStatusLabel(form.status)}. Inactive users cannot continue after their next authenticated request.
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-amber-800">
            Save applies permission changes immediately for future authenticated requests.
          </p>
        </div>
      ) : null}

      <TextField
        margin="dense"
        label="NAME"
        name="name"
        fullWidth
        value={form.name}
        onChange={onFormChange}
        disabled={isSubmitting}
        error={isNameInvalid}
        helperText={
          isNameInvalid
            ? 'Name is required.'
            : hasNameChange
              ? 'This updated display name appears anywhere the user is shown in the app.'
              : 'Shown in the admin table and user-facing profile views.'
        }
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
        error={isEmailInvalid}
        helperText={
          isEmailInvalid
            ? emailOptional
              ? 'Enter a valid email address or leave it blank for a member record without email.'
              : 'Enter a valid email address for sign-in and password reset.'
            : hasEmailChange
              ? emailOptional
                ? 'The updated email is saved to the test member record after save.'
                : 'The new email becomes the user\'s sign-in address after save.'
              : emailOptional
                ? 'Optional for test member records. Leave blank if no email should be stored.'
                : 'Used for sign-in, approval tracking, and password reset.'
        }
      />
      <TextField
        select
        margin="dense"
        label="ROLE"
        name="role"
        fullWidth
        value={form.role}
        onChange={onFormChange}
        disabled={isSubmitting || disablePrivilegeControls || disableRoleControl}
        helperText={
          disableRoleControl
            ? 'Test member records do not control real admin authority in this view.'
            : disablePrivilegeControls
            ? 'Your current admin role cannot be changed from this modal.'
            : hasRoleChange
              ? `This user will switch to ${formatRoleLabel(form.role)} permissions after save.`
              : 'Moderators can manage users, approvals, and protected admin actions.'
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
        disabled={isSubmitting || disablePrivilegeControls || disableStatusControl}
        helperText={
          disableStatusControl
            ? 'Test member records do not have a separate account status in this admin view.'
            : disablePrivilegeControls
            ? 'Your current admin access state cannot be changed from this modal.'
            : hasStatusChange
              ? form.status === 'inactive'
                ? 'Inactive users lose access until an admin re-enables the account.'
                : 'Re-activating restores access on the next authenticated request.'
              : 'Active users can sign in. Inactive users stay blocked until re-enabled.'
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
  initialForm,
  isSubmitting,
  disablePrivilegeControls,
  disableRoleControl,
  disableStatusControl,
  emailOptional,
  userName,
  joinedLabel,
  onFormChange,
}: AdminUserDetailModalProps) {
  return (
    <FormModal open={open} handleClose={handleClose} title={title} actions={actions}>
      <AdminUserDetailForm
        form={form}
        initialForm={initialForm}
        isSubmitting={isSubmitting}
        disablePrivilegeControls={disablePrivilegeControls}
        disableRoleControl={disableRoleControl}
        disableStatusControl={disableStatusControl}
        emailOptional={emailOptional}
        userName={userName}
        joinedLabel={joinedLabel}
        onFormChange={onFormChange}
      />
    </FormModal>
  );
}
