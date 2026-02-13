import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { clearAccessToken } from '../utils/authStorage';
import { type MeInfo, useAuth } from '../contexts/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { meInfo, isAuthLoading } = useAuth();
  const [allUsers, setAllUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [user, setUser] = useState<MeInfo | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (userId) {
          if (isAuthLoading) {
            return;
          }

          if (!meInfo) {
            setUser(null);
            clearAccessToken();
            navigate('/signin', { replace: true });
            return;
          }

          setUser(meInfo);

          if (String(meInfo.id) !== userId) {
            navigate(`/${meInfo.id}`, { replace: true });
          }

          return;
        }

        const response = await apiFetch('/authentication/users');
        const data = await response.json();

        if (!response.ok) {
          setAllUsers([]);
          clearAccessToken();
          navigate('/signin', { replace: true });
          return;
        }

        setAllUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    void loadUsers();
  }, [isAuthLoading, meInfo, navigate, userId]);

  return (
    <div className="p-6">
      {user ? (
        <>
          <h2>User ID: {user.id}</h2>
          <p>User Name: {user.name}</p>
        </>
      ) : (
        <>
          {allUsers.map((item) => (
            <div key={item.id}>
              <h2>{item.name}</h2>
              <p>{item.email}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
