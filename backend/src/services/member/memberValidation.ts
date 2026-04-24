import { HttpError } from '../../errors/httpError.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import {
  type MemberMutationDTO,
  type MemberMutationPayload,
} from '../../types/member.types.js';
import { normalizeBoolean } from '../../utils/parseUtils.js';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DUES_BASE_YEAR = 2024;
export const MIN_MEETING_YEAR = 2000;
export const VALID_MEETING_PERIODS = new Set([1, 2]);

export const parseMemberId = (rawMemberId?: string) => {
  const parsedMemberId = Number(rawMemberId);
  if (!Number.isInteger(parsedMemberId) || parsedMemberId <= 0) {
    return null;
  }

  return parsedMemberId;
};

export const parseMeetingYear = (rawMeetingYear?: string) => {
  const parsedMeetingYear = Number(rawMeetingYear);
  if (!Number.isInteger(parsedMeetingYear) || parsedMeetingYear < MIN_MEETING_YEAR) {
    return null;
  }

  return parsedMeetingYear;
};

export const parseMeetingPeriod = (rawMeetingPeriod?: string) => {
  const parsedMeetingPeriod = Number(rawMeetingPeriod);
  if (!Number.isInteger(parsedMeetingPeriod) || !VALID_MEETING_PERIODS.has(parsedMeetingPeriod)) {
    return null;
  }

  return parsedMeetingPeriod;
};

export const createMeetingAttendanceKey = (meetingYear: number, meetingPeriod: number) => {
  return `${meetingYear}_${meetingPeriod}`;
};

export const createMeetingAttendanceFieldKey = (meetingYear: number, meetingPeriod: number) => {
  return `attendance${meetingYear}_${meetingPeriod}` as `attendance${number}_${number}`;
};

export const normalizeOptionalText = (rawValue: unknown, maxLength: number, fieldPrefix: string) => {
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

export const normalizeRequiredText = (rawValue: unknown, fieldName: string, maxLength: number) => {
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

export const normalizeOptionalEmail = (rawValue: unknown) => {
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

export const normalizeOptionalDate = (rawValue: unknown, fieldName: string) => {
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

export const isAdminUser = (authenticatedUser: AuthenticatedUser) => {
  return normalizeBoolean(authenticatedUser.isAdmin, false);
};

export const requireAdminUser = (authenticatedUser: AuthenticatedUser | undefined) => {
  if (!authenticatedUser) {
    throw new HttpError(401, '인증된 사용자 정보가 없습니다.');
  }

  if (!isAdminUser(authenticatedUser)) {
    throw new HttpError(403, '관리자만 회원 정보를 관리할 수 있습니다.');
  }

  return authenticatedUser;
};

export const normalizeKoreanSearchText = (value: string) => {
  return value.normalize('NFC').replace(/\s+/g, '').trim();
};

export const normalizeMemberMutationPayload = (
  payload: MemberMutationDTO,
): MemberMutationPayload => {
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
