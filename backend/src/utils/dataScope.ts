import { type AuthenticatedUser } from '../types/common.types.js';

export type DataScope = 'real' | 'test';

interface ScopedTableNames {
  notice: string;
  members: string;
  settlement: string;
  board: string;
  boardComments: string;
  meetingSources: string;
  meetingAttendance: string;
  meetingAttendanceOverrides: string;
}

const TABLE_NAMES_BY_SCOPE: Record<DataScope, ScopedTableNames> = {
  real: {
    notice: 'notice',
    members: 'members',
    settlement: 'settlement',
    board: 'board',
    boardComments: 'board_comments',
    meetingSources: 'meeting_sources',
    meetingAttendance: 'meeting_attendance',
    meetingAttendanceOverrides: 'meeting_attendance_overrides',
  },
  test: {
    notice: 'test_notice',
    members: 'test_members',
    settlement: 'test_settlement',
    board: 'test_board',
    boardComments: 'test_board_comments',
    meetingSources: 'test_meeting_sources',
    meetingAttendance: 'test_meeting_attendance',
    meetingAttendanceOverrides: 'test_meeting_attendance_overrides',
  },
};

const normalizeBoolean = (rawValue: unknown, fallbackValue = false) => {
  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'number') {
    return rawValue === 1;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return fallbackValue;
};

export const resolveDataScopeByUser = (authenticatedUser: AuthenticatedUser | undefined): DataScope => {
  if (!authenticatedUser) {
    return 'real';
  }

  return normalizeBoolean(authenticatedUser.isTest, false) ? 'test' : 'real';
};

export const getScopedTableNames = (scope: DataScope) => {
  return TABLE_NAMES_BY_SCOPE[scope];
};
