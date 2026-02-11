import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/signup" />} />
          <Route path="/signup" element={<Login isLogin={false} />} />
          <Route path="/signin" element={<Login isLogin={true} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/:userId" element={<Home />} />
          <Route path="/home" element={<Home />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
