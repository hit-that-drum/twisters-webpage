import type { AdminUserRecord } from '@/entities/user/types';
import type { AdminUserFormState } from '@/pages/adminpage/AdminUserDetailModal';
import { AVATAR_TONES } from './adminConstants';

const countFormatter = new Intl.NumberFormat('en-US');

/**
 * Admin-specific date+time formatting — always Korean locale with explicit
 * YYYY-MM-DD HH:MM fields. Deliberately named differently from the shared
 * `formatDateTime` in `@/common/lib/api/apiHelpers` so importers pick the
 * intended behavior.
 */
export const formatKoreanDateTime = (raw: string) => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatJoinedDate = (raw: string) => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

export const getEmailVerificationMeta = (raw: string | null) => {
  if (!raw) {
    return {
      label: 'Not verified',
      detail: 'Waiting for email verification',
      className: 'bg-amber-50 text-amber-700',
      dotClassName: 'bg-amber-500',
    };
  }

  return {
    label: 'Verified',
    detail: formatKoreanDateTime(raw),
    className: 'bg-emerald-50 text-emerald-700',
    dotClassName: 'bg-emerald-500',
  };
};

export const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  const first = tokens[0]?.charAt(0) ?? '';
  const last = tokens[tokens.length - 1]?.charAt(0) ?? '';
  return `${first}${last}`.toUpperCase();
};

export const getAvatarToneClassName = (userId: number) => {
  return AVATAR_TONES[userId % AVATAR_TONES.length] ?? AVATAR_TONES[0];
};

export const formatCount = (count: number) => {
  return countFormatter.format(count);
};

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const toAdminUserForm = (user: AdminUserRecord): AdminUserFormState => ({
  name: user.name,
  email: user.email,
  role: user.isAdmin ? 'admin' : 'member',
  status: user.isAllowed ? 'active' : 'inactive',
});
