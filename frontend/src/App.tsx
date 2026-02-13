import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import Home from './pages/Home';
import Notice from './pages/Notice';
import Settlement from './pages/Settlement';
import MyPage from './pages/MyPage';
import AppLayout from './components/AppLayout';
import { apiFetch } from './utils/api';
import { clearAccessToken, getAccessToken } from './utils/authStorage';

function RootRedirect() {
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    const resolveRedirect = async () => {
      const token = getAccessToken();
      if (!token) {
        setRedirectPath('/signup');
        return;
      }

      try {
        const response = await apiFetch('/authentication/me');
        if (!response.ok) {
          clearAccessToken();
          setRedirectPath('/signin');
          return;
        }

        const data = await response.json();
        if (data?.id) {
          setRedirectPath(`/${data.id}`);
          return;
        }

        clearAccessToken();
        setRedirectPath('/signin');
      } catch {
        clearAccessToken();
        setRedirectPath('/signin');
      }
    };

    resolveRedirect();
  }, []);

  if (!redirectPath) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm font-semibold tracking-wide text-gray-600">Checking your session...</p>
      </div>
    );
  }

  return <Navigate to={redirectPath} replace />;
}

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/signup" element={<Login isLogin={false} />} />
            <Route path="/signin" element={<Login isLogin={true} />} />
            <Route path="/:userId" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/notice" element={<Notice />} />
            <Route path="/settlement" element={<Settlement />} />
            <Route path="/mypage" element={<MyPage />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
