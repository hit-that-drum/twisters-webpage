import pool from '../config/database.js';
import { type SettlementMutationPayload, type SettlementRow } from '../types/settlement.types.js';
import { getScopedTableNames, type DataScope } from '../utils/dataScope.js';

let ensureSettlementSchemaPromise: Promise<void> | null = null;

class SettlementRepository {
  private async ensureSettlementSchema() {
    if (!ensureSettlementSchemaPromise) {
      ensureSettlementSchemaPromise = (async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS settlement (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            settlement_date DATE NOT NULL,
            item VARCHAR(255) NOT NULL,
            amount INTEGER NOT NULL,
            relation VARCHAR(100) NOT NULL
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS test_settlement (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            settlement_date DATE NOT NULL,
            item VARCHAR(255) NOT NULL,
            amount INTEGER NOT NULL,
            relation VARCHAR(100) NOT NULL
          )
        `);

        await pool.query('CREATE INDEX IF NOT EXISTS idx_settlement_date ON settlement (settlement_date DESC)');
        await pool.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_unique_entry ON settlement (settlement_date, item, amount, relation)',
        );

        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_test_settlement_date ON test_settlement (settlement_date DESC)',
        );
        await pool.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_test_settlement_unique_entry ON test_settlement (settlement_date, item, amount, relation)',
        );
      })().catch((error) => {
        ensureSettlementSchemaPromise = null;
        throw error;
      });
    }

    await ensureSettlementSchemaPromise;
  }

  async initializeSchema() {
    await this.ensureSettlementSchema();
  }

  async findAll(scope: DataScope) {
    const tableName = getScopedTableNames(scope).settlement;
    const result = await pool.query<SettlementRow>(
      `
        SELECT
          id,
          TO_CHAR(settlement_date, 'YYYY/MM/DD') AS date,
          item,
          amount,
          relation
        FROM ${tableName}
        ORDER BY settlement_date DESC, id DESC
      `,
    );

    return result.rows;
  }

  async create(scope: DataScope, payload: SettlementMutationPayload) {
    const tableName = getScopedTableNames(scope).settlement;
    await pool.query(
      `INSERT INTO ${tableName} (settlement_date, item, amount, relation) VALUES ($1, $2, $3, $4)`,
      [payload.date, payload.item, payload.amount, payload.relation],
    );
  }

  async updateById(scope: DataScope, settlementId: number, payload: SettlementMutationPayload) {
    const tableName = getScopedTableNames(scope).settlement;
    const result = await pool.query(
      `UPDATE ${tableName} SET settlement_date = $1, item = $2, amount = $3, relation = $4 WHERE id = $5`,
      [payload.date, payload.item, payload.amount, payload.relation, settlementId],
    );

    return result.rowCount ?? 0;
  }

  async deleteById(scope: DataScope, settlementId: number) {
    const tableName = getScopedTableNames(scope).settlement;
    const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [settlementId]);
    return result.rowCount ?? 0;
  }
}

export const settlementRepository = new SettlementRepository();
