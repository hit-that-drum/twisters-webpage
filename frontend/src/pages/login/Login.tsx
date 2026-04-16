import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import loginPageRightImage from '/login_page_right_image.png';
import { CircularProgress, Dialog, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import LoadingComponent from '@/common/LoadingComponent.tsx';
import { useAuth } from '@/features';
import { SiKakaotalk } from 'react-icons/si';

const WRONG_PASSWORD_ATTEMPTS_KEY = 'wrongPasswordAttemptsByEmail';
const MAX_WRONG_PASSWORD_ATTEMPTS = 5;
const KAKAO_OAUTH_STATE_KEY = 'kakaoOAuthState';
const KAKAO_OAUTH_PROCESSED_CODE_KEY = 'kakaoOAuthProcessedCode';
const GOOGLE_OAUTH_LOADING_MESSAGE = 'Google 로그인 정보를 확인하고 있어요. 잠시만 기다려주세요.';
const KAKAO_OAUTH_LOADING_MESSAGE = '카카오 로그인 정보를 확인하고 있어요. 잠시만 기다려주세요.';
const KAKAO_REDIRECT_LOADING_MESSAGE = '카카오 로그인 페이지로 이동하고 있어요. 잠시만 기다려주세요.';
const EMAIL_VERIFICATION_LOADING_MESSAGE = '이메일 인증 링크를 확인하고 있어요. 잠시만 기다려주세요.';
const VERIFICATION_REQUIRED_MESSAGE =
  '이메일 인증이 필요합니다. 가입 후 받은 메일의 인증 링크를 확인해주세요.';

type WrongPasswordAttemptsByEmail = Record<string, number>;

const decodeGoogleCredentialPayload = (credentialToken: string) => {
  const payloadToken = credentialToken.split('.')[1];
  if (!payloadToken) {
    return null;
  }

  try {
    const base64 = payloadToken.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(paddedBase64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (error) {
    console.error('Failed to decode Google credential payload:', error);
    return null;
  }
};

const logGoogleOAuthDebug = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const logKakaoOAuthDebug = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const createOAuthState = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const readWrongPasswordAttempts = (): WrongPasswordAttemptsByEmail => {
  try {
    const storedValue = localStorage.getItem(WRONG_PASSWORD_ATTEMPTS_KEY);
    if (!storedValue) {
      return {};
    }

    const parsedValue = JSON.parse(storedValue);
    if (!parsedValue || typeof parsedValue !== 'object') {
      return {};
    }

    return parsedValue as WrongPasswordAttemptsByEmail;
  } catch {
    return {};
  }
};

const writeWrongPasswordAttempts = (attempts: WrongPasswordAttemptsByEmail) => {
  localStorage.setItem(WRONG_PASSWORD_ATTEMPTS_KEY, JSON.stringify(attempts));
};

const increaseWrongPasswordAttempt = (email: string) => {
  const attempts = readWrongPasswordAttempts();
  const nextAttempts = (attempts[email] || 0) + 1;
  attempts[email] = nextAttempts;
  writeWrongPasswordAttempts(attempts);
  return nextAttempts;
};

const clearWrongPasswordAttempt = (email: string) => {
  if (!email) {
    return;
  }

  const attempts = readWrongPasswordAttempts();
  if (!(email in attempts)) {
    return;
  }

  delete attempts[email];
  writeWrongPasswordAttempts(attempts);
};

const getWrongPasswordAttempt = (email: string) => {
  if (!email) {
    return 0;
  }

  const attempts = readWrongPasswordAttempts();
  return attempts[email] || 0;
};

const getAuthErrorMessage = (error: unknown, code: unknown) => {
  if (code === 'ACCOUNT_PENDING_APPROVAL') {
    return '관리자 승인 대기 중입니다. 승인 후 로그인해주세요.';
  }

  if (code === 'EMAIL_VERIFICATION_REQUIRED') {
    return VERIFICATION_REQUIRED_MESSAGE;
  }

  if (code === 'EMAIL_VERIFICATION_EXPIRED') {
    return '이메일 인증 링크가 만료되었습니다. 인증 메일을 다시 보내주세요.';
  }

  if (code === 'INVALID_EMAIL_VERIFICATION_TOKEN') {
    return '유효하지 않은 이메일 인증 링크입니다. 인증 메일을 다시 보내주세요.';
  }

  if (code === 'EMAIL_VERIFICATION_EMAIL_MISMATCH') {
    return '인증 링크 정보가 일치하지 않습니다. 최신 인증 메일을 다시 열어주세요.';
  }

  if (code === 'EMAIL_ALREADY_VERIFIED') {
    return '이미 이메일 인증이 완료되었습니다. 관리자 승인 후 로그인해주세요.';
  }

  if (code === 'EMAIL_VERIFICATION_ALREADY_USED') {
    return '이미 사용된 이메일 인증 링크입니다. 필요하면 인증 메일을 다시 보내주세요.';
  }

  if (code === 'EMAIL_DELIVERY_FAILED') {
    return '인증 메일 전송에 실패했습니다. 잠시 후 다시 보내기를 시도해주세요.';
  }

  return typeof error === 'string' ? error : '알 수 없는 에러';
};

export default function Login({ isLogin }: { isLogin: boolean }) {
  const navigate = useNavigate();
  const { completeAuthSession, isAuthLoading, meInfo } = useAuth();
  const isGoogleOAuthEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const kakaoRestApiKey = import.meta.env.VITE_KAKAO_REST_API_KEY as string | undefined;
  const kakaoRedirectUri = import.meta.env.VITE_KAKAO_REDIRECT_URI as string | undefined;
  const resolvedKakaoRedirectUri =
    kakaoRedirectUri || `${window.location.origin}/auth/kakao/callback`;
  const isKakaoOAuthEnabled = Boolean(kakaoRestApiKey && kakaoRedirectUri);
  const [searchParams, setSearchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken')?.trim() || '';
  const resetEmailFromLink = searchParams.get('email')?.trim() || '';
  const verificationToken = searchParams.get('verificationToken')?.trim() || '';
  const verificationEmailFromLink = searchParams.get('verificationEmail')?.trim().toLowerCase() || '';
  const kakaoCode = searchParams.get('code')?.trim() || '';
  const kakaoState = searchParams.get('state')?.trim() || '';
  const kakaoError = searchParams.get('error')?.trim() || '';
  const kakaoErrorDescription = searchParams.get('error_description')?.trim() || '';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [resetFormData, setResetFormData] = useState({
    resetEmail: '',
    resetPassword: '',
  });
  const [rememberFor30Days, setRememberFor30Days] = useState(false);
  const [wrongPasswordAttemptCount, setWrongPasswordAttemptCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoadingMessage, setOAuthLoadingMessage] = useState<string | null>(
    kakaoCode ? KAKAO_OAUTH_LOADING_MESSAGE : null,
  );
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [isVerificationEmailSending, setIsVerificationEmailSending] = useState(false);
  const [verificationRequiredEmail, setVerificationRequiredEmail] = useState('');
  const normalizedLoginEmail = formData.email.trim().toLowerCase();
  const verificationTargetEmail = verificationEmailFromLink || verificationRequiredEmail;
  const remainingWrongPasswordAttempts = Math.max(
    MAX_WRONG_PASSWORD_ATTEMPTS - wrongPasswordAttemptCount,
    0,
  );
  const wrongPasswordIndicatorClassName =
    wrongPasswordAttemptCount >= MAX_WRONG_PASSWORD_ATTEMPTS - 1
      ? 'text-red-700'
      : wrongPasswordAttemptCount >= 3
        ? 'text-amber-700'
        : 'text-emerald-700';
  const isOAuthLoading = oauthLoadingMessage !== null;
  const isSubmitLoading = isSubmitting || isAuthLoading || isOAuthLoading;
  const submitLoadingMessage = isLogin
    ? '로그인 정보를 확인하고 있어요. 잠시만 기다려주세요.'
    : '회원가입을 처리하고 있어요. 잠시만 기다려주세요.';
  const activeLoadingMessage = oauthLoadingMessage ?? submitLoadingMessage;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      e.target.name === 'email' &&
      verificationRequiredEmail &&
      e.target.value.trim().toLowerCase() !== verificationRequiredEmail
    ) {
      setVerificationRequiredEmail('');
    }

    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [openForgotPasswordDialog, setOpenForgotPasswordDialog] = useState(false);

  const clearVerificationSearchParams = () => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('verificationToken');
    nextSearchParams.delete('verificationEmail');
    setSearchParams(nextSearchParams, { replace: true });
  };

  const handleResendVerificationEmail = async (emailOverride?: string) => {
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
          setFormData((previous) => ({ ...previous, email: linkEmail }));
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
  };

  useEffect(() => {
    if (resetToken) {
      setResetFormData((previous) => ({
        ...previous,
        resetEmail: resetEmailFromLink || previous.resetEmail,
      }));
      setOpenForgotPasswordDialog(true);
    }

    const processEmailVerification = async () => {
      if (!verificationToken || !verificationEmailFromLink) {
        return;
      }

      setFormData((previous) => ({
        ...previous,
        email: verificationEmailFromLink || previous.email,
      }));
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

    const processKakaoCode = async () => {
      if (!kakaoCode) {
        return;
      }

      setOAuthLoadingMessage(KAKAO_OAUTH_LOADING_MESSAGE);
      let shouldResetOAuthLoading = true;

      try {
        logKakaoOAuthDebug('[Kakao OAuth] Callback query params:', {
          code: kakaoCode,
          state: kakaoState,
          error: kakaoError,
          errorDescription: kakaoErrorDescription,
        });

        const lastProcessedCode = sessionStorage.getItem(KAKAO_OAUTH_PROCESSED_CODE_KEY);
        if (lastProcessedCode === kakaoCode) {
          logKakaoOAuthDebug('[Kakao OAuth] Skipping already processed code:', kakaoCode);
          return;
        }

        if (!isKakaoOAuthEnabled) {
          enqueueSnackbar('카카오 로그인 설정이 누락되었습니다.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        const expectedState = sessionStorage.getItem(KAKAO_OAUTH_STATE_KEY);
        logKakaoOAuthDebug('[Kakao OAuth] Expected state from sessionStorage:', expectedState);

        if (!expectedState || !kakaoState || expectedState !== kakaoState) {
          enqueueSnackbar('카카오 로그인 상태 검증에 실패했습니다. 다시 시도해주세요.', {
            variant: 'error',
          });
          navigate('/signin', { replace: true });
          return;
        }

        sessionStorage.removeItem(KAKAO_OAUTH_STATE_KEY);
        sessionStorage.setItem(KAKAO_OAUTH_PROCESSED_CODE_KEY, kakaoCode);

        logKakaoOAuthDebug('[Kakao OAuth] Exchange request payload:', {
          code: kakaoCode,
          redirectUri: resolvedKakaoRedirectUri,
        });

        const response = await apiFetch('/authentication/auth/kakao', {
          method: 'POST',
          body: JSON.stringify({
            code: kakaoCode,
            redirectUri: resolvedKakaoRedirectUri,
          }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          token?: unknown;
          refreshToken?: unknown;
          user?: { id?: unknown };
          userId?: unknown;
          error?: unknown;
          code?: unknown;
          kakaoUserInfo?: unknown;
        };

        logKakaoOAuthDebug('[Kakao OAuth] Backend auth response:', {
          status: response.status,
          ok: response.ok,
          data,
        });
        logKakaoOAuthDebug('[Kakao OAuth] Raw user info from Kakao:', data.kakaoUserInfo);

        if (!response.ok) {
          if (data.code === 'ACCOUNT_PENDING_APPROVAL') {
            enqueueSnackbar('관리자 승인 대기 중입니다. 승인 후 로그인해주세요.', {
              variant: 'warning',
            });
            navigate('/signin', { replace: true });
            return;
          }

          const errorMessage = typeof data.error === 'string' ? data.error : '알 수 없는 에러';
          enqueueSnackbar(`카카오 로그인 실패: ${errorMessage}`, { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        if (typeof data.token === 'string' && typeof data.refreshToken === 'string') {
          const authenticatedUser = await completeAuthSession(data.token, data.refreshToken, true);
          if (!authenticatedUser) {
            enqueueSnackbar('카카오 로그인 세션을 복구하지 못했습니다.', { variant: 'error' });
            navigate('/signin', { replace: true });
            return;
          }
        } else {
          enqueueSnackbar('카카오 로그인 성공 응답에 인증 토큰이 없습니다.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        const userIdx = data.user?.id ?? data.userId;
        if (!userIdx) {
          enqueueSnackbar('카카오 로그인 성공 응답에 사용자 ID가 없습니다.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar('카카오 로그인 성공!', { variant: 'success' });
        shouldResetOAuthLoading = false;
        navigate(`/${userIdx}`, { replace: true });
      } catch (error) {
        console.error('Kakao auth error:', error);
        enqueueSnackbar('카카오 로그인 처리 중 오류가 발생했습니다.', { variant: 'error' });
        navigate('/signin', { replace: true });
      } finally {
        if (shouldResetOAuthLoading) {
          setOAuthLoadingMessage(null);
        }
      }
    };

    if (verificationToken) {
      if (!verificationEmailFromLink) {
        enqueueSnackbar('이메일 인증 링크 정보가 올바르지 않습니다.', { variant: 'error' });
        clearVerificationSearchParams();
      } else {
        void processEmailVerification();
      }
      return;
    }

    if (kakaoCode) {
      void processKakaoCode();
      return;
    }

    if (kakaoError) {
      sessionStorage.removeItem(KAKAO_OAUTH_STATE_KEY);
      const kakaoErrorMessage = kakaoErrorDescription || kakaoError;
      logKakaoOAuthDebug('[Kakao OAuth] Callback error query params:', {
        error: kakaoError,
        errorDescription: kakaoErrorDescription,
      });
      enqueueSnackbar(`카카오 로그인 실패: ${kakaoErrorMessage}`, { variant: 'error' });
      navigate('/signin', { replace: true });
      return;
    }

  }, [
    completeAuthSession,
    isKakaoOAuthEnabled,
    kakaoCode,
    kakaoError,
    kakaoErrorDescription,
    kakaoState,
    navigate,
    resolvedKakaoRedirectUri,
    resetEmailFromLink,
    resetToken,
    searchParams,
    setSearchParams,
    verificationEmailFromLink,
    verificationToken,
  ]);

  useEffect(() => {
    if (isAuthLoading || !meInfo?.id) {
      return;
    }

    navigate(`/${meInfo.id}`, { replace: true });
  }, [isAuthLoading, meInfo?.id, navigate]);

  useEffect(() => {
    if (!isLogin || !normalizedLoginEmail) {
      setWrongPasswordAttemptCount(0);
      return;
    }

    setWrongPasswordAttemptCount(getWrongPasswordAttempt(normalizedLoginEmail));
  }, [isLogin, normalizedLoginEmail]);

  const handleForgotPassword = () => {
    setResetFormData((previous) => ({
      ...previous,
      resetEmail: resetEmailFromLink || formData.email || previous.resetEmail,
    }));
    setOpenForgotPasswordDialog(true);
  };

  const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResetFormData({ ...resetFormData, [e.target.name]: e.target.value });
  };

  const handleResetPassword = async () => {
    if (!resetFormData.resetEmail || !resetFormData.resetPassword) {
      enqueueSnackbar('이메일과 새 비밀번호를 입력해주세요.', { variant: 'error' });
      return;
    }

    const normalizedResetEmail = resetFormData.resetEmail.trim().toLowerCase();
    if (!normalizedResetEmail) {
      enqueueSnackbar('이메일 형식이 올바르지 않습니다.', { variant: 'error' });
      return;
    }

    setIsResetSubmitting(true);

    try {
      if (!resetToken) {
        const requestResetResponse = await apiFetch('/authentication/request-reset', {
          method: 'POST',
          body: JSON.stringify({
            email: normalizedResetEmail,
          }),
        });
        const requestResetData = await requestResetResponse.json();

        if (!requestResetResponse.ok) {
          enqueueSnackbar(`재설정 링크 요청 실패: ${requestResetData.error || '알 수 없는 에러'}`, {
            variant: 'error',
          });
          return;
        }

        if (requestResetData.devResetLink) {
          const linkUrl = new URL(requestResetData.devResetLink);
          const nextSearchParams = new URLSearchParams(searchParams);
          const linkToken = linkUrl.searchParams.get('resetToken');
          const linkEmail = linkUrl.searchParams.get('email');

          if (linkToken) {
            nextSearchParams.set('resetToken', linkToken);
          }
          if (linkEmail) {
            nextSearchParams.set('email', linkEmail);
            setResetFormData((previous) => ({ ...previous, resetEmail: linkEmail }));
          }

          setSearchParams(nextSearchParams, { replace: true });
          enqueueSnackbar(
            '개발 환경 재설정 링크를 적용했습니다. 다시 비밀번호 재설정을 눌러주세요.',
            {
              variant: 'info',
            },
          );
          return;
        }

        enqueueSnackbar(requestResetData.message || '비밀번호 재설정 링크를 이메일로 보냈습니다.', {
          variant: 'success',
        });
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isLogin) {
        if (!formData.email || !formData.password || (!isLogin && !formData.name)) {
          enqueueSnackbar('모든 필드를 입력해주세요.', { variant: 'error' });
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
              const authenticatedUser = await completeAuthSession(data.token, data.refreshToken, true);
              if (!authenticatedUser) {
                enqueueSnackbar('회원가입 직후 세션을 복구하지 못했습니다.', { variant: 'error' });
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
          if (data?.code === 'ACCOUNT_PENDING_APPROVAL' || data?.code === 'EMAIL_VERIFICATION_REQUIRED') {
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
              setResetFormData((previous) => ({
                ...previous,
                resetEmail: normalizedLoginEmail,
              }));
              setOpenForgotPasswordDialog(true);
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
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const googleToken = credentialResponse.credential;

    logGoogleOAuthDebug('[Google OAuth] Raw success response:', credentialResponse);

    if (!googleToken) {
      enqueueSnackbar('Google 토큰을 받지 못했습니다. 다시 시도해주세요.', { variant: 'error' });
      return;
    }

    const decodedCredentialPayload = decodeGoogleCredentialPayload(googleToken);
    logGoogleOAuthDebug('[Google OAuth] Decoded credential payload:', decodedCredentialPayload);

    setOAuthLoadingMessage(GOOGLE_OAUTH_LOADING_MESSAGE);
    let shouldResetOAuthLoading = true;

    try {
      const response = await apiFetch('/authentication/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: googleToken }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        token?: unknown;
        refreshToken?: unknown;
        user?: { id?: unknown };
        userId?: unknown;
        message?: unknown;
        error?: unknown;
        code?: unknown;
      };

      logGoogleOAuthDebug('[Google OAuth] Backend auth response:', data);

      if (!response.ok) {
        if (data.code === 'ACCOUNT_PENDING_APPROVAL' || data.code === 'EMAIL_VERIFICATION_REQUIRED') {
          enqueueSnackbar(getAuthErrorMessage(data.error, data.code), {
            variant: 'warning',
          });
          navigate('/signin');
          return;
        }

        const errorMessage = getAuthErrorMessage(data.error, data.code);
        enqueueSnackbar(`구글 로그인 실패: ${errorMessage}`, { variant: 'error' });
        return;
      }

      if (typeof data.token === 'string' && typeof data.refreshToken === 'string') {
        const authenticatedUser = await completeAuthSession(data.token, data.refreshToken, true);
        if (!authenticatedUser) {
          enqueueSnackbar('구글 로그인 세션을 복구하지 못했습니다.', { variant: 'error' });
          return;
        }
      } else {
        enqueueSnackbar('구글 로그인 성공 응답에 인증 토큰이 없습니다.', { variant: 'error' });
        return;
      }

      const userIdx = data.user?.id ?? data.userId;
      if (!userIdx) {
        enqueueSnackbar('구글 로그인 성공 응답에 사용자 ID가 없습니다.', { variant: 'error' });
        return;
      }

      enqueueSnackbar('구글 로그인 성공!', { variant: 'success' });
      shouldResetOAuthLoading = false;
      navigate(`/${userIdx}`);
    } catch (error) {
      console.error('Google auth error:', error);
      enqueueSnackbar('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', {
        variant: 'error',
      });
    } finally {
      if (shouldResetOAuthLoading) {
        setOAuthLoadingMessage(null);
      }
    }
  };

  const handleGoogleError = () => {
    enqueueSnackbar(
      'Google 로그인에 실패했습니다. Google Console의 Authorized JavaScript origins 설정을 확인해주세요.',
      {
        variant: 'error',
      },
    );
  };

  const handleKakaoLogin = () => {
    if (!isKakaoOAuthEnabled || !kakaoRestApiKey || !kakaoRedirectUri) {
      enqueueSnackbar('카카오 로그인을 사용하려면 설정이 필요합니다.', { variant: 'error' });
      return;
    }

    setOAuthLoadingMessage(KAKAO_REDIRECT_LOADING_MESSAGE);

    const oauthState = createOAuthState();
    sessionStorage.removeItem(KAKAO_OAUTH_PROCESSED_CODE_KEY);
    sessionStorage.setItem(KAKAO_OAUTH_STATE_KEY, oauthState);

    const authorizationParams = new URLSearchParams({
      client_id: kakaoRestApiKey,
      redirect_uri: kakaoRedirectUri,
      response_type: 'code',
      state: oauthState,
      scope: 'profile_nickname,profile_image',
    });

    const authorizationUrl = `https://kauth.kakao.com/oauth/authorize?${authorizationParams.toString()}`;
    logKakaoOAuthDebug('[Kakao OAuth] Authorize request:', {
      clientId: kakaoRestApiKey,
      redirectUri: kakaoRedirectUri,
      state: oauthState,
      scope: 'profile_nickname,profile_image',
      authorizationUrl,
    });

    window.location.href = authorizationUrl;
  };

  return (
    <>
      {isSubmitLoading ? (
        <>
          <LoadingComponent size={88} speed={1} />
          <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-6">
            <div
              className="mt-36 rounded-full bg-white/92 px-5 py-2 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-950/10 backdrop-blur-sm"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {activeLoadingMessage}
            </div>
          </div>
        </>
      ) : null}

      <div className="flex min-h-screen w-full items-center justify-center bg-white p-4 md:p-8">
        <div className="flex h-full w-full max-w-[1400px] min-h-[630px] overflow-hidden">
          {/* 왼쪽 영역 */}
          <div className="flex w-full flex-col justify-center px-6 md:w-1/2 lg:px-24">
            <div className="max-w-[400px]">
              <h2 className="font-grand-hotel mb-10 text-5xl font-bold tracking-tight text-gray-900">
                {isLogin ? 'COME ON!' : 'WELCOME!'}
              </h2>

              {isLogin && verificationTargetEmail ? (
                <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <p className="font-semibold">이메일 인증 안내</p>
                  <p className="mt-1 break-all text-xs text-emerald-800">
                    {verificationTargetEmail} 계정은 이메일 인증이 완료되어야 로그인할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    disabled={isVerificationEmailSending || isSubmitLoading}
                    onClick={() => void handleResendVerificationEmail()}
                    className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400"
                  >
                    {isVerificationEmailSending ? '인증 메일 재전송 중...' : '인증 메일 다시 보내기'}
                  </button>
                </div>
              ) : null}

              <form className="space-y-6" onSubmit={handleSubmit} aria-busy={isSubmitLoading}>
                {/* Name 필드: 회원가입 모드에서만 표시 */}
                {!isLogin && (
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-semibold text-gray-800"
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isSubmitLoading}
                      placeholder="Enter your name"
                      className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-blue-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                      required
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-800">
                    E-MAIL
                  </label>
                  <input
                    id="email"
                    type="email"
                     name="email"
                     value={formData.email}
                     onChange={handleChange}
                     disabled={isSubmitLoading}
                     placeholder="E-MAIL을 입력해주세요"
                     className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-blue-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                     required
                   />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    PASSWORD
                  </label>
                  <input
                    id="password"
                    type="password"
                     name="password"
                     value={formData.password}
                     onChange={handleChange}
                     disabled={isSubmitLoading}
                     placeholder="비밀번호를 입력해주세요(8-12자)"
                     className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-blue-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                     required
                   />
                </div>

                {isLogin && normalizedLoginEmail && wrongPasswordAttemptCount > 0 && (
                  <p className={`mt-2 text-xs font-medium ${wrongPasswordIndicatorClassName}`}>
                    Wrong password attempts: {wrongPasswordAttemptCount}/
                    {MAX_WRONG_PASSWORD_ATTEMPTS}
                    {' · '}비밀번호 자동 리셋 Remaining before auto reset:{' '}
                    {remainingWrongPasswordAttempts}
                  </p>
                )}

                {/* 추가된 영역: Remember me & Forgot Password */}
                {isLogin && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                         type="checkbox"
                         id="remember"
                         checked={rememberFor30Days}
                         disabled={isSubmitLoading}
                         onChange={(event) => setRememberFor30Days(event.target.checked)}
                         className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-green-700 disabled:cursor-not-allowed"
                       />
                      <label
                        htmlFor="remember"
                        className="text-xs font-medium text-gray-600 cursor-pointer"
                      >
                        30일 동안 기억하기
                      </label>
                    </div>
                     <button
                       type="button"
                       disabled={isSubmitLoading}
                       className="text-xs font-bold text-green-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                       onClick={handleForgotPassword}
                     >
                       비밀번호 재설정
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-4 text-sm font-bold text-white transition-all hover:bg-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-green-500 disabled:active:scale-100"
                >
                  {isSubmitLoading ? (
                    <>
                      <CircularProgress size={18} color="inherit" />
                      <span>{isLogin ? '로그인 중...' : '회원가입 중...'}</span>
                    </>
                  ) : (
                    <span>{isLogin ? '로그인' : '회원가입'}</span>
                  )}
                </button>
              </form>

              <div className="relative my-10 flex items-center justify-center">
                <div className="w-full border-t border-gray-200"></div>
                <span className="absolute bg-white px-4 text-xs text-gray-400">Or</span>
              </div>

              {/* Social Buttons */}
              <div
                className="flex flex-wrap items-center justify-center gap-3"
                aria-busy={isSubmitLoading}
              >
                {isGoogleOAuthEnabled ? isSubmitLoading ? (
                  <div className="inline-flex h-10 w-48 items-center justify-center rounded-sm border border-gray-200 bg-gray-100 px-4 text-sm font-semibold text-gray-500">
                    Google 로그인 대기 중...
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    width="192"
                  />
                ) : (
                  <p className="w-full text-center text-xs text-gray-400">
                    Google 로그인을 사용하려면 `VITE_GOOGLE_CLIENT_ID` 설정이 필요합니다.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleKakaoLogin}
                  disabled={isSubmitLoading || !isKakaoOAuthEnabled}
                  className="inline-flex h-10 w-48 items-center justify-center gap-2 rounded-sm bg-[#FEE500] px-4 text-sm font-semibold text-[#191919] transition hover:bg-[#fada0a] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                >
                  <SiKakaotalk size={20} />
                  <span>카카오로 로그인</span>
                </button>

                {!isKakaoOAuthEnabled && (
                  <p className="w-full text-center text-xs text-gray-400">
                    Kakao 로그인을 사용하려면 `VITE_KAKAO_REST_API_KEY`, `VITE_KAKAO_REDIRECT_URI`
                    설정이 필요합니다.
                  </p>
                )}
              </div>

              {/* Footer: 클릭 시 모드 전환 */}
              <p className="mt-10 text-center text-sm text-gray-600">
                {isLogin ? '아직 가입하지 않으셨나요?' : '가입하셨나요?'}{' '}
                <button
                  type="button"
                  onClick={() => navigate(isLogin ? '/signup' : '/signin')}
                  disabled={isSubmitLoading}
                  className="font-bold text-green-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLogin ? '회원가입' : '로그인'}
                </button>
              </p>
            </div>
          </div>

          {/* 오른쪽 영역 */}
          <div className="hidden w-1/2 p-4 md:block">
            <div
              className="h-full w-full rounded-[48px] bg-cover bg-center transition-all duration-500"
              style={{
                backgroundImage: `url(${loginPageRightImage})`,
                backgroundColor: 'var(--twister-grey-100)',
              }}
            >
              <div className="h-full w-full rounded-[48px] bg-black/5"></div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={openForgotPasswordDialog}
        onClose={() => setOpenForgotPasswordDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>비밀번호 재설정</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {resetToken
              ? '토큰이 확인되었습니다. 이메일과 새 비밀번호를 입력해 재설정을 완료하세요.'
              : '가입한 이메일을 입력하면 재설정 링크를 발송합니다. 개발 환경에서는 링크가 자동 적용됩니다.'}
          </DialogContentText>
          <div className="mt-4 mb-4">
            <label htmlFor="resetEmail" className="mb-2 block text-sm font-semibold text-gray-800">
              Email address
            </label>
            <input
              id="resetEmail"
              type="email"
              name="resetEmail"
              value={resetFormData.resetEmail}
              onChange={handleResetChange}
              placeholder="Enter your email"
              className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-blue-700 focus:outline-none"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="resetPassword"
              className="mb-2 block text-sm font-semibold text-gray-800"
            >
              New password
            </label>
            <input
              id="resetPassword"
              type="password"
              name="resetPassword"
              value={resetFormData.resetPassword}
              onChange={handleResetChange}
              placeholder="Enter your new password"
              className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-blue-700 focus:outline-none"
              required
            />
          </div>
          <button
            type="button"
            disabled={isResetSubmitting}
            className="mt-4 w-full rounded-xl bg-blue-700 py-4 text-sm font-bold text-white transition-all hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleResetPassword}
          >
            {isResetSubmitting ? '처리 중...' : '비밀번호 재설정'}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
