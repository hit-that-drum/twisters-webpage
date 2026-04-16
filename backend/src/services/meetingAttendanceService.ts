import { meetingAttendanceRepository } from '../repositories/meetingAttendanceRepository.js';
import { memberRepository } from '../repositories/memberRepository.js';
import type { MeetingAttendanceUpsertRow, MeetingBoardSeedRow } from '../types/meetingAttendance.types.js';
import { resolveDataScopeByUser, type DataScope } from '../utils/dataScope.js';
import type { AuthenticatedUser } from '../types/common.types.js';

const MEETING_TITLE_KEYWORD = '모임';
const MEETING_YEAR_PATTERN = /(\d{4})\s*년/;

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

const normalizeKoreanSearchText = (value: string) => {
  return value.normalize('NFC').replace(/\s+/g, '').trim();
};

const parseMeetingYear = (title: string) => {
  const matched = title.match(MEETING_YEAR_PATTERN);
  if (!matched) {
    return null;
  }

  const meetingYear = Number(matched[1]);
  return Number.isInteger(meetingYear) ? meetingYear : null;
};

const isEligibleMeetingBoard = (board: MeetingBoardSeedRow) => {
  if (!normalizeBoolean(board.authorIsAdmin, false)) {
    return false;
  }

  if (!board.title.includes(MEETING_TITLE_KEYWORD)) {
    return false;
  }

  return parseMeetingYear(board.title) !== null;
};

class MeetingAttendanceService {
  private async syncBoard(scope: DataScope, board: MeetingBoardSeedRow) {
    await memberRepository.ensureMembersSchema();
    await meetingAttendanceRepository.ensureMeetingAttendanceSchema();

    const meetingYear = parseMeetingYear(board.title);
    if (!meetingYear || !isEligibleMeetingBoard(board)) {
      await meetingAttendanceRepository.deleteMeetingSourceByBoardId(scope, board.id);
      return;
    }

    const meetingSource = await meetingAttendanceRepository.upsertMeetingSource(scope, {
      boardId: board.id,
      meetingYear,
      title: board.title.trim(),
    });

    if (!meetingSource) {
      return;
    }

    const [members, comments] = await Promise.all([
      meetingAttendanceRepository.findAllMembers(scope),
      meetingAttendanceRepository.findCommentsByBoardId(scope, board.id),
    ]);

    const normalizedMembers = members
      .map((member) => ({
        ...member,
        normalizedName: normalizeKoreanSearchText(member.name),
      }))
      .filter((member) => member.normalizedName.length > 0);

    const commentAuthorIds = comments
      .map((comment) => comment.authorId)
      .filter((authorId): authorId is number => typeof authorId === 'number' && Number.isInteger(authorId));
    const memberMappings = await meetingAttendanceRepository.findMemberIdsByUserIds(scope, commentAuthorIds);
    const memberIdByUserId = new Map(memberMappings.map((row) => [row.userId, row.memberId]));

    const attendanceRowsByMemberId = new Map<number, MeetingAttendanceUpsertRow>();
    const addAttendanceRow = (row: MeetingAttendanceUpsertRow) => {
      const existing = attendanceRowsByMemberId.get(row.memberId);
      if (!existing) {
        attendanceRowsByMemberId.set(row.memberId, row);
        return;
      }

      if (existing.sourceType === 'comment_author') {
        return;
      }

      if (row.sourceType === 'comment_author') {
        attendanceRowsByMemberId.set(row.memberId, row);
      }
    };

    const normalizedBoardContent = normalizeKoreanSearchText(board.content);
    normalizedMembers.forEach((member) => {
      if (!normalizedBoardContent || !normalizedBoardContent.includes(member.normalizedName)) {
        return;
      }

      addAttendanceRow({
        memberId: member.id,
        sourceCommentId: null,
        sourceType: 'board_content',
      });
    });

    comments.forEach((comment) => {
      const memberIdFromAuthor =
        comment.authorId !== null ? memberIdByUserId.get(comment.authorId) ?? null : null;

      if (memberIdFromAuthor) {
        addAttendanceRow({
          memberId: memberIdFromAuthor,
          sourceCommentId: comment.id,
          sourceType: 'comment_author',
        });
      }

      const normalizedCommentContent = normalizeKoreanSearchText(comment.content);
      normalizedMembers.forEach((member) => {
        if (!normalizedCommentContent || !normalizedCommentContent.includes(member.normalizedName)) {
          return;
        }

        addAttendanceRow({
          memberId: member.id,
          sourceCommentId: comment.id,
          sourceType: 'comment_content',
        });
      });
    });

    await meetingAttendanceRepository.replaceMeetingAttendance(
      scope,
      meetingSource.id,
      [...attendanceRowsByMemberId.values()],
    );
  }

  async syncMeetingAttendanceForBoard(authenticatedUser: AuthenticatedUser | undefined, boardId: number) {
    const scope = resolveDataScopeByUser(authenticatedUser);
    const board = await meetingAttendanceRepository.findMeetingBoardById(scope, boardId);

    if (!board) {
      await meetingAttendanceRepository.deleteMeetingSourceByBoardId(scope, boardId);
      return;
    }

    await this.syncBoard(scope, board);
  }

  async syncAllMeetingAttendance(scope: DataScope) {
    await memberRepository.ensureMembersSchema();
    await meetingAttendanceRepository.ensureMeetingAttendanceSchema();
    const boards = await meetingAttendanceRepository.findAllMeetingBoardCandidates(scope);
    const eligibleBoards = boards.filter((board) => isEligibleMeetingBoard(board));

    await meetingAttendanceRepository.deleteMeetingSourcesExceptBoardIds(
      scope,
      eligibleBoards.map((board) => board.id),
    );

    for (const board of eligibleBoards) {
      await this.syncBoard(scope, board);
    }
  }
}

export const meetingAttendanceService = new MeetingAttendanceService();
