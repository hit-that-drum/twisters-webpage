import { memberRepository } from '../../repositories/memberRepository.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import { type MemberDuesStatus } from '../../types/member.types.js';
import { resolveDataScopeByUser } from '../../utils/dataScope.js';
import {
  DUES_BASE_YEAR,
  normalizeKoreanSearchText,
} from './memberValidation.js';

class MemberDuesService {
  /**
   * Cross-references member names against settlement line items to infer which
   * members have paid dues in each year from DUES_BASE_YEAR onward. A member
   * is considered paid for a given year when a matching settlement row from
   * that year contains their name (whitespace- and NFC-normalized).
   */
  async getMemberDuesDepositStatus(
    authenticatedUser: AuthenticatedUser | undefined,
  ): Promise<MemberDuesStatus[]> {
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
}

export const memberDuesService = new MemberDuesService();
