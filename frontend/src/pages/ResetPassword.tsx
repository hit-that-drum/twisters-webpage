import { useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
      enqueueSnackbar('모든 필드를 입력해주세요.', { variant: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      enqueueSnackbar('비밀번호가 일치하지 않습니다.', { variant: 'error' });
      return;
    }

    if (!localStorage.getItem('token')) {
      enqueueSnackbar('로그인 후 비밀번호를 변경할 수 있습니다.', { variant: 'error' });
      navigate('/signin');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/authentication/reset-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        enqueueSnackbar(`비밀번호 재설정 실패: ${data.error || '알 수 없는 에러'}`, {
          variant: 'error',
        });
        if (response.status === 401) {
          navigate('/signin');
        }
        return;
      }

      enqueueSnackbar('비밀번호가 성공적으로 변경되었습니다.', { variant: 'success' });
      navigate('/signin');
    } catch (error) {
      console.error('Password reset error:', error);
      enqueueSnackbar('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">비밀번호 변경</h1>
        <p className="mb-6 text-sm text-gray-600">JWT 인증 토큰으로 현재 계정의 비밀번호를 변경합니다.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-gray-800">
              새 비밀번호
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-green-700 focus:outline-none"
              placeholder="새 비밀번호를 입력하세요"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-gray-800">
              새 비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-green-700 focus:outline-none"
              placeholder="새 비밀번호를 다시 입력하세요"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#3D5A2D] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2d4321] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  );
}
