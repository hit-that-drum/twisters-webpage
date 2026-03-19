import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@/app/AppLayout';
import { useAuth } from '@/features';
import { getAccessToken } from '@/common/lib/auth/authStorage';
import { AdminPage, Board, Home, Login, Member, MyPage, Notice, Settlement } from '@/pages';
import Flowchart from '@/pages/flowchart/Flowchart';

function RootRedirect() {
  const { meInfo, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm font-semibold tracking-wide text-gray-600">
          Checking your session...
        </p>
      </div>
    );
  }

  if (meInfo) {
    return <Navigate to={`/${meInfo.id}`} replace />;
  }

  return <Navigate to={getAccessToken() ? '/signin' : '/signup'} replace />;
}

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/signup" element={<Login isLogin={false} />} />
        <Route path="/signin" element={<Login isLogin />} />
        <Route path="/auth/kakao/callback" element={<Login isLogin />} />

        <Route element={<AppLayout />}>
          <Route path="/:userId" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/member" element={<Member />} />
          <Route path="/notice" element={<Notice />} />
          <Route path="/settlement" element={<Settlement />} />
          <Route path="/board" element={<Board />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/flowchart" element={<Flowchart />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
