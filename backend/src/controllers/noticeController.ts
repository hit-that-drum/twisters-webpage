import { type Request, type Response } from 'express';
import { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import pool from '../db.js';

interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
}

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

interface NoticeRow extends RowDataPacket {
  id: number;
  title: string;
  createUser: string;
  createDate: Date;
  updateUser: string;
  updateDate: Date;
  content: string;
  pinned: boolean | number;
}

const parseNoticeId = (rawNoticeId?: string) => {
  const noticeId = Number(rawNoticeId);
  if (!Number.isInteger(noticeId) || noticeId <= 0) {
    return null;
  }

  return noticeId;
};

const parsePinned = (rawPinned: unknown, defaultValue = false) => {
  if (typeof rawPinned === 'boolean') {
    return rawPinned;
  }

  if (typeof rawPinned === 'number') {
    return rawPinned === 1;
  }

  if (typeof rawPinned === 'string') {
    const normalized = rawPinned.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return defaultValue;
};

const resolveAuditUser = (authenticatedUser: AuthenticatedUser) => {
  const normalizedName = authenticatedUser.name?.trim();
  if (normalizedName) {
    return normalizedName;
  }

  return authenticatedUser.email;
};

export const getNotices = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<NoticeRow[]>(
      'SELECT id, title, createUser, createDate, updateUser, updateDate, content, pinned FROM notice ORDER BY pinned DESC, createDate DESC',
    );

    return res.json(
      rows.map((row) => ({
        ...row,
        pinned: Boolean(row.pinned),
      })),
    );
  } catch (error) {
    console.error('Notice list fetch error:', error);
    return res.status(500).json({ error: '공지사항 조회 중 오류가 발생했습니다.' });
  }
};

export const createNotice = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const { title, content, pinned } = req.body as {
    title?: string;
    content?: string;
    pinned?: unknown;
  };

  if (!authenticatedUser) {
    return res.status(401).json({ error: '인증된 사용자 정보가 없습니다.' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!trimmedTitle || !trimmedContent) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }

  try {
    const auditUser = resolveAuditUser(authenticatedUser);
    const normalizedPinned = parsePinned(pinned, false);

    await pool.query<ResultSetHeader>(
      'INSERT INTO notice (title, createUser, updateUser, content, pinned) VALUES (?, ?, ?, ?, ?)',
      [trimmedTitle, auditUser, auditUser, trimmedContent, normalizedPinned],
    );

    return res.status(201).json({ message: '공지사항이 등록되었습니다.' });
  } catch (error) {
    console.error('Notice creation error:', error);
    return res.status(500).json({ error: '공지사항 등록 중 오류가 발생했습니다.' });
  }
};

export const updateNotice = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const parsedNoticeId = parseNoticeId(req.params.id);
  const { title, content, pinned } = req.body as {
    title?: string;
    content?: string;
    pinned?: unknown;
  };

  if (!authenticatedUser) {
    return res.status(401).json({ error: '인증된 사용자 정보가 없습니다.' });
  }

  if (!parsedNoticeId) {
    return res.status(400).json({ error: '유효한 공지사항 ID가 필요합니다.' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!trimmedTitle || !trimmedContent) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }

  try {
    const auditUser = resolveAuditUser(authenticatedUser);
    const normalizedPinned = parsePinned(pinned, false);

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE notice SET title = ?, updateUser = ?, content = ?, pinned = ? WHERE id = ?',
      [trimmedTitle, auditUser, trimmedContent, normalizedPinned, parsedNoticeId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 공지사항을 찾을 수 없습니다.' });
    }

    return res.json({ message: '공지사항이 수정되었습니다.' });
  } catch (error) {
    console.error('Notice update error:', error);
    return res.status(500).json({ error: '공지사항 수정 중 오류가 발생했습니다.' });
  }
};

export const deleteNotice = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const parsedNoticeId = parseNoticeId(req.params.id);

  if (!authenticatedUser) {
    return res.status(401).json({ error: '인증된 사용자 정보가 없습니다.' });
  }

  if (!parsedNoticeId) {
    return res.status(400).json({ error: '유효한 공지사항 ID가 필요합니다.' });
  }

  try {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM notice WHERE id = ?', [parsedNoticeId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 공지사항을 찾을 수 없습니다.' });
    }

    return res.json({ message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('Notice delete error:', error);
    return res.status(500).json({ error: '공지사항 삭제 중 오류가 발생했습니다.' });
  }
};
