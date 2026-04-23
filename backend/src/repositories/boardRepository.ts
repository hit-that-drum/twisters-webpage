import pool from '../config/database.js';
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

type BoardImageColumnMeta = {
  data_type: string;
  udt_name: string;
};

class BoardRepository {
  private async ensureBoardImageColumn(tableName: 'board' | 'test_board') {
    const columnResult = await pool.query<BoardImageColumnMeta>(
      `SELECT data_type, udt_name
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = 'imageUrl'
        LIMIT 1`,
      [tableName],
    );

    const imageColumn = columnResult.rows[0];

    if (!imageColumn) {
      await pool.query(
        `ALTER TABLE ${tableName} ADD COLUMN "imageUrl" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`,
      );
      return;
    }

    if (imageColumn.udt_name !== '_text') {
      await pool.query(`
        ALTER TABLE ${tableName}
        ALTER COLUMN "imageUrl" TYPE TEXT[]
        USING CASE
          WHEN "imageUrl" IS NULL OR BTRIM("imageUrl") = '' THEN ARRAY[]::TEXT[]
          ELSE ARRAY["imageUrl"]
        END
      `);
    }

    await pool.query(`UPDATE ${tableName} SET "imageUrl" = ARRAY[]::TEXT[] WHERE "imageUrl" IS NULL`);
    await pool.query(
      `ALTER TABLE ${tableName} ALTER COLUMN "imageUrl" SET DEFAULT ARRAY[]::TEXT[]`,
    );
    await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN "imageUrl" SET NOT NULL`);
  }

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
            "imageUrl" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
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
            "imageUrl" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
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

        await this.ensureBoardImageColumn('board');
        await this.ensureBoardImageColumn('test_board');

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
      `SELECT id, "authorId", title, "createUser", "createDate", "updateUser", "updateDate", "imageUrl", content, pinned FROM ${boardTableName} ${whereClause} ORDER BY ${orderBy} LIMIT 200`,
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
    const result = await pool.query<{ id: number }>(
      `INSERT INTO ${boardTableName} ("authorId", title, "createUser", "updateUser", "imageUrl", content, pinned) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        payload.authorId,
        payload.title,
        payload.auditUser,
        payload.auditUser,
        payload.imageUrl,
        payload.content,
        payload.pinned,
      ],
    );

    return result.rows[0]?.id ?? null;
  }

  async updateById(scope: DataScope, boardId: number, payload: BoardMutationPayload) {
    const boardTableName = getScopedTableNames(scope).board;
    const result = await pool.query(
      `UPDATE ${boardTableName} SET title = $1, "updateUser" = $2, "imageUrl" = $3, content = $4, pinned = $5 WHERE id = $6`,
      [payload.title, payload.auditUser, payload.imageUrl, payload.content, payload.pinned, boardId],
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
