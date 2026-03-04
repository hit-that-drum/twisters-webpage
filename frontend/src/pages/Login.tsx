import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// import { FcGoogle } from 'react-icons/fc';
// import { SiKakaotalk } from 'react-icons/si';
import loginPageRightImage from '../../public/login_page_right_image.png';
import { Dialog, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '../utils/api';
import { clearAccessToken, getAccessToken, setAccessToken, setAuthTokens } from '../utils/authStorage';
import { useAuth } from '../contexts/AuthContext';

const WRONG_PASSWORD_ATTEMPTS_KEY = 'wrongPasswordAttemptsByEmail';
const MAX_WRONG_PASSWORD_ATTEMPTS = 5;

type WrongPasswordAttemptsByEmail = Record<string, number>;

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

export const Login = ({ isLogin }: { isLogin: boolean }) => {
  const navigate = useNavigate();
  const { refreshMeInfo } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken')?.trim() || '';
  const resetEmailFromLink = searchParams.get('email')?.trim() || '';
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
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const normalizedLoginEmail = formData.email.trim().toLowerCase();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [openForgotPasswordDialog, setOpenForgotPasswordDialog] = useState(false);

  useEffect(() => {
    if (resetToken) {
      setResetFormData((previous) => ({
        ...previous,
        resetEmail: resetEmailFromLink || previous.resetEmail,
      }));
      setOpenForgotPasswordDialog(true);
      return;
    }

    const autoSignIn = async () => {
      const token = getAccessToken();
      if (!token) {
        return;
      }

      try {
        const response = await apiFetch('/authentication/me');
        if (!response.ok) {
          clearAccessToken();
          return;
        }

        const data = await response.json();
        if (data?.id) {
          navigate(`/${data.id}`, { replace: true });
        }
      } catch (error) {
        console.error('Auto sign-in error:', error);
      }
    };

    autoSignIn();
  }, [navigate, resetEmailFromLink, resetToken]);

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

        const data = await response.json();

        if (response.ok) {
          if (typeof data.token === 'string' && typeof data.refreshToken === 'string') {
            setAuthTokens(data.token, data.refreshToken, true);
            await refreshMeInfo();
          } else if (typeof data.token === 'string') {
            setAccessToken(data.token, true);
            await refreshMeInfo();
          }

          const userIdx = data.user?.id ?? data.userId;
          if (!userIdx) {
            enqueueSnackbar('회원가입 성공 응답에 사용자 ID가 없습니다.', { variant: 'error' });
            return;
          }

          enqueueSnackbar('회원가입 성공!', { variant: 'success' });
          navigate(`/${userIdx}`);
        } else {
          enqueueSnackbar(`회원가입 실패: ${data.error || '알 수 없는 에러'}`, {
            variant: 'error',
          });
        }
      } catch (error) {
        console.error('Error:', error);
        enqueueSnackbar('서버와 연결할 수 없습니다. 백엔드가 켜져 있는지 확인하세요.', {
          variant: 'error',
        });
      }
    } else {
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

          if (typeof data.token === 'string' && typeof data.refreshToken === 'string') {
            setAuthTokens(data.token, data.refreshToken, rememberFor30Days);
            await refreshMeInfo();
          } else if (typeof data.token === 'string') {
            setAccessToken(data.token, rememberFor30Days);
            await refreshMeInfo();
          }

          const userIdx = data.user?.id ?? data.userId;
          if (!userIdx) {
            enqueueSnackbar('로그인 성공 응답에 사용자 ID가 없습니다.', { variant: 'error' });
            return;
          }

          enqueueSnackbar('로그인 성공!', { variant: 'success' });
          navigate(`/${userIdx}`);
        } else {
          const errorMessage = data.error || '알 수 없는 에러';
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
    }
  };

  return (
    <>
      <div className="flex min-h-screen w-full items-center justify-center bg-white p-4 md:p-8">
        <div className="flex h-full w-full max-w-[1400px] min-h-[630px] overflow-hidden">
          {/* 왼쪽 영역 */}
          <div className="flex w-full flex-col justify-center px-6 md:w-1/2 lg:px-24">
            <div className="max-w-[400px]">
              <h2 className="mb-10 text-4xl font-bold tracking-tight text-gray-900">
                {isLogin ? 'Welcome Back!' : 'Get Started Now!'}
              </h2>

              <form className="space-y-6" onSubmit={handleSubmit}>
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
                      placeholder="Enter your name"
                      className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-blue-700 focus:outline-none"
                      required
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-800">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-blue-700 focus:outline-none"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-blue-700 focus:outline-none"
                    required
                  />
                </div>

                {isLogin && normalizedLoginEmail && wrongPasswordAttemptCount > 0 && (
                  <p className={`mt-2 text-xs font-medium ${wrongPasswordIndicatorClassName}`}>
                    Wrong password attempts: {wrongPasswordAttemptCount}/
                    {MAX_WRONG_PASSWORD_ATTEMPTS}
                    {' · '}Remaining before auto reset: {remainingWrongPasswordAttempts}
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
                        onChange={(event) => setRememberFor30Days(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 accent-blue-700 cursor-pointer"
                      />
                      <label
                        htmlFor="remember"
                        className="text-xs font-medium text-gray-600 cursor-pointer"
                      >
                        Remember for 30 days
                      </label>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold text-blue-600 hover:underline"
                      onClick={handleForgotPassword}
                    >
                      Forgot password
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-700 py-4 text-sm font-bold text-white transition-all hover:bg-blue-800 active:scale-[0.98]"
                >
                  {isLogin ? 'Sign In' : 'Signup'}
                </button>
              </form>

              <div className="relative my-10 flex items-center justify-center">
                <div className="w-full border-t border-gray-200"></div>
                <span className="absolute bg-white px-4 text-xs text-gray-400">Or</span>
              </div>

              {/* Social Buttons */}
              {/* <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.log('Google Login Error')}
                  containerProps={{
                    className:
                      'flex w-full items-center justify-center space-x-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50',
                  }}
                /> */}
              {/* <button className="flex w-full items-center justify-center space-x-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50">
                  <FcGoogle size={22} />
                  <span>Sign in with Google</span>
                </button> */}
              {/* <button
                  type="button"
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#191919] transition hover:bg-[#fada0a]"
                >
                  <SiKakaotalk size={22} />
                  <span>Sign in with Kakao</span>
                </button>
              </div> */}

              {/* Footer: 클릭 시 모드 전환 */}
              <p className="mt-10 text-center text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : 'Have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => navigate(isLogin ? '/signup' : '/signin')}
                  className="font-bold text-blue-600 hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
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
};
