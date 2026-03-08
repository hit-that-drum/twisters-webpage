import pool from '../db.js';
import {
  type BoardCommentLookupRow,
  type BoardCommentMutationPayload,
  type BoardCommentRow,
  type BoardListFilters,
  type BoardLookupRow,
  type BoardMutationPayload,
  type BoardRow,
  type BoardSortOption,
} from '../types/board.types.js';
import { getScopedTableNames, type DataScope } from '../utils/dataScope.js';

const BOARD_ORDER_BY: Record<BoardSortOption, string> = {
  latest: 'pinned DESC, "createDate" DESC, id DESC',
  oldest: 'pinned DESC, "createDate" ASC, id ASC',
  updated: 'pinned DESC, "updateDate" DESC, id DESC',
  pinned: 'pinned DESC, "createDate" DESC, id DESC',
};

let ensureBoardSchemaPromise: Promise<void> | null = null;

class BoardRepository {
  private async ensureBoardSchema() {
    if (!ensureBoardSchemaPromise) {
      ensureBoardSchemaPromise = (async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS board (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
          CREATE TABLE IF NOT EXISTS test_board (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            "createUser" VARCHAR(100) NOT NULL,
            "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updateUser" VARCHAR(100) NOT NULL,
            "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            content TEXT NOT NULL,
            pinned BOOLEAN NOT NULL DEFAULT FALSE
          )
        `);

        await pool.query('ALTER TABLE board ADD COLUMN IF NOT EXISTS "authorId" INTEGER');
        await pool.query('ALTER TABLE board ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE');
        await pool.query('ALTER TABLE test_board ADD COLUMN IF NOT EXISTS "authorId" INTEGER');
        await pool.query(
          'ALTER TABLE test_board ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE',
        );

        await pool.query(`
          CREATE TABLE IF NOT EXISTS board_comments (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "boardId" INTEGER NOT NULL REFERENCES board(id) ON DELETE CASCADE,
            "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
            "authorName" VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS test_board_comments (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "boardId" INTEGER NOT NULL REFERENCES test_board(id) ON DELETE CASCADE,
            "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
            "authorName" VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await pool.query('CREATE INDEX IF NOT EXISTS idx_board_create_date ON board ("createDate" DESC)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_board_author_id ON board ("authorId")');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_test_board_create_date ON test_board ("createDate" DESC)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_test_board_author_id ON test_board ("authorId")');
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_board_comments_board_id ON board_comments ("boardId", "createdAt" ASC)',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_board_comments_author_id ON board_comments ("authorId")',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_test_board_comments_board_id ON test_board_comments ("boardId", "createdAt" ASC)',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_test_board_comments_author_id ON test_board_comments ("authorId")',
        );

        await pool.query(`
          CREATE OR REPLACE FUNCTION update_board_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW."updateDate" = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

        await pool.query(`
          CREATE OR REPLACE FUNCTION update_board_comment_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW."updatedAt" = NOW();
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

        await pool.query('DROP TRIGGER IF EXISTS trg_board_comment_update_date ON board_comments');
        await pool.query(`
          CREATE TRIGGER trg_board_comment_update_date
          BEFORE UPDATE ON board_comments
          FOR EACH ROW
          EXECUTE FUNCTION update_board_comment_updated_at()
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_test_board_comment_update_date ON test_board_comments');
        await pool.query(`
          CREATE TRIGGER trg_test_board_comment_update_date
          BEFORE UPDATE ON test_board_comments
          FOR EACH ROW
          EXECUTE FUNCTION update_board_comment_updated_at()
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

  async findAll(scope: DataScope, filters: BoardListFilters) {
    const boardTableName = getScopedTableNames(scope).board;
    const orderBy = BOARD_ORDER_BY[filters.sort] ?? BOARD_ORDER_BY.latest;

    const values: string[] = [];
    let whereClause = '';

    if (filters.search) {
      values.push(`%${filters.search}%`);
      whereClause = 'WHERE title ILIKE $1 OR content ILIKE $1 OR "createUser" ILIKE $1';
    }

    const result = await pool.query<BoardRow>(
      `SELECT id, "authorId", title, "createUser", "createDate", "updateUser", "updateDate", content, pinned FROM ${boardTableName} ${whereClause} ORDER BY ${orderBy} LIMIT 200`,
      values,
    );
    return result.rows;
  }

  async findById(scope: DataScope, boardId: number) {
    const boardTableName = getScopedTableNames(scope).board;
    const result = await pool.query<BoardLookupRow>(
      `SELECT id, "authorId", pinned FROM ${boardTableName} WHERE id = $1 LIMIT 1`,
      [boardId],
    );
    return result.rows[0] ?? null;
  }

  async create(scope: DataScope, payload: BoardMutationPayload) {
    const boardTableName = getScopedTableNames(scope).board;
    await pool.query(
      `INSERT INTO ${boardTableName} ("authorId", title, "createUser", "updateUser", content, pinned) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        payload.authorId,
        payload.title,
        payload.auditUser,
        payload.auditUser,
        payload.content,
        payload.pinned,
      ],
    );
  }

  async updateById(scope: DataScope, boardId: number, payload: BoardMutationPayload) {
    const boardTableName = getScopedTableNames(scope).board;
    const result = await pool.query(
      `UPDATE ${boardTableName} SET title = $1, "updateUser" = $2, content = $3, pinned = $4 WHERE id = $5`,
      [payload.title, payload.auditUser, payload.content, payload.pinned, boardId],
    );
    return result.rowCount ?? 0;
  }

  async deleteById(scope: DataScope, boardId: number) {
    const boardTableName = getScopedTableNames(scope).board;
    const result = await pool.query(`DELETE FROM ${boardTableName} WHERE id = $1`, [boardId]);
    return result.rowCount ?? 0;
  }

  async findCommentsByBoardId(scope: DataScope, boardId: number) {
    const boardCommentsTableName = getScopedTableNames(scope).boardComments;
    const result = await pool.query<BoardCommentRow>(
      `SELECT id, "boardId", "authorId", "authorName", content, "createdAt", "updatedAt" FROM ${boardCommentsTableName} WHERE "boardId" = $1 ORDER BY "createdAt" ASC, id ASC`,
      [boardId],
    );
    return result.rows;
  }

  async findCommentById(scope: DataScope, boardId: number, commentId: number) {
    const boardCommentsTableName = getScopedTableNames(scope).boardComments;
    const result = await pool.query<BoardCommentLookupRow>(
      `SELECT id, "boardId", "authorId" FROM ${boardCommentsTableName} WHERE "boardId" = $1 AND id = $2 LIMIT 1`,
      [boardId, commentId],
    );
    return result.rows[0] ?? null;
  }

  async createComment(scope: DataScope, payload: BoardCommentMutationPayload) {
    const boardCommentsTableName = getScopedTableNames(scope).boardComments;
    await pool.query(
      `INSERT INTO ${boardCommentsTableName} ("boardId", "authorId", "authorName", content) VALUES ($1, $2, $3, $4)`,
      [payload.boardId, payload.authorId, payload.authorName, payload.content],
    );
  }

  async deleteCommentById(scope: DataScope, boardId: number, commentId: number) {
    const boardCommentsTableName = getScopedTableNames(scope).boardComments;
    const result = await pool.query(`DELETE FROM ${boardCommentsTableName} WHERE "boardId" = $1 AND id = $2`, [
      boardId,
      commentId,
    ]);
    return result.rowCount ?? 0;
  }
}

export const boardRepository = new BoardRepository();
