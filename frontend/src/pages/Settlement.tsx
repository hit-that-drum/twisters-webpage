import { useAuth } from '../contexts/AuthContext';

export default function Settlement() {
  const { meInfo } = useAuth();

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Settlement</h1>
      {meInfo && (
        <p className="mt-2 text-sm text-gray-600">
          {meInfo.name} ({meInfo.email})
        </p>
      )}
    </div>
  );
}
