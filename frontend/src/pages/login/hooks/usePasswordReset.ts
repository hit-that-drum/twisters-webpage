import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import {
  evaluatePasswordPolicy,
  PASSWORD_POLICY_ERROR_MESSAGE,
} from '@/common/lib/passwordPolicy';

interface UsePasswordResetOptions {
  loginEmail: string;
}

export const usePasswordReset = ({ loginEmail }: UsePasswordResetOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken')?.trim() || '';
  const resetEmailFromLink = searchParams.get('email')?.trim() || '';
  const isResetLinkFlow = Boolean(resetToken && resetEmailFromLink);

  const [resetFormData, setResetFormData] = useState({
    resetEmail: '',
    resetPassword: '',
  });
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [openForgotPasswordDialog, setOpenForgotPasswordDialog] = useState(false);

  const resetPasswordEvaluation = evaluatePasswordPolicy(resetFormData.resetPassword);

  useEffect(() => {
    if (isResetLinkFlow) {
      setResetFormData((previous) => ({
        ...previous,
        resetEmail: resetEmailFromLink || previous.resetEmail,
      }));
      setOpenForgotPasswordDialog(true);
    }
  }, [isResetLinkFlow, resetEmailFromLink]);

  const handleForgotPassword = useCallback(() => {
    setResetFormData((previous) => ({
      ...previous,
      resetEmail: resetEmailFromLink || loginEmail || previous.resetEmail,
      resetPassword: isResetLinkFlow ? previous.resetPassword : '',
    }));
    setOpenForgotPasswordDialog(true);
  }, [isResetLinkFlow, loginEmail, resetEmailFromLink]);

  const handleResetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setResetFormData((previous) => ({ ...previous, [e.target.name]: e.target.value }));
  }, []);

  const closeForgotPasswordDialog = useCallback(() => {
    setOpenForgotPasswordDialog(false);
  }, []);

  const openForReset = useCallback(({ email }: { email: string }) => {
    setResetFormData((previous) => ({
      ...previous,
      resetEmail: email,
    }));
    setOpenForgotPasswordDialog(true);
  }, []);

  const handleResetPassword = useCallback(async () => {
    const normalizedResetEmail = resetFormData.resetEmail.trim().toLowerCase();
    if (!normalizedResetEmail) {
      enqueueSnackbar('이메일 형식이 올바르지 않습니다.', { variant: 'error' });
      return;
    }

    if (isResetLinkFlow && !resetFormData.resetPassword) {
      enqueueSnackbar('새 비밀번호를 입력해주세요.', { variant: 'error' });
      return;
    }

    if (isResetLinkFlow && !resetPasswordEvaluation.isValid) {
      enqueueSnackbar(PASSWORD_POLICY_ERROR_MESSAGE, { variant: 'error' });
      return;
    }

    setIsResetSubmitting(true);

    try {
      if (!isResetLinkFlow) {
        const requestResetResponse = await apiFetch('/authentication/request-reset', {
          method: 'POST',
          body: JSON.stringify({
            email: normalizedResetEmail,
          }),
        });
        const requestResetData = await requestResetResponse.json();

        if (!requestResetResponse.ok) {
          enqueueSnackbar(
            `재설정 링크 요청 실패: ${requestResetData.error || '알 수 없는 에러'}`,
            { variant: 'error' },
          );
          return;
        }

        enqueueSnackbar(
          requestResetData.message || '비밀번호 재설정 링크를 이메일로 보냈습니다.',
          { variant: 'success' },
        );
        setOpenForgotPasswordDialog(false);
        setResetFormData((previous) => ({
          ...previous,
          resetPassword: '',
        }));
        return;
      }

      const verifyResponse = await apiFetch('/authentication/verify-reset-token', {
        method: 'POST',
        body: JSON.stringify({
          email: normalizedResetEmail,
          token: resetToken,
        }),
      });
      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        enqueueSnackbar(`토큰 검증 실패: ${verifyData.error || '알 수 없는 에러'}`, {
          variant: 'error',
        });
        return;
      }

      const response = await apiFetch('/authentication/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: normalizedResetEmail,
          newPassword: resetFormData.resetPassword,
          token: resetToken,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        enqueueSnackbar(`비밀번호 재설정 실패: ${data.error || '알 수 없는 에러'}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar('비밀번호가 성공적으로 변경되었습니다.', { variant: 'success' });
      setOpenForgotPasswordDialog(false);
      setResetFormData({ resetEmail: '', resetPassword: '' });

      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('resetToken');
      nextSearchParams.delete('email');
      setSearchParams(nextSearchParams, { replace: true });
    } catch (error) {
      console.error('Password reset error:', error);
      enqueueSnackbar('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', {
        variant: 'error',
      });
    } finally {
      setIsResetSubmitting(false);
    }
  }, [
    isResetLinkFlow,
    resetFormData.resetEmail,
    resetFormData.resetPassword,
    resetPasswordEvaluation.isValid,
    resetToken,
    searchParams,
    setSearchParams,
  ]);

  return {
    resetFormData,
    isResetSubmitting,
    isResetLinkFlow,
    openForgotPasswordDialog,
    closeForgotPasswordDialog,
    openForReset,
    handleForgotPassword,
    handleResetChange,
    handleResetPassword,
  };
};
