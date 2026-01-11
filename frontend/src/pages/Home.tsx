import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Home() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const [allUsers, setAllUsers] = useState<{ name: string; email: string }[]>([]);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (userId) {
      fetch(`http://localhost:5050/authentication/users?userId=${userId}`)
        .then((response) => response.json())
        .then((data) => {
          setUser(data);
        })
        .catch((error) => console.error('Error fetching users:', error));
    } else {
      fetch('http://localhost:5050/authentication/users')
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
