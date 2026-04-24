import { HttpError } from '../errors/httpError.js';
import { memberRepository } from '../repositories/memberRepository.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import { type Member, type MemberMutationDTO } from '../types/member.types.js';
import { resolveDataScopeByUser } from '../utils/dataScope.js';
import { normalizeBoolean } from '../utils/parseUtils.js';
import {
  normalizeMemberMutationPayload,
  parseMemberId,
  requireAdminUser,
} from './member/memberValidation.js';

export { memberDuesService } from './member/memberDuesService.js';
export { memberAttendanceService } from './member/memberAttendanceService.js';

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

  async createMember(authenticatedUser: AuthenticatedUser | undefined, payload: MemberMutationDTO) {
    const adminUser = requireAdminUser(authenticatedUser);
    const normalizedPayload = normalizeMemberMutationPayload(payload);
    const scope = resolveDataScopeByUser(adminUser);

    await memberRepository.ensureMembersSchema();

    if (normalizedPayload.email) {
      const existingMember = await memberRepository.findMemberByEmail(
        scope,
        normalizedPayload.email,
      );
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

  async deleteMember(
    authenticatedUser: AuthenticatedUser | undefined,
    rawMemberId: string | undefined,
  ) {
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
