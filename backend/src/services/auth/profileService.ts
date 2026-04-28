/**
 * Owns the authenticated "me" surface — fetching the current user's
 * profile, updating editable details (phone, birthDate), and updating
 * the profile image. The birthDate validator lives here because it is
 * only consumed by `updateMe`; if another caller appears it should be
 * promoted to `utils/`.
 */
import { HttpError } from '../../errors/httpError.js';
import { authRepository } from '../../repositories/authRepository.js';
import {
  type MeUser,
  type UpdateMeDTO,
  type UpdateProfileImageDTO,
} from '../../types/auth.types.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import { normalizeBoolean, requireAuthenticatedUser } from '../../utils/authScope.js';
import {
  normalizeOptionalPhoneNumber,
  normalizePhoneNumber,
} from '../../utils/phoneNumber.js';

const normalizeOptionalBirthDate = (rawValue: unknown) => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new HttpError(400, '생년월일 형식이 올바르지 않습니다.');
  }

  const normalizedDate = rawValue.trim();
  if (!normalizedDate) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new HttpError(400, '생년월일은 YYYY-MM-DD 형식이어야 합니다.');
  }

  const [yearText, monthText, dayText] = normalizedDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new HttpError(400, '생년월일 형식이 올바르지 않습니다.');
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new HttpError(400, '유효한 생년월일을 입력해주세요.');
  }

  return normalizedDate;
};

class ProfileService {
  async getMe(authenticatedUser: AuthenticatedUser | undefined): Promise<MeUser> {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    const me = await authRepository.findMeById(currentUser.id);

    if (!me) {
      throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
    }

    return {
      id: me.id,
      name: me.name,
      email: me.email,
      profileImage:
        typeof me.profileImage === 'string' && me.profileImage.trim().length > 0
          ? me.profileImage.trim()
          : null,
      phone:
        typeof me.phone === 'string' && me.phone.trim().length > 0
          ? normalizePhoneNumber(me.phone)
          : null,
      birthDate:
        typeof me.birthDate === 'string' && me.birthDate.trim().length > 0 ? me.birthDate : null,
      joinedAt:
        typeof me.joinedAt === 'string' && me.joinedAt.trim().length > 0 ? me.joinedAt : null,
      isAdmin: Boolean(me.isAdmin),
      isTest: normalizeBoolean(me.isTest, false),
    };
  }

  async updateMe(authenticatedUser: AuthenticatedUser | undefined, payload: UpdateMeDTO) {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    const phone = normalizeOptionalPhoneNumber(payload.phone);
    const birthDate = normalizeOptionalBirthDate(payload.birthDate);

    const updated = await authRepository.updateMeProfileByUserId(currentUser.id, {
      phone,
      birthDate,
    });
    if (!updated) {
      throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
    }

    return {
      message: '프로필 정보가 저장되었습니다.',
      phone,
      birthDate,
    };
  }

  async updateProfileImage(
    authenticatedUser: AuthenticatedUser | undefined,
    payload: UpdateProfileImageDTO,
  ) {
    const currentUser = requireAuthenticatedUser(authenticatedUser);
    const profileImage =
      typeof payload.profileImage === 'string' && payload.profileImage.trim().length > 0
        ? payload.profileImage.trim()
        : null;

    if (profileImage && profileImage.length > 5_000_000) {
      throw new HttpError(400, '프로필 이미지는 5MB 이하 문자열 데이터만 저장할 수 있습니다.');
    }

    const updated = await authRepository.updateProfileImageByUserId(currentUser.id, profileImage);
    if (!updated) {
      throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
    }

    return {
      message: '프로필 이미지가 저장되었습니다.',
      profileImage,
    };
  }
}

export const profileService = new ProfileService();
