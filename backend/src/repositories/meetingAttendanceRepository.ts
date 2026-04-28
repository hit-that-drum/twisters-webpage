import { ensureMeetingAttendanceSchema } from './meeting/meetingAttendanceSchema.js';
import { meetingAttendanceDerivedRepository } from './meeting/meetingAttendanceDerivedRepository.js';
import { meetingAttendanceOverrideRepository } from './meeting/meetingAttendanceOverrideRepository.js';
import { meetingSeedRepository } from './meeting/meetingSeedRepository.js';
import { meetingSourceRepository } from './meeting/meetingSourceRepository.js';

export const meetingAttendanceRepository = {
  ensureMeetingAttendanceSchema: () => ensureMeetingAttendanceSchema(),
  // Seed lookups (boards, comments, members)
  findMeetingBoardById: meetingSeedRepository.findMeetingBoardById.bind(meetingSeedRepository),
  findAllMeetingBoardCandidates:
    meetingSeedRepository.findAllMeetingBoardCandidates.bind(meetingSeedRepository),
  findCommentsByBoardId: meetingSeedRepository.findCommentsByBoardId.bind(meetingSeedRepository),
  findAllMembers: meetingSeedRepository.findAllMembers.bind(meetingSeedRepository),
  findMemberIdsByUserIds: meetingSeedRepository.findMemberIdsByUserIds.bind(meetingSeedRepository),
  // Meeting source operations
  upsertMeetingSource: meetingSourceRepository.upsertMeetingSource.bind(meetingSourceRepository),
  deleteMeetingSourceByBoardId:
    meetingSourceRepository.deleteMeetingSourceByBoardId.bind(meetingSourceRepository),
  deleteMeetingSourcesExceptBoardIds:
    meetingSourceRepository.deleteMeetingSourcesExceptBoardIds.bind(meetingSourceRepository),
  findMeetingPeriods: meetingSourceRepository.findMeetingPeriods.bind(meetingSourceRepository),
  // Derived attendance operations
  replaceMeetingAttendance:
    meetingAttendanceDerivedRepository.replaceMeetingAttendance.bind(meetingAttendanceDerivedRepository),
  findMeetingAttendanceRows:
    meetingAttendanceDerivedRepository.findMeetingAttendanceRows.bind(meetingAttendanceDerivedRepository),
  // Manual override operations
  findMeetingAttendanceOverrideRows:
    meetingAttendanceOverrideRepository.findMeetingAttendanceOverrideRows.bind(
      meetingAttendanceOverrideRepository,
    ),
  upsertMeetingAttendanceOverride:
    meetingAttendanceOverrideRepository.upsertMeetingAttendanceOverride.bind(
      meetingAttendanceOverrideRepository,
    ),
  deleteMeetingAttendanceOverride:
    meetingAttendanceOverrideRepository.deleteMeetingAttendanceOverride.bind(
      meetingAttendanceOverrideRepository,
    ),
};

export {
  meetingAttendanceDerivedRepository,
  meetingAttendanceOverrideRepository,
  meetingSeedRepository,
  meetingSourceRepository,
};
