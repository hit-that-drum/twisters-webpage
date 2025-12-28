// import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';

function App() {
  // const [users, setUsers] = useState([]);

  // useEffect(() => {
  //   fetch('http://localhost:5050/api/users')
  //     .then((response) => response.json())
  //     .then((data) => setUsers(data))
  //     .catch((error) => console.error('Error fetching users:', error));
  // }, []);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login isLogin={false} />} />
          <Route path="/signin" element={<Login isLogin={true} />} />
        </Routes>
      </Router>
      {/* {users.map((user: { id: string; name: string; email: string }) => (
        <div key={user.id}>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      ))} */}
    </>
  );
}

export default App;
