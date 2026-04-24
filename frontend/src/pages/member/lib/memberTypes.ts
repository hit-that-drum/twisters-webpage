export interface ParsedMemberDuesStatus {
  years: number[];
  byMemberId: Record<number, Record<number, boolean>>;
}

export interface ParsedMemberAttendanceStatus {
  periods: Array<{ year: number; period: number }>;
  byMemberId: Record<number, Record<string, boolean>>;
}

export interface DuesDisplayMeta {
  label: string;
  icon: string;
  className: string;
}

export interface DetailInfoItem {
  key: string;
  label: string;
  value: string | null;
}

export const DEPOSIT_KEY_PATTERN = /^deposit(\d{4})$/;
export const ATTENDANCE_KEY_PATTERN = /^attendance(\d{4})_(1|2)$/;
