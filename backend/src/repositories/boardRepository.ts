import pool from '../db.js';
import { type BoardMutationPayload, type BoardRow } from '../types/board.types.js';
import { getScopedTableNames, type DataScope } from '../utils/dataScope.js';

let ensureBoardSchemaPromise: Promise<void> | null = null;

class BoardRepository {
  private async ensureBoardSchema() {
    if (!ensureBoardSchemaPromise) {
      ensureBoardSchemaPromise = (async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS board (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            "createUser" VARCHAR(100) NOT NULL,
            "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updateUser" VARCHAR(100) NOT NULL,
            "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            content TEXT NOT NULL
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS test_board (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            "createUser" VARCHAR(100) NOT NULL,
            "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updateUser" VARCHAR(100) NOT NULL,
            "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            content TEXT NOT NULL
          )
        `);

        await pool.query(`
          CREATE OR REPLACE FUNCTION update_board_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW."updateDate" = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_board_update_date ON board');
        await pool.query(`
          CREATE TRIGGER trg_board_update_date
          BEFORE UPDATE ON board
          FOR EACH ROW
          EXECUTE FUNCTION update_board_updated_at()
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_test_board_update_date ON test_board');
        await pool.query(`
          CREATE TRIGGER trg_test_board_update_date
          BEFORE UPDATE ON test_board
          FOR EACH ROW
          EXECUTE FUNCTION update_board_updated_at()
        `);
      })().catch((error) => {
        ensureBoardSchemaPromise = null;
        throw error;
      });
    }

    await ensureBoardSchemaPromise;
  }

  async initializeSchema() {
    await this.ensureBoardSchema();
  }

  async findAll(scope: DataScope) {
    const tableName = getScopedTableNames(scope).board;
    const result = await pool.query<BoardRow>(
      `SELECT id, title, "createUser", "createDate", "updateUser", "updateDate", content FROM ${tableName} ORDER BY "createDate" DESC, id DESC`,
    );
    return result.rows;
  }

  async create(scope: DataScope, payload: BoardMutationPayload) {
    const tableName = getScopedTableNames(scope).board;
    await pool.query(
      `INSERT INTO ${tableName} (title, "createUser", "updateUser", content) VALUES ($1, $2, $3, $4)`,
      [payload.title, payload.auditUser, payload.auditUser, payload.content],
    );
  }

  async updateById(scope: DataScope, boardId: number, payload: BoardMutationPayload) {
    const tableName = getScopedTableNames(scope).board;
    const result = await pool.query(
      `UPDATE ${tableName} SET title = $1, "updateUser" = $2, content = $3 WHERE id = $4`,
      [payload.title, payload.auditUser, payload.content, boardId],
    );
    return result.rowCount ?? 0;
  }

  async deleteById(scope: DataScope, boardId: number) {
    const tableName = getScopedTableNames(scope).board;
    const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [boardId]);
    return result.rowCount ?? 0;
  }
}

export const boardRepository = new BoardRepository();
