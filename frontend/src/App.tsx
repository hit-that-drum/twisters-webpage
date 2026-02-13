import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import Home from './pages/Home';
import Notice from './pages/Notice';
import Settlement from './pages/Settlement';
import Mypage from './pages/Mypage';
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
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <p className="text-sm font-semibold tracking-wide text-gray-600">
          Checking your session...
        </p>
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
          <Route path="/" element={<RootRedirect />} />
          <Route path="/signup" element={<Login isLogin={false} />} />
          <Route path="/signin" element={<Login isLogin={true} />} />
          <Route path="/:userId" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/notice" element={<Notice />} />
          <Route path="/settlement" element={<Settlement />} />
          <Route path="/mypage" element={<Mypage />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
