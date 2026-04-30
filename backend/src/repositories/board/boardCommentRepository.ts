import pool from '../../config/database.js';
import {
  type BoardCommentLookupRow,
  type BoardCommentMutationPayload,
  type BoardCommentRow,
} from '../../types/board.types.js';
import { getScopedTableNames, type DataScope } from '../../utils/dataScope.js';

class BoardCommentRepository {
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
    const result = await pool.query(
      `DELETE FROM ${boardCommentsTableName} WHERE "boardId" = $1 AND id = $2`,
      [boardId, commentId],
    );
    return result.rowCount ?? 0;
  }
}

export const boardCommentRepository = new BoardCommentRepository();
