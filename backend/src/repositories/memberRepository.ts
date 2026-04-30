/**
 * Member repository facade. Implementation is split across ./member —
 * memberSchema (idempotent migrations for `members` / `test_members`),
 * memberCoreRepository (member-table CRUD), and memberDuesQueryRepository
 * (the cross-table dues lookup against settlement, only consumed by
 * memberDuesService). This facade preserves the flat `memberRepository.X`
 * surface used by index.ts startup and the four services that touch
 * member data.
 */
import { ensureMembersSchema } from './member/memberSchema.js';
import { memberCoreRepository } from './member/memberCoreRepository.js';
import { memberDuesQueryRepository } from './member/memberDuesQueryRepository.js';

export const memberRepository = {
  ensureMembersSchema: () => ensureMembersSchema(),

  // memberCoreRepository
  findAllMembers: memberCoreRepository.findAllMembers.bind(memberCoreRepository),
  findAllMemberNames: memberCoreRepository.findAllMemberNames.bind(memberCoreRepository),
  findMemberByEmail: memberCoreRepository.findMemberByEmail.bind(memberCoreRepository),
  findMemberById: memberCoreRepository.findMemberById.bind(memberCoreRepository),
  findMemberByEmailExcludingId:
    memberCoreRepository.findMemberByEmailExcludingId.bind(memberCoreRepository),
  createMember: memberCoreRepository.createMember.bind(memberCoreRepository),
  updateMember: memberCoreRepository.updateMember.bind(memberCoreRepository),
  deleteMember: memberCoreRepository.deleteMember.bind(memberCoreRepository),

  // memberDuesQueryRepository
  findSettlementDuesRows:
    memberDuesQueryRepository.findSettlementDuesRows.bind(memberDuesQueryRepository),
};

export { memberCoreRepository, memberDuesQueryRepository };
