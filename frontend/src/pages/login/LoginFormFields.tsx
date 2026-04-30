import React from 'react';
import { CircularProgress } from '@mui/material';
import PasswordField from '@/common/components/PasswordField';
import { MAX_WRONG_PASSWORD_ATTEMPTS } from '@/pages/login/lib/wrongPasswordAttempts';

interface LoginFormFieldsProps {
  isLogin: boolean;
  formData: { name: string; email: string; password: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitLoading: boolean;
  normalizedLoginEmail: string;
  wrongPasswordAttemptCount: number;
  rememberFor30Days: boolean;
  setRememberFor30Days: (value: boolean) => void;
  onForgotPassword: () => void;
}

export default function LoginFormFields({
  isLogin,
  formData,
  onChange,
  onSubmit,
  isSubmitLoading,
  normalizedLoginEmail,
  wrongPasswordAttemptCount,
  rememberFor30Days,
  setRememberFor30Days,
  onForgotPassword,
}: LoginFormFieldsProps) {
  const remainingWrongPasswordAttempts = Math.max(
    MAX_WRONG_PASSWORD_ATTEMPTS - wrongPasswordAttemptCount,
    0,
  );
  const wrongPasswordIndicatorClassName =
    wrongPasswordAttemptCount >= MAX_WRONG_PASSWORD_ATTEMPTS - 1
      ? 'text-red-700'
      : wrongPasswordAttemptCount >= 3
        ? 'text-amber-700'
        : 'text-emerald-700';

  return (
    <form className="space-y-6" onSubmit={onSubmit} aria-busy={isSubmitLoading}>
      {!isLogin && (
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-semibold text-gray-800">
            NAME
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={onChange}
            disabled={isSubmitLoading}
            placeholder="이름을 입력해주세요"
            className="auth-input auth-input-reset"
            required
          />
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-800">
          E-MAIL
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={onChange}
          disabled={isSubmitLoading}
          placeholder="E-MAIL을 입력해주세요"
          className="auth-input auth-input-reset"
          required
        />
      </div>

      <div>
        <PasswordField
          id="password"
          name="password"
          label="PASSWORD"
          value={formData.password}
          onChange={onChange}
          disabled={isSubmitLoading}
          placeholder="비밀번호를 입력해주세요"
          showValidation={!isLogin}
        />
      </div>

      {isLogin && normalizedLoginEmail && wrongPasswordAttemptCount > 0 && (
        <p className={`mt-2 text-xs font-medium ${wrongPasswordIndicatorClassName}`}>
          Wrong password attempts: {wrongPasswordAttemptCount}/{MAX_WRONG_PASSWORD_ATTEMPTS}
          {' · '}비밀번호 자동 리셋 Remaining before auto reset: {remainingWrongPasswordAttempts}
        </p>
      )}

      {isLogin && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberFor30Days}
              disabled={isSubmitLoading}
              onChange={(event) => setRememberFor30Days(event.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-green-700 disabled:cursor-not-allowed"
            />
            <label
              htmlFor="remember"
              className="text-xs font-medium text-gray-600 cursor-pointer"
            >
              30일 동안 기억하기
            </label>
          </div>
          <button
            type="button"
            disabled={isSubmitLoading}
            className="text-xs font-bold text-green-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onForgotPassword}
          >
            비밀번호 재설정
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-4 text-sm font-bold text-white transition-all hover:bg-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-green-500 disabled:active:scale-100"
      >
        {isSubmitLoading ? (
          <>
            <CircularProgress size={18} color="inherit" />
            <span>{isLogin ? '로그인 중...' : '회원가입 중...'}</span>
          </>
        ) : (
          <span>{isLogin ? '로그인' : '회원가입'}</span>
        )}
      </button>
    </form>
  );
}
