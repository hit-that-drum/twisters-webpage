import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import {
  evaluatePasswordPolicy,
  PASSWORD_POLICY_ERROR_MESSAGE,
} from '@/common/lib/passwordPolicy';
import { useAuth } from '@/features';
import { getAuthErrorMessage } from '@/pages/login/lib/authErrorMessages';
import {
  clearWrongPasswordAttempt,
  getWrongPasswordAttempt,
  increaseWrongPasswordAttempt,
  MAX_WRONG_PASSWORD_ATTEMPTS,
} from '@/pages/login/lib/wrongPasswordAttempts';

interface UseAuthSubmitOptions {
  isLogin: boolean;
  openForReset: (opts: { email: string }) => void;
  setVerificationRequiredEmail: (email: string) => void;
  clearVerificationIfDifferentEmail: (nextEmail: string) => void;
}

export const useAuthSubmit = ({
  isLogin,
  openForReset,
  setVerificationRequiredEmail,
  clearVerificationIfDifferentEmail,
}: UseAuthSubmitOptions) => {
  const navigate = useNavigate();
  const { completeAuthSession } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [rememberFor30Days, setRememberFor30Days] = useState(false);
  const [wrongPasswordAttemptCount, setWrongPasswordAttemptCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedLoginEmail = formData.email.trim().toLowerCase();
  const signupPasswordEvaluation = evaluatePasswordPolicy(formData.password);

  const setFormEmail = useCallback((email: string) => {
    setFormData((previous) => ({ ...previous, email }));
  }, []);

  useEffect(() => {
    if (!isLogin || !normalizedLoginEmail) {
      setWrongPasswordAttemptCount(0);
      return;
    }

    setWrongPasswordAttemptCount(getWrongPasswordAttempt(normalizedLoginEmail));
  }, [isLogin, normalizedLoginEmail]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.name === 'email') {
        clearVerificationIfDifferentEmail(e.target.value);
      }

      setFormData((previous) => ({ ...previous, [e.target.name]: e.target.value }));
    },
    [clearVerificationIfDifferentEmail],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);

      try {
        if (!isLogin) {
          if (!formData.email || !formData.password || !formData.name) {
            enqueueSnackbar('모든 필드를 입력해주세요.', { variant: 'error' });
            return;
          }

          if (!signupPasswordEvaluation.isValid) {
            enqueueSnackbar(PASSWORD_POLICY_ERROR_MESSAGE, { variant: 'error' });
            return;
          }

          try {
            const response = await apiFetch('/authentication/signup', {
              method: 'POST',
              body: JSON.stringify(formData),
            });

            const data = (await response.json().catch(() => ({}))) as {
              status?: unknown;
              message?: unknown;
              error?: unknown;
              code?: unknown;
              devVerificationLink?: unknown;
              token?: unknown;
              refreshToken?: unknown;
              user?: { id?: unknown };
              userId?: unknown;
            };

            if (response.ok) {
              if (data?.status === 'pending') {
                if (typeof data.devVerificationLink === 'string') {
                  const linkUrl = new URL(data.devVerificationLink);
                  const nextSearchParams = new URLSearchParams();
                  const linkToken = linkUrl.searchParams.get('verificationToken');
                  const linkEmail = linkUrl.searchParams.get('verificationEmail');

                  if (linkToken) {
                    nextSearchParams.set('verificationToken', linkToken);
                  }

                  if (linkEmail) {
                    nextSearchParams.set('verificationEmail', linkEmail);
                    setVerificationRequiredEmail(linkEmail);
                  }

                  enqueueSnackbar(
                    '회원가입이 완료되었습니다. 개발 환경 인증 링크를 자동으로 적용해 이메일 인증을 이어서 처리합니다.',
                    { variant: 'info' },
                  );
                  navigate(`/signin?${nextSearchParams.toString()}`);
                  return;
                }

                enqueueSnackbar(
                  typeof data.message === 'string'
                    ? data.message
                    : '회원가입이 완료되었습니다. 이메일 인증과 관리자 승인 후 로그인하실 수 있습니다.',
                  { variant: 'success' },
                );
                navigate('/signin');
                return;
              }

              if (typeof data.token === 'string' && typeof data.refreshToken === 'string') {
                const authenticatedUser = await completeAuthSession(
                  data.token,
                  data.refreshToken,
                  true,
                );
                if (!authenticatedUser) {
                  enqueueSnackbar('회원가입 직후 세션을 복구하지 못했습니다.', {
                    variant: 'error',
                  });
                  return;
                }
              } else {
                enqueueSnackbar('회원가입 성공 응답에 인증 토큰이 없습니다.', { variant: 'error' });
                return;
              }

              const userIdx = data.user?.id ?? data.userId;
              if (!userIdx) {
                enqueueSnackbar('회원가입 성공 응답에 사용자 ID가 없습니다.', { variant: 'error' });
                return;
              }

              enqueueSnackbar('회원가입 성공!', { variant: 'success' });
              navigate(`/${userIdx}`);
            } else {
              if (data.code === 'EMAIL_DELIVERY_FAILED' && normalizedLoginEmail) {
                enqueueSnackbar(
                  typeof data.error === 'string'
                    ? data.error
                    : '회원가입은 완료되었지만 인증 메일 전송에 실패했습니다. 로그인 화면에서 재전송을 시도해주세요.',
                  { variant: 'warning' },
                );
                navigate(`/signin?verificationEmail=${encodeURIComponent(normalizedLoginEmail)}`);
                return;
              }

              enqueueSnackbar(`회원가입 실패: ${getAuthErrorMessage(data.error, data.code)}`, {
                variant: 'error',
              });
            }
          } catch (error) {
            console.error('Error:', error);
            enqueueSnackbar('서버와 연결할 수 없습니다. 백엔드가 켜져 있는지 확인하세요.', {
              variant: 'error',
            });
          }
          return;
        }

        if (!formData.email || !formData.password) {
          enqueueSnackbar('모든 필드를 입력해주세요.', { variant: 'error' });
          return;
        }

        try {
          const response = await apiFetch('/authentication/signin', {
            method: 'POST',
            body: JSON.stringify({
              ...formData,
              rememberMe: rememberFor30Days,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            clearWrongPasswordAttempt(normalizedLoginEmail);
            setWrongPasswordAttemptCount(0);
            setVerificationRequiredEmail('');

            if (typeof data.token === 'string' && typeof data.refreshToken === 'string') {
              const authenticatedUser = await completeAuthSession(
                data.token,
                data.refreshToken,
                rememberFor30Days,
              );
              if (!authenticatedUser) {
                enqueueSnackbar('로그인 세션을 복구하지 못했습니다.', { variant: 'error' });
                return;
              }
            } else {
              enqueueSnackbar('로그인 성공 응답에 인증 토큰이 없습니다.', { variant: 'error' });
              return;
            }

            const userIdx = data.user?.id ?? data.userId;
            if (!userIdx) {
              enqueueSnackbar('로그인 성공 응답에 사용자 ID가 없습니다.', { variant: 'error' });
              return;
            }

            enqueueSnackbar('로그인 성공!', { variant: 'success' });
            navigate(`/${userIdx}`);
          } else {
            if (
              data?.code === 'ACCOUNT_PENDING_APPROVAL' ||
              data?.code === 'EMAIL_VERIFICATION_REQUIRED'
            ) {
              if (data?.code === 'EMAIL_VERIFICATION_REQUIRED' && normalizedLoginEmail) {
                setVerificationRequiredEmail(normalizedLoginEmail);
              }
              enqueueSnackbar(getAuthErrorMessage(data.error, data.code), {
                variant: data.code === 'EMAIL_VERIFICATION_REQUIRED' ? 'warning' : 'warning',
              });
              return;
            }

            const errorMessage = getAuthErrorMessage(data.error, data.code);
            enqueueSnackbar(`로그인 실패: ${errorMessage}`, { variant: 'error' });

            const normalizedErrorMessage =
              typeof errorMessage === 'string' ? errorMessage.toLowerCase() : '';

            if (
              normalizedLoginEmail &&
              (normalizedErrorMessage.includes('incorrect password') ||
                normalizedErrorMessage.includes('wrong password') ||
                (typeof errorMessage === 'string' && errorMessage.includes('비밀번호')))
            ) {
              const wrongPasswordAttempts = increaseWrongPasswordAttempt(normalizedLoginEmail);
              setWrongPasswordAttemptCount(wrongPasswordAttempts);

              if (wrongPasswordAttempts >= MAX_WRONG_PASSWORD_ATTEMPTS) {
                clearWrongPasswordAttempt(normalizedLoginEmail);
                setWrongPasswordAttemptCount(0);
                openForReset({ email: normalizedLoginEmail });
                enqueueSnackbar('비밀번호를 5회 연속 틀려 비밀번호 재설정 창을 열었습니다.', {
                  variant: 'warning',
                });
              }
            }
          }
        } catch (error) {
          console.error('Error:', error);
          enqueueSnackbar('서버와 연결할 수 없습니다. 백엔드가 켜져 있는지 확인하세요.', {
            variant: 'error',
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      completeAuthSession,
      formData,
      isLogin,
      isSubmitting,
      navigate,
      normalizedLoginEmail,
      openForReset,
      rememberFor30Days,
      setVerificationRequiredEmail,
      signupPasswordEvaluation.isValid,
    ],
  );

  return {
    formData,
    setFormEmail,
    handleChange,
    rememberFor30Days,
    setRememberFor30Days,
    wrongPasswordAttemptCount,
    isSubmitting,
    signupPasswordEvaluation,
    normalizedLoginEmail,
    handleSubmit,
  };
};
