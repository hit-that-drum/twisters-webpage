import pool from '../../config/database.js';
import {
  type BoardListFilters,
  type BoardLookupRow,
  type BoardMutationPayload,
  type BoardRow,
  type BoardSortOption,
} from '../../types/board.types.js';
import { getScopedTableNames, type DataScope } from '../../utils/dataScope.js';

const BOARD_ORDER_BY: Record<BoardSortOption, string> = {
  latest: 'pinned DESC, "createDate" DESC, id DESC',
  oldest: 'pinned DESC, "createDate" ASC, id ASC',
  updated: 'pinned DESC, "updateDate" DESC, id DESC',
  pinned: 'pinned DESC, "createDate" DESC, id DESC',
};

class BoardPostRepository {
  async findAll(scope: DataScope, filters: BoardListFilters) {
    const boardTableName = getScopedTableNames(scope).board;
    const orderBy = BOARD_ORDER_BY[filters.sort] ?? BOARD_ORDER_BY.latest;
    const offset = (filters.page - 1) * filters.pageSize;

    const values: Array<string | number> = [];
    let whereClause = '';

    if (filters.search) {
      values.push(`%${filters.search}%`);
      whereClause = 'WHERE title ILIKE $1 OR content ILIKE $1 OR "createUser" ILIKE $1';
    }

    const result = await pool.query<BoardRow & { totalCount: number }>(
      `SELECT id, "authorId", title, "createUser", "createDate", "updateUser", "updateDate", "imageUrl", content, pinned, COUNT(*) OVER()::int AS "totalCount"
         FROM ${boardTableName}
         ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, filters.pageSize, offset],
    );
    let totalCount = result.rows[0]?.totalCount ?? 0;
    if (result.rows.length === 0 && offset > 0) {
      const countResult = await pool.query<{ totalCount: number }>(
        `SELECT COUNT(*)::int AS "totalCount"
           FROM ${boardTableName}
           ${whereClause}`,
        values,
      );
      totalCount = countResult.rows[0]?.totalCount ?? 0;
    }

    return {
      rows: result.rows.map(({ totalCount: _totalCount, ...row }) => row),
      totalCount,
    };
  }

  async findPostRowById(scope: DataScope, boardId: number) {
    const boardTableName = getScopedTableNames(scope).board;
    const result = await pool.query<BoardRow>(
      `SELECT id, "authorId", title, "createUser", "createDate", "updateUser", "updateDate", "imageUrl", content, pinned
         FROM ${boardTableName}
        WHERE id = $1
        LIMIT 1`,
      [boardId],
    );
    return result.rows[0] ?? null;
  }

  async findReactedByUser(scope: DataScope, userId: number, filters: BoardListFilters) {
    const { board: boardTableName, boardReactions: boardReactionsTableName } =
      getScopedTableNames(scope);
    const orderBy = BOARD_ORDER_BY[filters.sort] ?? BOARD_ORDER_BY.latest;
    const offset = (filters.page - 1) * filters.pageSize;
    const values: Array<string | number> = [userId];

    let whereClause = `WHERE EXISTS (
      SELECT 1
        FROM ${boardReactionsTableName} br
       WHERE br."boardId" = ${boardTableName}.id
         AND br."userId" = $1
    )`;

    if (filters.search) {
      values.push(`%${filters.search}%`);
      whereClause += ` AND (title ILIKE $${values.length} OR content ILIKE $${values.length} OR "createUser" ILIKE $${values.length})`;
    }

    const result = await pool.query<BoardRow & { totalCount: number }>(
      `SELECT id, "authorId", title, "createUser", "createDate", "updateUser", "updateDate", "imageUrl", ''::text AS content, pinned, COUNT(*) OVER()::int AS "totalCount"
         FROM ${boardTableName}
         ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, filters.pageSize, offset],
    );
    let totalCount = result.rows[0]?.totalCount ?? 0;
    if (result.rows.length === 0 && offset > 0) {
      const countResult = await pool.query<{ totalCount: number }>(
        `SELECT COUNT(*)::int AS "totalCount"
           FROM ${boardTableName}
           ${whereClause}`,
        values,
      );
      totalCount = countResult.rows[0]?.totalCount ?? 0;
    }

    return {
      rows: result.rows.map(({ totalCount: _totalCount, ...row }) => row),
      totalCount,
    };
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
}

export const boardPostRepository = new BoardPostRepository();
