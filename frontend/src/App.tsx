import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import Home from './pages/Home';
import Notice from './pages/Notice';
import Settlement from './pages/Settlement';
import MyPage from './pages/MyPage';
import AppLayout from './components/AppLayout';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthProvider';
import { getAccessToken } from './utils/authStorage';

function RootRedirect() {
  const { meInfo, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm font-semibold tracking-wide text-gray-600">Checking your session...</p>
      </div>
    );
  }

  if (meInfo) {
    return <Navigate to={`/${meInfo.id}`} replace />;
  }

  return <Navigate to={getAccessToken() ? '/signin' : '/signup'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/signup" element={<Login isLogin={false} />} />
          <Route path="/signin" element={<Login isLogin={true} />} />

          <Route element={<AppLayout />}>
            <Route path="/:userId" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/notice" element={<Notice />} />
            <Route path="/settlement" element={<Settlement />} />
            <Route path="/mypage" element={<MyPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
