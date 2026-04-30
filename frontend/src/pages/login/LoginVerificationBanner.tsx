interface LoginVerificationBannerProps {
  verificationTargetEmail: string;
  isVerificationEmailSending: boolean;
  disabled: boolean;
  onResend: () => void;
}

export default function LoginVerificationBanner({
  verificationTargetEmail,
  isVerificationEmailSending,
  disabled,
  onResend,
}: LoginVerificationBannerProps) {
  return (
    <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <p className="font-semibold">이메일 인증 안내</p>
      <p className="mt-1 break-all text-xs text-emerald-800">
        {verificationTargetEmail} 계정은 이메일 인증이 완료되어야 로그인할 수 있습니다.
      </p>
      <button
        type="button"
        disabled={isVerificationEmailSending || disabled}
        onClick={onResend}
        className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400"
      >
        {isVerificationEmailSending ? '인증 메일 재전송 중...' : '인증 메일 다시 보내기'}
      </button>
    </div>
  );
}
