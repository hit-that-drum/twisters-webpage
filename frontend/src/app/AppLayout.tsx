import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Footer from '@/common/components/Footer';
import Header from '@/common/components/Header';
import { useAuth } from '@/features';
import LoadingComponent from '@/common/LoadingComponent.tsx';

export default function AppLayout() {
  const navigate = useNavigate();
  const { meInfo, isAuthLoading, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  if (isAuthLoading) {
    return <LoadingComponent />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="px-3 pt-3 md:px-6 md:pt-6">
        <Header handleLogout={handleLogout} />
      </div>

      {meInfo?.isTest && (
        <div className="px-3 pb-3 pt-1 md:px-6 md:pb-4">
          <div className="mx-auto w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold tracking-wide text-amber-900 md:px-4 md:py-3 md:text-sm">
            TEST MODE
          </div>
        </div>
      )}

      <main className="flex-1 px-3 pb-3 md:px-6 md:pb-6">
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
