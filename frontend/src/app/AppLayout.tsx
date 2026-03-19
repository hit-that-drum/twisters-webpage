import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Footer from '@/common/components/Footer';
import Header from '@/common/components/Header';
import { useAuth } from '@/features';
import { getAccessToken } from '@/common/lib/auth/authStorage';

export default function AppLayout() {
  const navigate = useNavigate();
  const { meInfo, isAuthLoading, isAuthenticated, logout, refreshMeInfo } = useAuth();
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

      {meInfo?.isTest && (
        <div className="px-6 pb-4 pt-1">
          <div className="mx-auto w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold tracking-wide text-amber-900">
            TEST MODE: Showing isolated TEST data for notice, member, settlement, and board.
          </div>
        </div>
      )}

      <main className="flex-1 px-6 pb-6">
        <div className="mx-auto w-full rounded-2xl border border-gray-200 bg-white">
          <Outlet />
        </div>
      </main>

      <div>
        <Footer />
      </div>
    </div>
  );
}
