import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/features';

/**
 * Shared 401-handler for the admin page hooks. Logs the user out, surfaces a
 * snackbar, and bounces to the sign-in page. Factored out so every API call
 * in the admin page reacts to session expiry consistently.
 */
export default function useExpiredSession() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return useCallback(() => {
    logout();
    enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
    navigate('/signin', { replace: true });
  }, [logout, navigate]);
}
