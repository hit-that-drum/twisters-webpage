import { useAuth } from '@/features';

export default function Mypage() {
  const { meInfo } = useAuth();

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">My Page</h1>
      {meInfo && (
        <>
          <p className="mt-2 text-sm text-gray-600">Name: {meInfo.name}</p>
          <p className="text-sm text-gray-600">Email: {meInfo.email}</p>
          <p className="text-sm text-gray-600">Admin: {meInfo.isAdmin ? 'Yes' : 'No'}</p>
        </>
      )}
    </div>
  );
}
