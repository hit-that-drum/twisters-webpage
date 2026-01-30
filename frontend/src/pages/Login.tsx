import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { FcGoogle } from 'react-icons/fc';
import { SiKakaotalk } from 'react-icons/si';
import loginPageRightImage from '../../public/login_page_right_image.png';
import { Dialog, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

const Login: React.FC<{ isLogin: boolean }> = ({ isLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    resetEmail: '',
    resetPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [openForgotPasswordDialog, setOpenForgotPasswordDialog] = useState(false);
  const handleForgotPassword = () => {
    setOpenForgotPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    if (!formData.resetEmail || !formData.resetPassword) {
      enqueueSnackbar('모든 필드를 입력해주세요.', { variant: 'error' });
      return;
    }
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/authentication/resetpassword`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.resetEmail,
          password: formData.resetPassword,
        }),
      },
    );
    const data = await response.json();
    if (response.ok) {
      enqueueSnackbar('비밀번호 재설정 성공!', { variant: 'success' });
      setOpenForgotPasswordDialog(false);
    } else {
      enqueueSnackbar(`비밀번호 재설정 실패: ${data.error || '알 수 없는 에러'}`, {
        variant: 'error',
      });
      setOpenForgotPasswordDialog(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin) {
      if (!formData.email || !formData.password || (!isLogin && !formData.name)) {
        enqueueSnackbar('모든 필드를 입력해주세요.', { variant: 'error' });
        return;
      }
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/authentication/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          enqueueSnackbar('회원가입 성공!', { variant: 'success' });
          navigate(`/home?userId=${data.userId}`);
        } else {
          enqueueSnackbar(`회원가입 실패: ${data.error || '알 수 없는 에러'}`, {
            variant: 'error',
          });
        }
      } catch (error) {
        console.error('Error:', error);
        enqueueSnackbar('서버와 연결할 수 없습니다. 백엔드가 켜져 있는지 확인하세요.', {
          variant: 'error',
        });
      }
    } else {
      if (!formData.email || !formData.password) {
        enqueueSnackbar('모든 필드를 입력해주세요.', { variant: 'error' });
        return;
      }
      console.log('formData:', formData);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/authentication/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        console.log('response:', response);
        const data = await response.json();
        console.log('data:', data);
        if (response.ok) {
          enqueueSnackbar('로그인 성공!', { variant: 'success' });
          navigate(`/home?userId=${data.userId}`);
        } else {
          enqueueSnackbar(`로그인 실패: ${data.error || '알 수 없는 에러'}`, { variant: 'error' });
        }
      } catch (error) {
        console.error('Error:', error);
        enqueueSnackbar('서버와 연결할 수 없습니다. 백엔드가 켜져 있는지 확인하세요.', {
          variant: 'error',
        });
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    // 구글이 준 ID 토큰을 백엔드로 전송합니다.
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/authentication/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: credentialResponse.credential }),
    });
    const data = await res.json();
    console.log('로그인 성공:', data);
  };

  return (
    <>
      <div className="flex min-h-screen w-full items-center justify-center bg-white p-4 md:p-8">
        <div className="flex h-full w-full max-w-[1400px] min-h-[630px] overflow-hidden">
          {/* 왼쪽 영역 */}
          <div className="flex w-full flex-col justify-center px-6 md:w-1/2 lg:px-24">
            <div className="max-w-[400px]">
              <h2 className="mb-10 text-4xl font-bold tracking-tight text-gray-900">
                {isLogin ? 'Welcome Back!' : 'Get Started Now!'}
              </h2>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Name 필드: 회원가입 모드에서만 표시 */}
                {!isLogin && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-green-700 focus:outline-none"
                      required
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-green-700 focus:outline-none"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-green-700 focus:outline-none"
                    required
                  />
                </div>

                {/* 추가된 영역: Remember me & Forgot Password */}
                {isLogin && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="remember"
                        className="h-4 w-4 rounded border-gray-300 accent-[#3D5A2D] cursor-pointer"
                      />
                      <label
                        htmlFor="remember"
                        className="text-xs font-medium text-gray-600 cursor-pointer"
                      >
                        Remember for 30 days
                      </label>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold text-[#1a73e8] hover:underline"
                      onClick={handleForgotPassword}
                    >
                      Forgot password
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#3D5A2D] py-4 text-sm font-bold text-white transition-all hover:bg-[#2d4321] active:scale-[0.98]"
                >
                  {isLogin ? 'Sign In' : 'Signup'}
                </button>
              </form>

              <div className="relative my-10 flex items-center justify-center">
                <div className="w-full border-t border-gray-200"></div>
                <span className="absolute bg-white px-4 text-xs text-gray-400">Or</span>
              </div>

              {/* Social Buttons */}
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.log('Google Login Error')}
                  containerProps={{
                    className:
                      'flex w-full items-center justify-center space-x-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50',
                  }}
                />
                {/* <button className="flex w-full items-center justify-center space-x-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50">
                  <FcGoogle size={22} />
                  <span>Sign in with Google</span>
                </button> */}
                <button className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#191919] transition hover:bg-[#fada0a]">
                  <SiKakaotalk size={22} />
                  <span>Sign in with Kakao</span>
                </button>
              </div>

              {/* Footer: 클릭 시 모드 전환 */}
              <p className="mt-10 text-center text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : 'Have an account?'}{' '}
                <span
                  onClick={() => navigate(isLogin ? '/signup' : '/signin')}
                  className="cursor-pointer font-bold text-[#1a73e8] hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>

          {/* 오른쪽 영역 */}
          <div className="hidden w-1/2 p-4 md:block">
            <div
              className="h-full w-full rounded-[48px] bg-cover bg-center transition-all duration-500"
              style={{
                backgroundImage: `url(${loginPageRightImage})`,
                backgroundColor: '#f3f4f6',
              }}
            >
              <div className="h-full w-full rounded-[48px] bg-black/5"></div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={openForgotPasswordDialog}
        onClose={() => setOpenForgotPasswordDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>비밀번호 재설정</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Email address
              </label>
              <input
                type="email"
                name="resetEmail"
                value={formData.resetEmail}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-green-700 focus:outline-none"
                required
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-800">Password</label>
              <input
                type="password"
                name="resetPassword"
                value={formData.resetPassword}
                onChange={handleChange}
                placeholder="Password"
                className="w-full rounded-xl border border-gray-300 p-3.5 text-sm transition-all focus:border-green-700 focus:outline-none"
                required
              />
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-[#3D5A2D] py-4 text-sm font-bold text-white transition-all hover:bg-[#2d4321] active:scale-[0.98]"
              onClick={handleResetPassword}
            >
              비밀번호 재설정
            </button>
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Login;
