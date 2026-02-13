import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Footer from './Footer';
import Header from './Header';
import { apiFetch } from '../utils/api';
import { clearAccessToken, getAccessToken } from '../utils/authStorage';

export default function AppLayout() {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verifyAuthentication = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await apiFetch('/authentication/me');
        if (!response.ok) {
          clearAccessToken();
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication verification failed:', error);
        clearAccessToken();
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    void verifyAuthentication();
  }, []);

  const handleLogout = () => {
    clearAccessToken();
    setIsAuthenticated(false);
    navigate('/signin', { replace: true });
  };

  if (isCheckingAuth) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm font-semibold tracking-wide text-gray-600">Checking your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="px-6 pt-6">
        <Header handleLogout={handleLogout} />
      </div>

      <main className="flex-1">
        <Outlet />
      </main>

      <div className="px-6 pb-4">
        <Footer />
      </div>
    </div>
  );
}
