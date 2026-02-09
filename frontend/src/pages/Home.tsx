import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function Home() {
  const { userId } = useParams();
  const [allUsers, setAllUsers] = useState<{ name: string; email: string }[]>([]);
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (userId) {
          const response = await apiFetch(`/authentication/users?userId=${userId}`);
          const data = await response.json();
          setUser(data);
          return;
        }

        const response = await apiFetch('/authentication/users');
        const data = await response.json();
        setAllUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    loadUsers();
  }, [userId]);

  return (
    <div>
      {user ? (
        <>
          <h2>User ID: {user.id}</h2>
          <p>User Name: {user.name}</p>
        </>
      ) : (
        <>
          {allUsers.map((item) => (
            <div key={item.email}>
              <h2>{item.name}</h2>
              <p>{item.email}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
