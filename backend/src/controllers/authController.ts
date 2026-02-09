import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import pool from '../db.js';
import { buildAuthResponse } from '../authUtils.js';

const SALT_ROUNDS = 10;
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
}

interface PublicUserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
}

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export const signUp = async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  try {
    if (!name || !email || !password)
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
    );
    const userId = result.insertId;

    return res.status(201).json(buildAuthResponse({ id: userId, name, email }, '회원가입 성공!'));
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;

  if (!authenticatedUser) {
    return res.status(401).json({ error: '인증된 사용자 정보가 없습니다.' });
  }

  try {
    const [rows] = await pool.query<PublicUserRow[]>('SELECT id, name, email FROM users WHERE id = ?', [
      authenticatedUser.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: '해당 사용자를 찾을 수 없습니다.' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('DB 조회 에러:', error);
    return res.status(500).json({ error: '데이터베이스 조회 중 오류가 발생했습니다.' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const { userId } = req.query;

  if (!authenticatedUser) {
    return res.status(401).json({ error: '인증된 사용자 정보가 없습니다.' });
  }

  try {
    if (userId) {
      const requestedUserId = Number(userId);
      if (!Number.isInteger(requestedUserId)) {
        return res.status(400).json({ error: '유효한 userId가 필요합니다.' });
      }

      if (requestedUserId !== authenticatedUser.id) {
        return res.status(403).json({ error: '본인 정보만 조회할 수 있습니다.' });
      }

      const [rows] = await pool.query<PublicUserRow[]>('SELECT id, name, email FROM users WHERE id = ?', [
        requestedUserId,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ error: '해당 ID의 사용자를 찾을 수 없습니다.' });
      }
      return res.json(rows[0]);
    } else {
      const [rows] = await pool.query<PublicUserRow[]>('SELECT id, name, email FROM users');
      return res.json(rows);
    }
  } catch (error) {
    console.error('DB 조회 에러:', error);
    res.status(500).json({ error: '데이터베이스 조회 중 오류가 발생했습니다.' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, newPassword } = req.body as {
    email?: string;
    newPassword?: string;
  };

  if (!email || !newPassword) {
    return res.status(400).json({ error: '이메일과 새 비밀번호를 입력해주세요.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const [result] = await pool.query<ResultSetHeader>('UPDATE users SET password = ? WHERE email = ?', [
      hashedPassword,
      email,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 이메일의 사용자를 찾을 수 없습니다.' });
    }
    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('Password Reset Error:', error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    return res.status(400).json({ error: '구글 토큰이 필요합니다.' });
  }

  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID as string,
    });

    const payload = ticket.getPayload();

    if (!payload) return res.status(400).json({ error: '잘못된 토큰입니다.' });

    const { email, name, sub: googleId } = payload;
    if (!email || !name || !googleId) {
      return res.status(400).json({ error: '구글 사용자 정보를 가져오지 못했습니다.' });
    }

    let [rows] = await pool.query<PublicUserRow[]>('SELECT id, name, email FROM users WHERE email = ?', [
      email,
    ]);

    if (rows.length === 0) {
      await pool.query<ResultSetHeader>('INSERT INTO users (email, name, google_id) VALUES (?, ?, ?)', [
        email,
        name,
        googleId,
      ]);
      [rows] = await pool.query<PublicUserRow[]>('SELECT id, name, email FROM users WHERE email = ?', [
        email,
      ]);
    }

    const user = rows[0];
    if (!user) {
      return res.status(500).json({ error: '구글 로그인 사용자 생성에 실패했습니다.' });
    }

    return res.json(buildAuthResponse(user, '구글 로그인 성공'));
  } catch (error) {
    res.status(500).json({ error: '구글 인증 실패' });
  }
};
