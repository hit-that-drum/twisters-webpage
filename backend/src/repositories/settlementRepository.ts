import pool from '../db.js';
import { type SettlementMutationPayload, type SettlementRow } from '../types/settlement.types.js';

class SettlementRepository {
  async findAll() {
    const result = await pool.query<SettlementRow>(
      `
        SELECT
          id,
          TO_CHAR(settlement_date, 'YYYY/MM/DD') AS date,
          item,
          amount,
          relation
        FROM settlement
        ORDER BY settlement_date DESC, id DESC
      `,
    );

    return result.rows;
  }

  async create(payload: SettlementMutationPayload) {
    await pool.query(
      'INSERT INTO settlement (settlement_date, item, amount, relation) VALUES ($1, $2, $3, $4)',
      [payload.date, payload.item, payload.amount, payload.relation],
    );
  }

  async updateById(settlementId: number, payload: SettlementMutationPayload) {
    const result = await pool.query(
      'UPDATE settlement SET settlement_date = $1, item = $2, amount = $3, relation = $4 WHERE id = $5',
      [payload.date, payload.item, payload.amount, payload.relation, settlementId],
    );

    return result.rowCount ?? 0;
  }

  async deleteById(settlementId: number) {
    const result = await pool.query('DELETE FROM settlement WHERE id = $1', [settlementId]);
    return result.rowCount ?? 0;
  }
}

export const settlementRepository = new SettlementRepository();
