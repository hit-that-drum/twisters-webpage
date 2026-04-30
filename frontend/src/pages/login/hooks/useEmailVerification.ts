import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getAuthErrorMessage } from '@/pages/login/lib/authErrorMessages';
import { EMAIL_VERIFICATION_LOADING_MESSAGE } from '@/pages/login/lib/loadingMessages';

interface UseEmailVerificationOptions {
  setOAuthLoadingMessage: (message: string | null) => void;
  setLoginEmail: (email: string) => void;
}

export const useEmailVerification = ({
  setOAuthLoadingMessage,
  setLoginEmail,
}: UseEmailVerificationOptions) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const verificationToken = searchParams.get('verificationToken')?.trim() || '';
  const verificationEmailFromLink =
    searchParams.get('verificationEmail')?.trim().toLowerCase() || '';

  const [verificationRequiredEmail, setVerificationRequiredEmail] = useState('');
  const [isVerificationEmailSending, setIsVerificationEmailSending] = useState(false);

  const verificationTargetEmail = verificationEmailFromLink || verificationRequiredEmail;

  const clearVerificationSearchParams = useCallback(() => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('verificationToken');
    nextSearchParams.delete('verificationEmail');
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleResendVerificationEmail = useCallback(
    async (emailOverride?: string) => {
      const targetEmail = (emailOverride || verificationTargetEmail).trim().toLowerCase();

      if (!targetEmail) {
        enqueueSnackbar('인증 메일을 다시 보내려면 이메일을 먼저 입력해주세요.', {
          variant: 'warning',
        });
        return;
      }

      setIsVerificationEmailSending(true);

      try {
        const response = await apiFetch('/authentication/resend-verification-email', {
          method: 'POST',
          body: JSON.stringify({ email: targetEmail }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          message?: unknown;
          error?: unknown;
          code?: unknown;
          devVerificationLink?: unknown;
        };

        if (!response.ok) {
          enqueueSnackbar(getAuthErrorMessage(data.error, data.code), { variant: 'error' });
          return;
        }

        if (typeof data.devVerificationLink === 'string') {
          const linkUrl = new URL(data.devVerificationLink);
          const nextSearchParams = new URLSearchParams(searchParams);
          const linkToken = linkUrl.searchParams.get('verificationToken');
          const linkEmail = linkUrl.searchParams.get('verificationEmail');

          if (linkToken) {
            nextSearchParams.set('verificationToken', linkToken);
          }

          if (linkEmail) {
            nextSearchParams.set('verificationEmail', linkEmail);
            setLoginEmail(linkEmail);
            setVerificationRequiredEmail(linkEmail);
          }

          setSearchParams(nextSearchParams, { replace: true });
          enqueueSnackbar(
            '개발 환경 인증 링크를 적용했습니다. 이메일 인증을 자동으로 이어서 처리합니다.',
            { variant: 'info' },
          );
          return;
        }

        enqueueSnackbar(
          typeof data.message === 'string'
            ? data.message
            : '인증 메일을 다시 전송했습니다. 메일함을 확인해주세요.',
          { variant: 'success' },
        );
      } catch (error) {
        console.error('Resend verification email error:', error);
        enqueueSnackbar('인증 메일 재전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', {
          variant: 'error',
        });
      } finally {
        setIsVerificationEmailSending(false);
      }
    },
    [searchParams, setLoginEmail, setSearchParams, verificationTargetEmail],
  );

  useEffect(() => {
    const processEmailVerification = async () => {
      if (!verificationToken || !verificationEmailFromLink) {
        return;
      }

      setLoginEmail(verificationEmailFromLink);
      setOAuthLoadingMessage(EMAIL_VERIFICATION_LOADING_MESSAGE);

      try {
        const response = await apiFetch('/authentication/verify-email', {
          method: 'POST',
          body: JSON.stringify({
            email: verificationEmailFromLink,
            token: verificationToken,
          }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          message?: unknown;
          error?: unknown;
          code?: unknown;
        };

        if (!response.ok) {
          enqueueSnackbar(getAuthErrorMessage(data.error, data.code), { variant: 'error' });
          return;
        }

        enqueueSnackbar(
          typeof data.message === 'string'
            ? data.message
            : '이메일 인증이 완료되었습니다. 관리자 승인 후 로그인해주세요.',
          { variant: 'success' },
        );
      } catch (error) {
        console.error('Email verification error:', error);
        enqueueSnackbar('이메일 인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', {
          variant: 'error',
        });
      } finally {
        clearVerificationSearchParams();
        setVerificationRequiredEmail('');
        setOAuthLoadingMessage(null);
        navigate('/signin', { replace: true });
      }
    };

    if (verificationToken) {
      if (!verificationEmailFromLink) {
        enqueueSnackbar('이메일 인증 링크 정보가 올바르지 않습니다.', { variant: 'error' });
        clearVerificationSearchParams();
      } else {
        void processEmailVerification();
      }
    }
  }, [
    clearVerificationSearchParams,
    navigate,
    setLoginEmail,
    setOAuthLoadingMessage,
    verificationEmailFromLink,
    verificationToken,
  ]);

  const clearVerificationIfDifferentEmail = useCallback(
    (nextEmail: string) => {
      if (!verificationRequiredEmail) {
        return;
      }
      if (nextEmail.trim().toLowerCase() !== verificationRequiredEmail) {
        setVerificationRequiredEmail('');
      }
    },
    [verificationRequiredEmail],
  );

  return {
    verificationRequiredEmail,
    setVerificationRequiredEmail,
    verificationTargetEmail,
    isVerificationEmailSending,
    handleResendVerificationEmail,
    clearVerificationIfDifferentEmail,
  };
};
