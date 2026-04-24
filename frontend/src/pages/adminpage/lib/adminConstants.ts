import type { AdminUserFormState } from '@/pages/adminpage/AdminUserDetailModal';

export type UserStatusFilter = 'all' | 'active' | 'inactive';

export const USERS_PAGE_SIZE = 3;

export const USER_STATUS_FILTER_LABEL: Record<UserStatusFilter, string> = {
  all: 'All',
  active: 'Active',
  inactive: 'Inactive',
};

export const AVATAR_TONES = [
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
] as const;

export const EMPTY_ADMIN_USER_FORM: AdminUserFormState = {
  name: '',
  email: '',
  role: 'member',
  status: 'active',
};
