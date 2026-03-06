import pool from '../db.js';
import { type NoticeMutationPayload, type NoticeRow } from '../types/notice.types.js';

class NoticeRepository {
  async findAll() {
    const result = await pool.query<NoticeRow>(
      'SELECT id, title, "createUser", "createDate", "updateUser", "updateDate", content, pinned FROM notice ORDER BY pinned DESC, "createDate" DESC',
    );
    return result.rows;
  }

  async create(payload: NoticeMutationPayload) {
    await pool.query(
      'INSERT INTO notice (title, "createUser", "updateUser", content, pinned) VALUES ($1, $2, $3, $4, $5)',
      [payload.title, payload.auditUser, payload.auditUser, payload.content, payload.pinned],
    );
  }

  async updateById(noticeId: number, payload: NoticeMutationPayload) {
    const result = await pool.query(
      'UPDATE notice SET title = $1, "updateUser" = $2, content = $3, pinned = $4 WHERE id = $5',
      [payload.title, payload.auditUser, payload.content, payload.pinned, noticeId],
    );
    return result.rowCount ?? 0;
  }

  async deleteById(noticeId: number) {
    const result = await pool.query('DELETE FROM notice WHERE id = $1', [noticeId]);
    return result.rowCount ?? 0;
  }
}

export const noticeRepository = new NoticeRepository();
