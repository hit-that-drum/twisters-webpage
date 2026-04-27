import { HttpError } from '../../errors/httpError.js';
import { memberRepository } from '../../repositories/memberRepository.js';
import { meetingAttendanceRepository } from '../../repositories/meetingAttendanceRepository.js';
import { meetingAttendanceService } from '../meetingAttendanceService.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import {
  type MemberMeetingAttendanceOverrideDTO,
  type MemberMeetingAttendanceStatus,
} from '../../types/member.types.js';
import { resolveDataScopeByUser } from '../../utils/dataScope.js';
import { normalizeBoolean } from '../../utils/parseUtils.js';
import {
  VALID_MEETING_PERIODS,
  createMeetingAttendanceFieldKey,
  createMeetingAttendanceKey,
  parseMemberId,
  parseMeetingPeriod,
  parseMeetingYear,
  requireAdminUser,
} from './memberValidation.js';

class MemberAttendanceService {
  /**
   * Composes the per-member attendance matrix by combining the synced
   * attendance rows with admin-authored overrides. Overrides win when both
   * exist for the same (member, year, period) tuple.
   */
  async getMemberMeetingAttendanceStatus(
    authenticatedUser: AuthenticatedUser | undefined,
  ): Promise<MemberMeetingAttendanceStatus[]> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    await memberRepository.ensureMembersSchema();
    await meetingAttendanceService.syncAllMeetingAttendance(scope);

    const [membersRows, attendanceRows, meetingYearRows, overrideRows] = await Promise.all([
      memberRepository.findAllMemberNames(scope),
      meetingAttendanceRepository.findMeetingAttendanceRows(scope),
      meetingAttendanceRepository.findMeetingPeriods(scope),
      meetingAttendanceRepository.findMeetingAttendanceOverrideRows(scope),
    ]);

    const meetingPeriods = meetingYearRows
      .map((row) => ({
        meetingYear: Number(row.meetingYear),
        meetingPeriod: Number(row.meetingPeriod),
      }))
      .filter(
        (row): row is { meetingYear: number; meetingPeriod: number } =>
          Number.isInteger(row.meetingYear) && VALID_MEETING_PERIODS.has(row.meetingPeriod),
      )
      .sort(
        (left, right) =>
          left.meetingYear - right.meetingYear || left.meetingPeriod - right.meetingPeriod,
      );

    const attendanceYearsByMemberId = new Map<number, Set<string>>();
    attendanceRows.forEach((row) => {
      const memberId = row.memberId;
      const meetingYear = Number(row.meetingYear);
      const meetingPeriod = Number(row.meetingPeriod);

      if (
        !Number.isInteger(memberId) ||
        !Number.isInteger(meetingYear) ||
        !VALID_MEETING_PERIODS.has(meetingPeriod)
      ) {
        return;
      }

      const years = attendanceYearsByMemberId.get(memberId) ?? new Set<string>();
      years.add(createMeetingAttendanceKey(meetingYear, meetingPeriod));
      attendanceYearsByMemberId.set(memberId, years);
    });

    const attendanceOverridesByMemberId = new Map<number, Map<string, boolean>>();
    overrideRows.forEach((row) => {
      const memberId = row.memberId;
      const meetingYear = Number(row.meetingYear);
      const meetingPeriod = Number(row.meetingPeriod);

      if (
        !Number.isInteger(memberId) ||
        !Number.isInteger(meetingYear) ||
        !VALID_MEETING_PERIODS.has(meetingPeriod)
      ) {
        return;
      }

      const overrides = attendanceOverridesByMemberId.get(memberId) ?? new Map<string, boolean>();
      overrides.set(
        createMeetingAttendanceKey(meetingYear, meetingPeriod),
        normalizeBoolean(row.attended, false),
      );
      attendanceOverridesByMemberId.set(memberId, overrides);
    });

    return membersRows.map((member) => {
      const row = {
        memberId: member.id,
        name: member.name,
      } as MemberMeetingAttendanceStatus;
      const attendedYears = attendanceYearsByMemberId.get(member.id) ?? new Set<string>();
      const overrides = attendanceOverridesByMemberId.get(member.id) ?? new Map<string, boolean>();

      meetingPeriods.forEach(({ meetingYear, meetingPeriod }) => {
        const attendanceKey = createMeetingAttendanceKey(meetingYear, meetingPeriod);
        const fieldKey = createMeetingAttendanceFieldKey(meetingYear, meetingPeriod);
        row[fieldKey] = overrides.has(attendanceKey)
          ? (overrides.get(attendanceKey) ?? false)
          : attendedYears.has(attendanceKey);
      });

      return row;
    });
  }

  async updateMemberMeetingAttendanceStatus(
    authenticatedUser: AuthenticatedUser | undefined,
    rawMemberId: string | undefined,
    rawMeetingYear: string | undefined,
    rawMeetingPeriod: string | undefined,
    payload: MemberMeetingAttendanceOverrideDTO,
  ) {
    const adminUser = requireAdminUser(authenticatedUser);
    const scope = resolveDataScopeByUser(adminUser);
    const memberId = parseMemberId(rawMemberId);
    const meetingYear = parseMeetingYear(rawMeetingYear);
    const meetingPeriod = parseMeetingPeriod(rawMeetingPeriod);

    if (!memberId) {
      throw new HttpError(400, '유효한 회원 ID가 필요합니다.');
    }

    if (!meetingYear) {
      throw new HttpError(400, '유효한 모임 연도가 필요합니다.');
    }

    if (!meetingPeriod) {
      throw new HttpError(400, '유효한 모임 차수가 필요합니다.');
    }

    if (typeof payload.attended !== 'boolean') {
      throw new HttpError(400, '참석 여부는 boolean 형식이어야 합니다.');
    }

    await Promise.all([
      memberRepository.ensureMembersSchema(),
      meetingAttendanceRepository.ensureMeetingAttendanceSchema(),
    ]);

    const member = await memberRepository.findMemberById(scope, memberId);
    if (!member) {
      throw new HttpError(404, '해당 회원을 찾을 수 없습니다.');
    }

    await meetingAttendanceRepository.upsertMeetingAttendanceOverride(
      scope,
      memberId,
      meetingYear,
      meetingPeriod,
      payload.attended,
    );
  }

  async clearMemberMeetingAttendanceStatus(
    authenticatedUser: AuthenticatedUser | undefined,
    rawMemberId: string | undefined,
    rawMeetingYear: string | undefined,
    rawMeetingPeriod: string | undefined,
  ) {
    const adminUser = requireAdminUser(authenticatedUser);
    const scope = resolveDataScopeByUser(adminUser);
    const memberId = parseMemberId(rawMemberId);
    const meetingYear = parseMeetingYear(rawMeetingYear);
    const meetingPeriod = parseMeetingPeriod(rawMeetingPeriod);

    if (!memberId) {
      throw new HttpError(400, '유효한 회원 ID가 필요합니다.');
    }

    if (!meetingYear) {
      throw new HttpError(400, '유효한 모임 연도가 필요합니다.');
    }

    if (!meetingPeriod) {
      throw new HttpError(400, '유효한 모임 차수가 필요합니다.');
    }

    await Promise.all([
      memberRepository.ensureMembersSchema(),
      meetingAttendanceRepository.ensureMeetingAttendanceSchema(),
    ]);

    const member = await memberRepository.findMemberById(scope, memberId);
    if (!member) {
      throw new HttpError(404, '해당 회원을 찾을 수 없습니다.');
    }

    await meetingAttendanceRepository.deleteMeetingAttendanceOverride(
      scope,
      memberId,
      meetingYear,
      meetingPeriod,
    );
  }
}

export const memberAttendanceService = new MemberAttendanceService();
