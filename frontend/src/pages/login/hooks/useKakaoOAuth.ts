import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { useAuth } from '@/features';
import {
  createOAuthState,
  KAKAO_OAUTH_PROCESSED_CODE_KEY,
  KAKAO_OAUTH_STATE_KEY,
  logKakaoOAuthDebug,
} from '@/pages/login/lib/oauthHelpers';
import {
  KAKAO_OAUTH_LOADING_MESSAGE,
  KAKAO_REDIRECT_LOADING_MESSAGE,
} from '@/pages/login/lib/loadingMessages';

interface UseKakaoOAuthOptions {
  setOAuthLoadingMessage: (message: string | null) => void;
}

export const useKakaoOAuth = ({ setOAuthLoadingMessage }: UseKakaoOAuthOptions) => {
  const navigate = useNavigate();
  const { completeAuthSession } = useAuth();
  const [searchParams] = useSearchParams();

  const kakaoRestApiKey = import.meta.env.VITE_KAKAO_REST_API_KEY as string | undefined;
  const kakaoRedirectUri = import.meta.env.VITE_KAKAO_REDIRECT_URI as string | undefined;
  const resolvedKakaoRedirectUri =
    kakaoRedirectUri || `${window.location.origin}/auth/kakao/callback`;
  const isKakaoOAuthEnabled = Boolean(kakaoRestApiKey && kakaoRedirectUri);

  const kakaoCode = searchParams.get('code')?.trim() || '';
  const kakaoState = searchParams.get('state')?.trim() || '';
  const kakaoError = searchParams.get('error')?.trim() || '';
  const kakaoErrorDescription = searchParams.get('error_description')?.trim() || '';

  useEffect(() => {
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
    setOAuthLoadingMessage,
  ]);

  const handleKakaoLogin = useCallback(() => {
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
  }, [isKakaoOAuthEnabled, kakaoRedirectUri, kakaoRestApiKey, setOAuthLoadingMessage]);

  return {
    isKakaoOAuthEnabled,
    handleKakaoLogin,
  };
};
