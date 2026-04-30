import { type AuthenticatedUser } from '../types/common.types.js';
import { normalizeBoolean } from './parseUtils.js';

export type DataScope = 'real' | 'test';

interface ScopedTableNames {
  notice: string;
  members: string;
  settlement: string;
  board: string;
  boardComments: string;
  boardReactions: string;
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
    boardReactions: 'board_reactions',
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
    boardReactions: 'test_board_reactions',
    meetingSources: 'test_meeting_sources',
    meetingAttendance: 'test_meeting_attendance',
    meetingAttendanceOverrides: 'test_meeting_attendance_overrides',
  },
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
