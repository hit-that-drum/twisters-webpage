import pool from '../db.js';
import { type NoticeMutationPayload, type NoticeRow } from '../types/notice.types.js';
import { getScopedTableNames, type DataScope } from '../utils/dataScope.js';

let ensureNoticeSchemaPromise: Promise<void> | null = null;

class NoticeRepository {
  private async ensureNoticeSchema() {
    if (!ensureNoticeSchemaPromise) {
      ensureNoticeSchemaPromise = (async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS notice (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            "createUser" VARCHAR(100) NOT NULL,
            "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updateUser" VARCHAR(100) NOT NULL,
            "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            content TEXT NOT NULL,
            pinned BOOLEAN NOT NULL DEFAULT FALSE
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS test_notice (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            "createUser" VARCHAR(100) NOT NULL,
            "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updateUser" VARCHAR(100) NOT NULL,
            "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            content TEXT NOT NULL,
            pinned BOOLEAN NOT NULL DEFAULT FALSE
          )
        `);

        await pool.query(`
          CREATE OR REPLACE FUNCTION update_notice_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW."updateDate" = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_notice_update_date ON notice');
        await pool.query(`
          CREATE TRIGGER trg_notice_update_date
          BEFORE UPDATE ON notice
          FOR EACH ROW
          EXECUTE FUNCTION update_notice_updated_at()
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_test_notice_update_date ON test_notice');
        await pool.query(`
          CREATE TRIGGER trg_test_notice_update_date
          BEFORE UPDATE ON test_notice
          FOR EACH ROW
          EXECUTE FUNCTION update_notice_updated_at()
        `);
      })().catch((error) => {
        ensureNoticeSchemaPromise = null;
        throw error;
      });
    }

    await ensureNoticeSchemaPromise;
  }

  async initializeSchema() {
    await this.ensureNoticeSchema();
  }

  async findAll(scope: DataScope) {
    const tableName = getScopedTableNames(scope).notice;
    const result = await pool.query<NoticeRow>(
      `SELECT id, title, "createUser", "createDate", "updateUser", "updateDate", content, pinned FROM ${tableName} ORDER BY pinned DESC, "createDate" DESC`,
    );
    return result.rows;
  }

  async create(scope: DataScope, payload: NoticeMutationPayload) {
    const tableName = getScopedTableNames(scope).notice;
    await pool.query(
      `INSERT INTO ${tableName} (title, "createUser", "updateUser", content, pinned) VALUES ($1, $2, $3, $4, $5)`,
      [payload.title, payload.auditUser, payload.auditUser, payload.content, payload.pinned],
    );
  }

  async updateById(scope: DataScope, noticeId: number, payload: NoticeMutationPayload) {
    const tableName = getScopedTableNames(scope).notice;
    const result = await pool.query(
      `UPDATE ${tableName} SET title = $1, "updateUser" = $2, content = $3, pinned = $4 WHERE id = $5`,
      [payload.title, payload.auditUser, payload.content, payload.pinned, noticeId],
    );
    return result.rowCount ?? 0;
  }

  async deleteById(scope: DataScope, noticeId: number) {
    const tableName = getScopedTableNames(scope).notice;
    const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [noticeId]);
    return result.rowCount ?? 0;
  }
}

export const noticeRepository = new NoticeRepository();
