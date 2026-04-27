import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { type CredentialResponse } from '@react-oauth/google';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { useAuth } from '@/features';
import { getAuthErrorMessage } from '@/pages/login/lib/authErrorMessages';
import {
  decodeGoogleCredentialPayload,
  logGoogleOAuthDebug,
} from '@/pages/login/lib/oauthHelpers';
import { GOOGLE_OAUTH_LOADING_MESSAGE } from '@/pages/login/lib/loadingMessages';

interface UseGoogleOAuthOptions {
  setOAuthLoadingMessage: (message: string | null) => void;
}

export const useGoogleOAuth = ({ setOAuthLoadingMessage }: UseGoogleOAuthOptions) => {
  const navigate = useNavigate();
  const { completeAuthSession } = useAuth();

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
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
          if (
            data.code === 'ACCOUNT_PENDING_APPROVAL' ||
            data.code === 'EMAIL_VERIFICATION_REQUIRED'
          ) {
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
    },
    [completeAuthSession, navigate, setOAuthLoadingMessage],
  );

  const handleGoogleError = useCallback(() => {
    enqueueSnackbar(
      'Google 로그인에 실패했습니다. Google Console의 Authorized JavaScript origins 설정을 확인해주세요.',
      {
        variant: 'error',
      },
    );
  }, []);

  return { handleGoogleSuccess, handleGoogleError };
};
