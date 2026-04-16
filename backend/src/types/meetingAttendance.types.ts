export interface MeetingSourceRow {
  id: number;
  boardId: number;
  meetingYear: number;
  title: string;
}

export interface MeetingSourceMutationPayload {
  boardId: number;
  meetingYear: number;
  title: string;
}

export interface MeetingBoardSeedRow {
  id: number;
  authorId: number | null;
  authorIsAdmin: boolean | number | null;
  title: string;
  content: string;
}

export interface MeetingCommentSeedRow {
  id: number;
  boardId: number;
  authorId: number | null;
  authorName: string;
  content: string;
}

export interface MeetingMemberSeedRow {
  id: number;
  name: string;
  email: string | null;
}

export interface UserMemberMappingRow {
  userId: number;
  memberId: number;
}

export interface MeetingAttendanceUpsertRow {
  memberId: number;
  sourceCommentId: number | null;
  sourceType: string;
}

export interface MemberMeetingAttendanceRow {
  memberId: number;
  meetingYear: number | string;
}

export interface MeetingAttendanceOverrideRow {
  memberId: number;
  meetingYear: number | string;
  attended: boolean | number;
}
