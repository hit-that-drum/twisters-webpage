import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Home() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const [allUsers, setAllUsers] = useState<{ name: string; email: string }[]>([]);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (userId) {
      fetch(`${import.meta.env.VITE_API_BASE_URL}/authentication/users?userId=${userId}`)
        .then((response) => response.json())
        .then((data) => {
          setUser(data);
        })
        .catch((error) => console.error('Error fetching users:', error));
    } else {
      fetch(`${import.meta.env.VITE_API_BASE_URL}/authentication/users`)
        .then((response) => response.json())
        .then((data) => {
          setAllUsers(data);
        })
        .catch((error) => console.error('Error fetching users:', error));
    }
  }, [userId]);

  return (
    <div>
      {user ? (
        <>
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
        </>
      ) : (
        <>
          {allUsers.map((user) => (
            <div key={user.name}>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
