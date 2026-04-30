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

export default function LoginSocialButtons({
  isSubmitLoading,
  isGoogleOAuthEnabled,
  isKakaoOAuthEnabled,
  onGoogleSuccess,
  onGoogleError,
  onKakaoLogin,
}: LoginSocialButtonsProps) {
  return (
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
          onSuccess={onGoogleSuccess}
          onError={onGoogleError}
          width="192"
        />
      ) : (
        <p className="w-full text-center text-xs text-gray-400">
          Google 로그인을 사용하려면 `VITE_GOOGLE_CLIENT_ID` 설정이 필요합니다.
        </p>
      )}

      <button
        type="button"
        onClick={onKakaoLogin}
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
  );
}
