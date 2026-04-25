import { FiMail } from 'react-icons/fi';
import { SiKakaotalk } from 'react-icons/si';
import type { AuthProvider } from '@/entities/user/types';
import { getAuthProviderMeta } from '@/pages/adminpage/lib/adminFormatters';

interface AdminAuthProviderBadgeProps {
  provider: AuthProvider;
}

const BASE_BADGE_CLASS_NAME =
  'inline-flex h-[26px] min-w-[88px] items-center justify-center rounded-full border px-2.5 text-xs font-semibold';

const GoogleWordmark = () => {
  return (
    <span
      className="inline-flex items-center text-[13px] font-semibold leading-none tracking-[-0.06em]"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      aria-label="Google"
    >
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#DB4437]">o</span>
      <span className="text-[#F4B400]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#0F9D58]">l</span>
      <span className="text-[#DB4437]">e</span>
    </span>
  );
};

const getAuthProviderIcon = (provider: AuthProvider) => {
  if (provider === 'email') {
    return <FiMail className="text-sm text-slate-500" aria-hidden="true" />;
  }

  if (provider === 'kakao') {
    return <SiKakaotalk className="text-sm text-[#3C1E1E]" aria-hidden="true" />;
  }

  return null;
};

export default function AdminAuthProviderBadge({ provider }: AdminAuthProviderBadgeProps) {
  const authProviderMeta = getAuthProviderMeta(provider);

  if (provider === 'google') {
    return (
      <span
        className={`${BASE_BADGE_CLASS_NAME} ${authProviderMeta.className}`}
      >
        <GoogleWordmark />
      </span>
    );
  }

  const authProviderIcon = getAuthProviderIcon(provider);

  return (
    <span
      className={`${BASE_BADGE_CLASS_NAME} ${authProviderIcon ? 'gap-1.5' : ''} ${authProviderMeta.className}`}
    >
      {authProviderIcon}
      <span>{authProviderMeta.label}</span>
    </span>
  );
}
