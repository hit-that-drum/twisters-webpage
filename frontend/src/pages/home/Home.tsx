import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type MeInfo } from '@/entities/user/types';
import { useAuth } from '@/features';
import { apiFetch } from '@/common/lib/api/apiClient';
import { clearAccessToken } from '@/common/lib/auth/authStorage';
import ResumeHomeForTestUser from './ResumeHomeForTestUser';

export default function Home() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { meInfo, isAuthLoading } = useAuth();
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
        // const data = await response.json();

        if (!response.ok) {
          clearAccessToken();
          navigate('/signin', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    void loadUsers();
  }, [isAuthLoading, meInfo, navigate, userId]);

  return (
    <div className={user?.isTest ? '' : 'p-6'}>
      {user?.isTest ? (
        <ResumeHomeForTestUser />
      ) : (
        <>
          <h2>User ID: {user?.id}</h2>
          <p>User Name: {user?.name}</p>
        </>
      )}
    </div>
  );
}
