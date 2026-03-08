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

const BOARD_ORDER_BY: Record<BoardSortOption, string> = {
  latest: 'pinned DESC, "createDate" DESC, id DESC',
  oldest: 'pinned DESC, "createDate" ASC, id ASC',
  updated: 'pinned DESC, "updateDate" DESC, id DESC',
  pinned: 'pinned DESC, "createDate" DESC, id DESC',
};

class BoardRepository {
  async findAll(filters: BoardListFilters) {
    const orderBy = BOARD_ORDER_BY[filters.sort] ?? BOARD_ORDER_BY.latest;

    const values: string[] = [];
    let whereClause = '';

    if (filters.search) {
      values.push(`%${filters.search}%`);
      whereClause = 'WHERE title ILIKE $1 OR content ILIKE $1 OR "createUser" ILIKE $1';
    }

    const result = await pool.query<BoardRow>(
      `SELECT id, "authorId", title, "createUser", "createDate", "updateUser", "updateDate", content, pinned FROM board ${whereClause} ORDER BY ${orderBy} LIMIT 200`,
      values,
    );
    return result.rows;
  }

  async findById(boardId: number) {
    const result = await pool.query<BoardLookupRow>(
      'SELECT id, "authorId", pinned FROM board WHERE id = $1 LIMIT 1',
      [boardId],
    );
    return result.rows[0] ?? null;
  }

  async create(payload: BoardMutationPayload) {
    await pool.query(
      'INSERT INTO board ("authorId", title, "createUser", "updateUser", content, pinned) VALUES ($1, $2, $3, $4, $5, $6)',
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

  async updateById(boardId: number, payload: BoardMutationPayload) {
    const result = await pool.query(
      'UPDATE board SET title = $1, "updateUser" = $2, content = $3, pinned = $4 WHERE id = $5',
      [payload.title, payload.auditUser, payload.content, payload.pinned, boardId],
    );
    return result.rowCount ?? 0;
  }

  async deleteById(boardId: number) {
    const result = await pool.query('DELETE FROM board WHERE id = $1', [boardId]);
    return result.rowCount ?? 0;
  }

  async findCommentsByBoardId(boardId: number) {
    const result = await pool.query<BoardCommentRow>(
      'SELECT id, "boardId", "authorId", "authorName", content, "createdAt", "updatedAt" FROM board_comments WHERE "boardId" = $1 ORDER BY "createdAt" ASC, id ASC',
      [boardId],
    );
    return result.rows;
  }

  async findCommentById(boardId: number, commentId: number) {
    const result = await pool.query<BoardCommentLookupRow>(
      'SELECT id, "boardId", "authorId" FROM board_comments WHERE "boardId" = $1 AND id = $2 LIMIT 1',
      [boardId, commentId],
    );
    return result.rows[0] ?? null;
  }

  async createComment(payload: BoardCommentMutationPayload) {
    await pool.query(
      'INSERT INTO board_comments ("boardId", "authorId", "authorName", content) VALUES ($1, $2, $3, $4)',
      [payload.boardId, payload.authorId, payload.authorName, payload.content],
    );
  }

  async deleteCommentById(boardId: number, commentId: number) {
    const result = await pool.query('DELETE FROM board_comments WHERE "boardId" = $1 AND id = $2', [
      boardId,
      commentId,
    ]);
    return result.rowCount ?? 0;
  }
}

export const boardRepository = new BoardRepository();
