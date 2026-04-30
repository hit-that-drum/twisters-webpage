import { useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiCheck, FiCheckCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import {
  evaluatePasswordPolicy,
  type PasswordPolicyEvaluation,
} from '@/common/lib/passwordPolicy';

interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showValidation?: boolean;
}

const getInputTone = (
  hasValue: boolean,
  validation: PasswordPolicyEvaluation,
  showValidation: boolean,
  isFocused: boolean,
) => {
  if (!isFocused) {
    return {
      labelClassName: 'text-gray-800',
      borderClassName: 'border-gray-300',
      iconClassName: 'text-slate-400',
    };
  }

  if (showValidation && hasValue && !validation.isValid) {
    return {
      labelClassName: 'text-rose-600',
      borderClassName: 'border-rose-500 ring-2 ring-rose-100',
      iconClassName: 'text-rose-400',
    };
  }

  return {
    labelClassName: 'text-blue-600',
    borderClassName: 'border-blue-700 ring-2 ring-blue-100',
    iconClassName: 'text-slate-400',
  };
};

const RuleStatus = ({ passed, label, nested = false }: { passed: boolean; label: string; nested?: boolean }) => {
  return (
    <li className={`flex items-start gap-2 ${nested ? 'ml-6' : ''}`}>
      <span className={`mt-0.5 text-base ${passed ? 'text-emerald-600' : 'text-slate-500'}`} aria-hidden="true">
        {passed ? <FiCheck /> : '•'}
      </span>
      <span className={passed ? 'text-emerald-700' : 'text-slate-700'}>{label}</span>
    </li>
  );
};

export default function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  showValidation = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const validation = useMemo(() => evaluatePasswordPolicy(value), [value]);
  const hasValue = value.length > 0;
  const tone = getInputTone(hasValue, validation, showValidation, isFocused);

  return (
    <div>
      <label htmlFor={id} className={`mb-2 block text-sm font-semibold ${tone.labelClassName}`}>
        {label}
        {required ? '*' : ''}
      </label>

      <div
        ref={containerRef}
        onFocus={() => setIsFocused(true)}
        onBlur={(event) => {
          const nextFocusedElement = event.relatedTarget;
          if (nextFocusedElement instanceof Node && containerRef.current?.contains(nextFocusedElement)) {
            return;
          }

          setIsFocused(false);
        }}
        className={`flex items-center rounded-xl border bg-white px-4 py-3 transition-all ${tone.borderClassName} ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
      >
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          aria-invalid={showValidation && hasValue && !validation.isValid}
          className="auth-input-reset w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-500"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowPassword((previous) => !previous)}
          className={`ml-3 inline-flex items-center justify-center rounded-full p-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:hover:bg-transparent ${tone.iconClassName}`}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>

      {showValidation ? (
        <div className="mt-4 space-y-4">
          {hasValue && !validation.isValid ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-600">
              <FiAlertCircle className="shrink-0" />
              <span>비밀번호가 안전하지 않습니다.</span>
            </div>
          ) : null}

          {hasValue && validation.isValid ? (
            <div className="flex items-center gap-3 rounded-md border border-slate-300 bg-white px-5 py-4 text-lg text-slate-800 shadow-sm">
              <FiCheckCircle className="shrink-0 text-3xl text-emerald-600" />
              <span className="font-medium">Success!</span>
            </div>
          ) : null}

          <div className="rounded-md border border-slate-300 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
            <p className="mb-3 font-medium text-slate-800">* 비밀번호 규칙</p>
            <ul className="space-y-2">
              <RuleStatus passed={validation.hasMinimumLength} label="최소 8자리 이상" />
              <RuleStatus
                passed={validation.hasEnoughCharacterTypes}
                label="최소 3개 이상의 규칙을 만족:"
              />
              <RuleStatus passed={validation.categoryFlags.hasLowercase} label="소문자 포함 (a-z)" nested />
              <RuleStatus passed={validation.categoryFlags.hasUppercase} label="대문자 포함 (A-Z)" nested />
              <RuleStatus passed={validation.categoryFlags.hasNumber} label="숫자 포함 (0-9)" nested />
              <RuleStatus
                passed={validation.categoryFlags.hasSpecialCharacter}
                label="특수문자 포함 (ex. !@#$%^&*)"
                nested
              />
              <RuleStatus
                passed={hasValue && validation.hasNoTripleRepeat}
                label="같은 문자는 3번 이상 반복 불가"
              />
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
