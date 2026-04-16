import { HttpError } from '../errors/httpError.js';
import { memberRepository } from '../repositories/memberRepository.js';
import { meetingAttendanceRepository } from '../repositories/meetingAttendanceRepository.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import {
  type Member,
  type MemberDuesStatus,
  type MemberMeetingAttendanceOverrideDTO,
  type MemberMeetingAttendanceStatus,
  type MemberMutationDTO,
  type MemberMutationPayload,
} from '../types/member.types.js';
import { meetingAttendanceService } from './meetingAttendanceService.js';
import { resolveDataScopeByUser } from '../utils/dataScope.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUES_BASE_YEAR = 2024;
const MIN_MEETING_YEAR = 2000;

const parseMemberId = (rawMemberId?: string) => {
  const parsedMemberId = Number(rawMemberId);
  if (!Number.isInteger(parsedMemberId) || parsedMemberId <= 0) {
    return null;
  }

  return parsedMemberId;
};

const parseMeetingYear = (rawMeetingYear?: string) => {
  const parsedMeetingYear = Number(rawMeetingYear);
  if (!Number.isInteger(parsedMeetingYear) || parsedMeetingYear < MIN_MEETING_YEAR) {
    return null;
  }

  return parsedMeetingYear;
};

const normalizeOptionalText = (rawValue: unknown, maxLength: number, fieldPrefix: string) => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new HttpError(400, `${fieldPrefix} 문자열 형식이 올바르지 않습니다.`);
  }

  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.length > maxLength) {
    throw new HttpError(400, `${fieldPrefix} 입력 값은 ${maxLength}자 이하여야 합니다.`);
  }

  return trimmedValue;
};

const normalizeRequiredText = (rawValue: unknown, fieldName: string, maxLength: number) => {
  if (typeof rawValue !== 'string') {
    throw new HttpError(400, `${fieldName}은(는) 필수입니다.`);
  }

  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    throw new HttpError(400, `${fieldName}은(는) 필수입니다.`);
  }

  if (trimmedValue.length > maxLength) {
    throw new HttpError(400, `${fieldName}은(는) ${maxLength}자 이하여야 합니다.`);
  }

  return trimmedValue;
};

const normalizeOptionalEmail = (rawValue: unknown) => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new HttpError(400, '이메일 형식이 올바르지 않습니다.');
  }

  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.length > 100) {
    throw new HttpError(400, '이메일은 100자 이하여야 합니다.');
  }

  const lowerCaseEmail = trimmedValue.toLowerCase();
  if (!EMAIL_PATTERN.test(lowerCaseEmail)) {
    throw new HttpError(400, '유효한 이메일 주소를 입력해주세요.');
  }

  return lowerCaseEmail;
};

const normalizeOptionalDate = (rawValue: unknown, fieldName: string) => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new HttpError(400, `${fieldName} 형식이 올바르지 않습니다.`);
  }

  const normalizedDate = rawValue.trim();
  if (!normalizedDate) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new HttpError(400, `${fieldName}은 YYYY-MM-DD 형식이어야 합니다.`);
  }

  const [yearText, monthText, dayText] = normalizedDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new HttpError(400, `${fieldName} 형식이 올바르지 않습니다.`);
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new HttpError(400, `유효한 ${fieldName}을(를) 입력해주세요.`);
  }

  return normalizedDate;
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

const isAdminUser = (authenticatedUser: AuthenticatedUser) => {
  return normalizeBoolean(authenticatedUser.isAdmin, false);
};

const requireAdminUser = (authenticatedUser: AuthenticatedUser | undefined) => {
  if (!authenticatedUser) {
    throw new HttpError(401, '인증된 사용자 정보가 없습니다.');
  }

  if (!isAdminUser(authenticatedUser)) {
    throw new HttpError(403, '관리자만 회원 정보를 관리할 수 있습니다.');
  }

  return authenticatedUser;
};

const normalizeKoreanSearchText = (value: string) => {
  return value.normalize('NFC').replace(/\s+/g, '').trim();
};

const normalizeMemberMutationPayload = (payload: MemberMutationDTO): MemberMutationPayload => {
  return {
    name: normalizeRequiredText(payload.name, '이름', 100),
    email: normalizeOptionalEmail(payload.email),
    isAdmin: normalizeBoolean(payload.isAdmin, false),
    phone: normalizeOptionalText(payload.phone, 30, '전화번호'),
    department: normalizeOptionalText(payload.department, 100, '부서'),
    joinedAt: normalizeOptionalDate(payload.joinedAt, '입사일'),
    birthDate: normalizeOptionalDate(payload.birthDate, '생년월일'),
  };
};

class MemberService {
  async getMembers(authenticatedUser: AuthenticatedUser | undefined): Promise<Member[]> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    await memberRepository.ensureMembersSchema();
    const rows = await memberRepository.findAllMembers(scope);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      profileImage:
        typeof row.profileImage === 'string' && row.profileImage.trim().length > 0
          ? row.profileImage.trim()
          : null,
      isAdmin: normalizeBoolean(row.isAdmin, false),
      phone: row.phone,
      department: row.department,
      joinedAt: row.joinedAt,
      birthDate: row.birthDate,
    }));
  }

  async getMemberDuesDepositStatus(authenticatedUser: AuthenticatedUser | undefined): Promise<MemberDuesStatus[]> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    await memberRepository.ensureMembersSchema();

    const [membersRows, settlementRows] = await Promise.all([
      memberRepository.findAllMemberNames(scope),
      memberRepository.findSettlementDuesRows(scope, DUES_BASE_YEAR),
    ]);

    const members = membersRows
      .map((row) => ({
        id: row.id,
        name: row.name.trim(),
      }))
      .filter((row) => row.name.length > 0);

    const normalizedMembers = members.map((member) => ({
      ...member,
      normalizedName: normalizeKoreanSearchText(member.name),
    }));

    const paidYearsByMember = new Map<number, Set<number>>();
    normalizedMembers.forEach((member) => {
      paidYearsByMember.set(member.id, new Set<number>());
    });

    const currentYear = new Date().getFullYear();
    let maxYear = Math.max(DUES_BASE_YEAR, currentYear);

    settlementRows.forEach((row) => {
      const year = Number(row.year);
      if (!Number.isInteger(year) || year < DUES_BASE_YEAR) {
        return;
      }

      maxYear = Math.max(maxYear, year);

      const normalizedItem = normalizeKoreanSearchText(row.item);
      normalizedMembers.forEach((member) => {
        if (!member.normalizedName || !normalizedItem.includes(member.normalizedName)) {
          return;
        }

        paidYearsByMember.get(member.id)?.add(year);
      });
    });

    const years = Array.from(
      { length: maxYear - DUES_BASE_YEAR + 1 },
      (_, index) => DUES_BASE_YEAR + index,
    );

    return members.map((member) => {
      const row = {
        memberId: member.id,
        name: member.name,
      } as MemberDuesStatus;
      const paidYears = paidYearsByMember.get(member.id) ?? new Set<number>();

      years.forEach((year) => {
        const key = `deposit${year}` as `deposit${number}`;
        row[key] = paidYears.has(year);
      });

      return row;
    });
  }

  async getMemberMeetingAttendanceStatus(
    authenticatedUser: AuthenticatedUser | undefined,
  ): Promise<MemberMeetingAttendanceStatus[]> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    await memberRepository.ensureMembersSchema();
    await meetingAttendanceService.syncAllMeetingAttendance(scope);

    const [membersRows, attendanceRows, meetingYearRows, overrideRows] = await Promise.all([
      memberRepository.findAllMemberNames(scope),
      meetingAttendanceRepository.findMeetingAttendanceRows(scope),
      meetingAttendanceRepository.findMeetingYears(scope),
      meetingAttendanceRepository.findMeetingAttendanceOverrideRows(scope),
    ]);

    const meetingYears = meetingYearRows
      .map((row) => Number(row.meetingYear))
      .filter((year) => Number.isInteger(year))
      .sort((a, b) => a - b);

    const attendanceYearsByMemberId = new Map<number, Set<number>>();
    attendanceRows.forEach((row) => {
      const memberId = row.memberId;
      const meetingYear = Number(row.meetingYear);

      if (!Number.isInteger(memberId) || !Number.isInteger(meetingYear)) {
        return;
      }

      const years = attendanceYearsByMemberId.get(memberId) ?? new Set<number>();
      years.add(meetingYear);
      attendanceYearsByMemberId.set(memberId, years);
    });

    const attendanceOverridesByMemberId = new Map<number, Map<number, boolean>>();
    overrideRows.forEach((row) => {
      const memberId = row.memberId;
      const meetingYear = Number(row.meetingYear);

      if (!Number.isInteger(memberId) || !Number.isInteger(meetingYear)) {
        return;
      }

      const overrides = attendanceOverridesByMemberId.get(memberId) ?? new Map<number, boolean>();
      overrides.set(meetingYear, normalizeBoolean(row.attended, false));
      attendanceOverridesByMemberId.set(memberId, overrides);
    });

    return membersRows.map((member) => {
      const row = {
        memberId: member.id,
        name: member.name,
      } as MemberMeetingAttendanceStatus;
      const attendedYears = attendanceYearsByMemberId.get(member.id) ?? new Set<number>();
      const overrides = attendanceOverridesByMemberId.get(member.id) ?? new Map<number, boolean>();

      meetingYears.forEach((year) => {
        const key = `attendance${year}` as `attendance${number}`;
        row[key] = overrides.has(year) ? (overrides.get(year) ?? false) : attendedYears.has(year);
      });

      return row;
    });
  }

  async updateMemberMeetingAttendanceStatus(
    authenticatedUser: AuthenticatedUser | undefined,
    rawMemberId: string | undefined,
    rawMeetingYear: string | undefined,
    payload: MemberMeetingAttendanceOverrideDTO,
  ) {
    const adminUser = requireAdminUser(authenticatedUser);
    const scope = resolveDataScopeByUser(adminUser);
    const memberId = parseMemberId(rawMemberId);
    const meetingYear = parseMeetingYear(rawMeetingYear);

    if (!memberId) {
      throw new HttpError(400, '유효한 회원 ID가 필요합니다.');
    }

    if (!meetingYear) {
      throw new HttpError(400, '유효한 모임 연도가 필요합니다.');
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
      payload.attended,
    );
  }

  async clearMemberMeetingAttendanceStatus(
    authenticatedUser: AuthenticatedUser | undefined,
    rawMemberId: string | undefined,
    rawMeetingYear: string | undefined,
  ) {
    const adminUser = requireAdminUser(authenticatedUser);
    const scope = resolveDataScopeByUser(adminUser);
    const memberId = parseMemberId(rawMemberId);
    const meetingYear = parseMeetingYear(rawMeetingYear);

    if (!memberId) {
      throw new HttpError(400, '유효한 회원 ID가 필요합니다.');
    }

    if (!meetingYear) {
      throw new HttpError(400, '유효한 모임 연도가 필요합니다.');
    }

    await Promise.all([
      memberRepository.ensureMembersSchema(),
      meetingAttendanceRepository.ensureMeetingAttendanceSchema(),
    ]);

    const member = await memberRepository.findMemberById(scope, memberId);
    if (!member) {
      throw new HttpError(404, '해당 회원을 찾을 수 없습니다.');
    }

    await meetingAttendanceRepository.deleteMeetingAttendanceOverride(scope, memberId, meetingYear);
  }

  async createMember(authenticatedUser: AuthenticatedUser | undefined, payload: MemberMutationDTO) {
    const adminUser = requireAdminUser(authenticatedUser);
    const normalizedPayload = normalizeMemberMutationPayload(payload);
    const scope = resolveDataScopeByUser(adminUser);

    await memberRepository.ensureMembersSchema();

    if (normalizedPayload.email) {
      const existingMember = await memberRepository.findMemberByEmail(scope, normalizedPayload.email);
      if (existingMember) {
        throw new HttpError(400, '이미 등록된 이메일입니다.');
      }
    }

    await memberRepository.createMember(scope, normalizedPayload);
  }

  async updateMember(
    authenticatedUser: AuthenticatedUser | undefined,
    rawMemberId: string | undefined,
    payload: MemberMutationDTO,
  ) {
    const adminUser = requireAdminUser(authenticatedUser);
    const scope = resolveDataScopeByUser(adminUser);

    const memberId = parseMemberId(rawMemberId);
    if (!memberId) {
      throw new HttpError(400, '유효한 회원 ID가 필요합니다.');
    }

    const normalizedPayload = normalizeMemberMutationPayload(payload);

    await memberRepository.ensureMembersSchema();

    if (normalizedPayload.email) {
      const existingMember = await memberRepository.findMemberByEmailExcludingId(
        scope,
        normalizedPayload.email,
        memberId,
      );
      if (existingMember) {
        throw new HttpError(400, '이미 등록된 이메일입니다.');
      }
    }

    const updatedCount = await memberRepository.updateMember(scope, memberId, normalizedPayload);
    if (updatedCount === 0) {
      throw new HttpError(404, '해당 회원을 찾을 수 없습니다.');
    }
  }

  async deleteMember(authenticatedUser: AuthenticatedUser | undefined, rawMemberId: string | undefined) {
    const adminUser = requireAdminUser(authenticatedUser);
    const scope = resolveDataScopeByUser(adminUser);

    const memberId = parseMemberId(rawMemberId);
    if (!memberId) {
      throw new HttpError(400, '유효한 회원 ID가 필요합니다.');
    }

    await memberRepository.ensureMembersSchema();
    const deletedCount = await memberRepository.deleteMember(scope, memberId);

    if (deletedCount === 0) {
      throw new HttpError(404, '해당 회원을 찾을 수 없습니다.');
    }
  }
}

export const memberService = new MemberService();
