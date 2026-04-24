import type { MemberUser } from '@/entities/user/types';
import {
  ATTENDANCE_KEY_PATTERN,
  DEPOSIT_KEY_PATTERN,
  type ParsedMemberAttendanceStatus,
  type ParsedMemberDuesStatus,
} from './memberTypes';

export const getAttendanceStatusKey = (year: number, period: number) => `${year}_${period}`;

const parseBoolean = (rawValue: unknown) => {
  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'number') {
    return rawValue === 1;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true') {
      return true;
    }
    if (normalized === '0' || normalized === 'false') {
      return false;
    }
  }

  return false;
};

export const parseMembers = (payload: unknown): MemberUser[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const row = item as {
        id?: unknown;
        name?: unknown;
        email?: unknown;
        profileImage?: unknown;
        isAdmin?: unknown;
        phone?: unknown;
        joinedAt?: unknown;
        birthDate?: unknown;
      };

      if (
        typeof row.id !== 'number' ||
        typeof row.name !== 'string' ||
        (row.email !== null && row.email !== undefined && typeof row.email !== 'string')
      ) {
        return null;
      }

      const normalizeNullableString = (rawValue: unknown) => {
        if (rawValue === null || rawValue === undefined) {
          return null;
        }

        return typeof rawValue === 'string' ? rawValue : null;
      };

      return {
        id: row.id,
        name: row.name,
        email: normalizeNullableString(row.email),
        profileImage: normalizeNullableString(row.profileImage),
        isAdmin: parseBoolean(row.isAdmin),
        phone: normalizeNullableString(row.phone),
        joinedAt: normalizeNullableString(row.joinedAt),
        birthDate: normalizeNullableString(row.birthDate),
      };
    })
    .filter((item): item is MemberUser => item !== null);
};

export const parseMemberDuesStatus = (payload: unknown): ParsedMemberDuesStatus => {
  if (!Array.isArray(payload)) {
    return { years: [], byMemberId: {} };
  }

  const years = new Set<number>();
  const byMemberId: Record<number, Record<number, boolean>> = {};

  payload.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const row = item as Record<string, unknown>;
    const memberId =
      typeof row.memberId === 'number' && Number.isInteger(row.memberId) ? row.memberId : null;
    if (!memberId) {
      return;
    }

    if (!byMemberId[memberId]) {
      byMemberId[memberId] = {};
    }

    Object.entries(row).forEach(([key, value]) => {
      const matched = DEPOSIT_KEY_PATTERN.exec(key);
      if (!matched) {
        return;
      }

      const year = Number(matched[1]);
      if (!Number.isInteger(year)) {
        return;
      }

      years.add(year);
      byMemberId[memberId][year] = parseBoolean(value);
    });
  });

  return {
    years: [...years].sort((a, b) => a - b),
    byMemberId,
  };
};

export const parseMemberAttendanceStatus = (payload: unknown): ParsedMemberAttendanceStatus => {
  if (!Array.isArray(payload)) {
    return { periods: [], byMemberId: {} };
  }

  const periods = new Map<string, { year: number; period: number }>();
  const byMemberId: Record<number, Record<string, boolean>> = {};

  payload.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const row = item as Record<string, unknown>;
    const memberId =
      typeof row.memberId === 'number' && Number.isInteger(row.memberId) ? row.memberId : null;
    if (!memberId) {
      return;
    }

    if (!byMemberId[memberId]) {
      byMemberId[memberId] = {};
    }

    Object.entries(row).forEach(([key, value]) => {
      const matched = ATTENDANCE_KEY_PATTERN.exec(key);
      if (!matched) {
        return;
      }

      const year = Number(matched[1]);
      const period = Number(matched[2]);
      if (!Number.isInteger(year) || !Number.isInteger(period)) {
        return;
      }

      const attendanceKey = getAttendanceStatusKey(year, period);
      periods.set(attendanceKey, { year, period });
      byMemberId[memberId][attendanceKey] = parseBoolean(value);
    });
  });

  return {
    periods: [...periods.values()].sort(
      (left, right) => left.year - right.year || left.period - right.period,
    ),
    byMemberId,
  };
};
