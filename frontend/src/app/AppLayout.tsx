import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Footer from '@/common/components/Footer';
import Header from '@/common/components/Header';
import { useAuth } from '@/features';
import { getAccessToken } from '@/common/lib/auth/authStorage';

export default function AppLayout() {
  const navigate = useNavigate();
  const { isAuthLoading, isAuthenticated, logout, refreshMeInfo } = useAuth();
  const accessToken = getAccessToken();

  useEffect(() => {
    if (accessToken && !isAuthenticated) {
      void refreshMeInfo();
    }
  }, [accessToken, isAuthenticated, refreshMeInfo]);

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  if (isAuthLoading || (accessToken && !isAuthenticated)) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm font-semibold tracking-wide text-gray-600">
          Checking your session...
        </p>
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

      <main className="flex-1 px-6 pb-6">
        <div className="mx-auto w-full max-w-7xl rounded-2xl border border-gray-200 bg-white">
          <Outlet />
        </div>
      </main>

      <div className="px-6 pb-4">
        <Footer />
      </div>
    </div>
  );
}
