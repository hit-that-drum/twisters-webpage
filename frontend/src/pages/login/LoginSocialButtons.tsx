import { useEffect, useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { SiKakaotalk } from 'react-icons/si';

export interface LoginSocialButtonsProps {
  isSubmitLoading: boolean;
  isGoogleOAuthEnabled: boolean;
  isKakaoOAuthEnabled: boolean;
  onGoogleSuccess: (credentialResponse: CredentialResponse) => void;
  onGoogleError: () => void;
  onKakaoLogin: () => void;
}

// Tailwind `md` breakpoint = 768px
const MD_BREAKPOINT_QUERY = '(min-width: 768px)';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(MD_BREAKPOINT_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(MD_BREAKPOINT_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}

export default function LoginSocialButtons({
  isSubmitLoading,
  isGoogleOAuthEnabled,
  isKakaoOAuthEnabled,
  onGoogleSuccess,
  onGoogleError,
  onKakaoLogin,
}: LoginSocialButtonsProps) {
  const isDesktop = useIsDesktop();

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-3"
      aria-busy={isSubmitLoading}
    >
      {isGoogleOAuthEnabled ? isSubmitLoading ? (
        <div
          className={
            isDesktop
              ? 'inline-flex h-10 w-48 items-center justify-center rounded-sm border border-gray-200 bg-gray-100 px-4 text-sm font-semibold text-gray-500'
              : 'inline-flex h-10 w-12 items-center justify-center rounded-sm border border-gray-200 bg-gray-100 text-xs text-gray-500'
          }
        >
          {isDesktop ? 'Google 로그인 대기 중...' : '···'}
        </div>
      ) : (
        isDesktop ? (
          <GoogleLogin
            key="gsi-desktop"
            onSuccess={onGoogleSuccess}
            onError={onGoogleError}
            width="192"
          />
        ) : (
          <div className="google-icon-mobile inline-flex h-10 w-12 items-center justify-center overflow-hidden rounded-sm border border-gray-200 bg-white">
            <style>{`
              .google-icon-mobile .nsm7Bb-HzV7m-LgbsSe-Bz112c {
                width: 40px !important;
                height: 38px !important;
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
              }
              .google-icon-mobile .nsm7Bb-HzV7m-LgbsSe {
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
              }
            `}</style>
            <GoogleLogin
              key="gsi-mobile"
              onSuccess={onGoogleSuccess}
              onError={onGoogleError}
              type="icon"
              shape="rectangular"
              size="large"
            />
          </div>
        )
      ) : (
        <p className="w-full text-center text-xs text-gray-400">
          Google 로그인을 사용하려면 `VITE_GOOGLE_CLIENT_ID` 설정이 필요합니다.
        </p>
      )}

      <button
        type="button"
        onClick={onKakaoLogin}
        disabled={isSubmitLoading || !isKakaoOAuthEnabled}
        aria-label="카카오로 로그인"
        className="inline-flex h-10 w-12 items-center justify-center rounded-sm bg-[#FEE500] text-sm font-semibold text-[#191919] transition hover:bg-[#fada0a] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 md:w-48 md:gap-2 md:px-4"
      >
        <SiKakaotalk size={20} />
        <span className="hidden md:inline">카카오로 로그인</span>
      </button>

      {!isKakaoOAuthEnabled && (
        <p className="w-full text-center text-xs text-gray-400">
          Kakao 로그인을 사용하려면 `VITE_KAKAO_REST_API_KEY`, `VITE_KAKAO_REDIRECT_URI`
          설정이 필요합니다.
        </p>
      )}
    </div>
  );
}
