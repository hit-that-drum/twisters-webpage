import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { clearAccessToken } from '../utils/authStorage';

export default function Home() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [allUsers, setAllUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (userId) {
          const response = await apiFetch('/authentication/me');
          const data = await response.json();

          if (!response.ok) {
            setUser(null);
            clearAccessToken();
            navigate('/signin', { replace: true });
            return;
          }

          setUser(data);

          if (String(data.id) !== userId) {
            navigate(`/${data.id}`, { replace: true });
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

    loadUsers();
  }, [navigate, userId]);

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
