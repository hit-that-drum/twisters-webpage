import { normalizePhoneNumber } from '@/common/lib/phoneNumber';
import type { MemberUser } from '@/entities/user/types';
import type { MemberFormState } from '@/pages/member/MemberDetailModal';
import type { DuesDisplayMeta } from './memberTypes';

export const getMeetingPeriodLabel = (period: number) => `${period}차 모임`;

export const isFutureMeetingPeriod = (year: number, period: number) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year > currentYear) {
    return true;
  }

  if (year < currentYear) {
    return false;
  }

  return period === 2 && currentMonth <= 6;
};

export const createDefaultMemberForm = (): MemberFormState => ({
  name: '',
  email: '',
  phone: '',
  birthDate: '',
});

export const toEditForm = (member: MemberUser): MemberFormState => ({
  name: member.name,
  email: member.email ?? '',
  phone: member.phone ? normalizePhoneNumber(member.phone) : '',
  birthDate: member.birthDate ?? '',
});

export const getDuesDisplayMeta = (year: number, isPaid: boolean): DuesDisplayMeta => {
  const currentYear = new Date().getFullYear();

  if (year > currentYear) {
    return {
      label: '예정',
      icon: '⌛',
      className: 'bg-slate-100 text-slate-500',
    };
  }

  if (isPaid) {
    return {
      label: '완납',
      icon: '✓',
      className: 'bg-emerald-50 text-emerald-700',
    };
  }

  return {
    label: '미납',
    icon: '•',
    className: 'bg-amber-50 text-amber-700',
  };
};

export const getMeetingAttendanceDisplayMeta = (
  year: number,
  period: number,
  isAttended: boolean,
): DuesDisplayMeta => {
  if (isFutureMeetingPeriod(year, period)) {
    return {
      label: '예정',
      icon: '⌛',
      className: 'bg-slate-100 text-slate-500',
    };
  }

  if (isAttended) {
    return {
      label: '참석',
      icon: '✓',
      className: 'bg-sky-50 text-sky-700',
    };
  }

  return {
    label: '미참석',
    icon: '•',
    className: 'bg-rose-50 text-rose-700',
  };
};

export const renderDetailValue = (value: string | null) => {
  if (!value || !value.trim()) {
    return '-';
  }

  return value;
};

export const getMemberInitial = (name: string) => {
  return name.trim().charAt(0).toUpperCase() || '?';
};
