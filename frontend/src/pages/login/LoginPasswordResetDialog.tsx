import { Dialog, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import type { ChangeEvent } from 'react';
import PasswordField from '@/common/components/PasswordField';

export interface LoginPasswordResetDialogProps {
  open: boolean;
  onClose: () => void;
  isResetLinkFlow: boolean;
  isResetSubmitting: boolean;
  resetEmail: string;
  resetPassword: string;
  onResetChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetPassword: () => void;
}

export default function LoginPasswordResetDialog({
  open,
  onClose,
  isResetLinkFlow,
  isResetSubmitting,
  resetEmail,
  resetPassword,
  onResetChange,
  onResetPassword,
}: LoginPasswordResetDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>비밀번호 재설정</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {isResetLinkFlow
            ? '토큰이 확인되었습니다. 이메일과 새 비밀번호를 입력해 재설정을 완료하세요.'
            : '가입한 이메일을 입력하면 재설정 링크를 발송합니다.'}
        </DialogContentText>
        <div className="mt-4 mb-4">
          <label htmlFor="resetEmail" className="mb-2 block text-sm font-semibold text-gray-800">
            Email address
          </label>
          <input
            id="resetEmail"
            type="email"
            name="resetEmail"
            value={resetEmail}
            onChange={onResetChange}
            placeholder="E-MAIL을 입력해주세요"
            className="auth-input auth-input-reset"
            required
          />
        </div>
        {isResetLinkFlow && (
          <div className="mb-4">
            <PasswordField
              id="resetPassword"
              name="resetPassword"
              label="Password"
              value={resetPassword}
              onChange={onResetChange}
              disabled={isResetSubmitting}
              placeholder="비밀번호를 입력해주세요"
              required
              showValidation
            />
          </div>
        )}
        <button
          type="button"
          disabled={isResetSubmitting}
          className="mt-4 w-full rounded-xl bg-blue-700 py-4 text-sm font-bold text-white transition-all hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onResetPassword}
        >
          {isResetSubmitting ? '처리 중...' : isResetLinkFlow ? '비밀번호 재설정' : '재설정 링크 보내기'}
        </button>
      </DialogContent>
    </Dialog>
  );
}
