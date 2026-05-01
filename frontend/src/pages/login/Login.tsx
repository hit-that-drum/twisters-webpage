import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginPageRightImage from '/login_page_right_image.png';
import LoadingComponent from '@/common/LoadingComponent.tsx';
import { useAuth } from '@/features';
import { KAKAO_OAUTH_LOADING_MESSAGE } from '@/pages/login/lib/loadingMessages';
import LoginFormFields from '@/pages/login/LoginFormFields';
import LoginPasswordResetDialog from '@/pages/login/LoginPasswordResetDialog';
import LoginSocialButtons from '@/pages/login/LoginSocialButtons';
import LoginVerificationBanner from '@/pages/login/LoginVerificationBanner';
import { useAuthSubmit } from '@/pages/login/hooks/useAuthSubmit';
import { useEmailVerification } from '@/pages/login/hooks/useEmailVerification';
import { useGoogleOAuth } from '@/pages/login/hooks/useGoogleOAuth';
import { useKakaoOAuth } from '@/pages/login/hooks/useKakaoOAuth';
import { usePasswordReset } from '@/pages/login/hooks/usePasswordReset';

export default function Login({ isLogin }: { isLogin: boolean }) {
  const navigate = useNavigate();
  const { isAuthLoading, meInfo } = useAuth();
  const isGoogleOAuthEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const kakaoCodeSearchParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('code')?.trim() || ''
      : '';
  const [oauthLoadingMessage, setOAuthLoadingMessage] = useState<string | null>(
    kakaoCodeSearchParam ? KAKAO_OAUTH_LOADING_MESSAGE : null,
  );

  // Refs break circular dependencies between hooks that need each other's setters.
  const openForResetRef = useRef<(opts: { email: string }) => void>(() => {});
  const setFormEmailRef = useRef<(email: string) => void>(() => {});
  const setVerificationRequiredEmailRef = useRef<(email: string) => void>(() => {});
  const clearVerificationIfDifferentEmailRef = useRef<(email: string) => void>(() => {});

  const openForReset = useCallback(
    (opts: { email: string }) => openForResetRef.current(opts),
    [],
  );
  const setLoginEmail = useCallback((email: string) => setFormEmailRef.current(email), []);
  const setVerificationRequiredEmail = useCallback(
    (email: string) => setVerificationRequiredEmailRef.current(email),
    [],
  );
  const clearVerificationIfDifferentEmail = useCallback(
    (email: string) => clearVerificationIfDifferentEmailRef.current(email),
    [],
  );

  const emailVerification = useEmailVerification({ setOAuthLoadingMessage, setLoginEmail });
  const authSubmit = useAuthSubmit({
    isLogin,
    openForReset,
    setVerificationRequiredEmail,
    clearVerificationIfDifferentEmail,
  });
  const passwordReset = usePasswordReset({ loginEmail: authSubmit.formData.email });
  const googleOAuth = useGoogleOAuth({ setOAuthLoadingMessage });
  const kakaoOAuth = useKakaoOAuth({ setOAuthLoadingMessage });

  useLayoutEffect(() => {
    setFormEmailRef.current = authSubmit.setFormEmail;
    setVerificationRequiredEmailRef.current = emailVerification.setVerificationRequiredEmail;
    clearVerificationIfDifferentEmailRef.current =
      emailVerification.clearVerificationIfDifferentEmail;
    openForResetRef.current = passwordReset.openForReset;
  }, [
    authSubmit.setFormEmail,
    emailVerification.clearVerificationIfDifferentEmail,
    emailVerification.setVerificationRequiredEmail,
    passwordReset.openForReset,
  ]);

  const isOAuthLoading = oauthLoadingMessage !== null;
  const isSubmitLoading = authSubmit.isSubmitting || isAuthLoading || isOAuthLoading;
  const submitLoadingMessage = isLogin
    ? '로그인 정보를 확인하고 있어요. 잠시만 기다려주세요.'
    : '회원가입을 처리하고 있어요. 잠시만 기다려주세요.';
  const activeLoadingMessage = oauthLoadingMessage ?? submitLoadingMessage;

  useEffect(() => {
    if (isAuthLoading || !meInfo?.id) {
      return;
    }
    navigate(`/${meInfo.id}`, { replace: true });
  }, [isAuthLoading, meInfo?.id, navigate]);

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

              {isLogin && emailVerification.verificationTargetEmail ? (
                <LoginVerificationBanner
                  verificationTargetEmail={emailVerification.verificationTargetEmail}
                  isVerificationEmailSending={emailVerification.isVerificationEmailSending}
                  disabled={isSubmitLoading}
                  onResend={() => void emailVerification.handleResendVerificationEmail()}
                />
              ) : null}

              <LoginFormFields
                isLogin={isLogin}
                formData={authSubmit.formData}
                onChange={authSubmit.handleChange}
                onSubmit={authSubmit.handleSubmit}
                isSubmitLoading={isSubmitLoading}
                normalizedLoginEmail={authSubmit.normalizedLoginEmail}
                wrongPasswordAttemptCount={authSubmit.wrongPasswordAttemptCount}
                rememberFor30Days={authSubmit.rememberFor30Days}
                setRememberFor30Days={authSubmit.setRememberFor30Days}
                onForgotPassword={passwordReset.handleForgotPassword}
              />

              <div className="relative my-10 flex items-center justify-center">
                <div className="w-full border-t border-gray-200"></div>
                <span className="absolute bg-white px-4 text-xs text-gray-400">Or</span>
              </div>

              <LoginSocialButtons
                isSubmitLoading={isSubmitLoading}
                isGoogleOAuthEnabled={isGoogleOAuthEnabled}
                isKakaoOAuthEnabled={kakaoOAuth.isKakaoOAuthEnabled}
                onGoogleSuccess={googleOAuth.handleGoogleSuccess}
                onGoogleError={googleOAuth.handleGoogleError}
                onKakaoLogin={kakaoOAuth.handleKakaoLogin}
              />

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

      <LoginPasswordResetDialog
        open={passwordReset.openForgotPasswordDialog}
        onClose={passwordReset.closeForgotPasswordDialog}
        isResetLinkFlow={passwordReset.isResetLinkFlow}
        isResetSubmitting={passwordReset.isResetSubmitting}
        resetEmail={passwordReset.resetFormData.resetEmail}
        resetPassword={passwordReset.resetFormData.resetPassword}
        onResetChange={passwordReset.handleResetChange}
        onResetPassword={passwordReset.handleResetPassword}
      />
    </>
  );
}
