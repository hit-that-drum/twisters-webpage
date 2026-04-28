/**
 * Cross-table read used by `memberDuesService` to derive each member's
 * dues-paid status from the settlement ledger. Lives under member/
 * because the dues view is owned by the member feature, even though the
 * underlying rows are stored in the settlement table.
 */
import pool from '../../config/database.js';
import { type SettlementDuesRow } from '../../types/member.types.js';
import { getScopedTableNames, type DataScope } from '../../utils/dataScope.js';

class MemberDuesQueryRepository {
  async findSettlementDuesRows(scope: DataScope, duesBaseYear: number) {
    const settlementTable = getScopedTableNames(scope).settlement;
    const result = await pool.query<SettlementDuesRow>(
      `
        SELECT
          item,
          EXTRACT(YEAR FROM settlement_date)::int AS year
        FROM ${settlementTable}
        WHERE settlement_date >= MAKE_DATE($1, 1, 1)
          AND item LIKE '%회비%'
          AND amount > 0
        ORDER BY settlement_date ASC, id ASC
      `,
      [duesBaseYear],
    );

    return result.rows;
  }
}

export const memberDuesQueryRepository = new MemberDuesQueryRepository();
