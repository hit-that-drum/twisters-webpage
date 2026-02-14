import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import pool from '../db.js';
import { buildAuthResponse } from '../authUtils.js';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MINUTES = 30;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
}

interface PublicUserRow {
  id: number;
  name: string;
  email: string;
}

interface MeUserRow {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean | number;
}

interface UserEmailRow {
  id: number;
  email: string;
}

interface PasswordResetLookupRow {
  id: number;
  user_id: number;
  expires_at: Date;
  used_at: Date | null;
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
    const result = await pool.query<{ id: number }>(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email.toLowerCase(), hashedPassword],
    );
    const userId = result.rows[0]?.id;

    if (!userId) {
      return res.status(500).json({ error: '회원가입 처리 중 사용자 ID를 확인하지 못했습니다.' });
    }

    return res.status(201).json(buildAuthResponse({ id: userId, name, email }, '회원가입 성공!'));
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
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
    const result = await pool.query<MeUserRow>(
      'SELECT id, name, email, "isAdmin" FROM users WHERE id = $1',
      [authenticatedUser.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '해당 사용자를 찾을 수 없습니다.' });
    }

    const me = result.rows[0];
    if (!me) {
      return res.status(404).json({ error: '해당 사용자를 찾을 수 없습니다.' });
    }

    return res.json({
      id: me.id,
      name: me.name,
      email: me.email,
      isAdmin: Boolean(me.isAdmin),
    });
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

      const result = await pool.query<PublicUserRow>('SELECT id, name, email FROM users WHERE id = $1', [
        requestedUserId,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '해당 ID의 사용자를 찾을 수 없습니다.' });
      }
      return res.json(result.rows[0]);
    } else {
      const result = await pool.query<PublicUserRow>('SELECT id, name, email FROM users');
      return res.json(result.rows);
    }
  } catch (error) {
    console.error('DB 조회 에러:', error);
    res.status(500).json({ error: '데이터베이스 조회 중 오류가 발생했습니다.' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, newPassword, token } = req.body as {
    email?: string;
    newPassword?: string;
    token?: string;
  };

  if (!email || !newPassword || !token) {
    return res.status(400).json({ error: '이메일, 새 비밀번호, 토큰을 모두 입력해주세요.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const lookupResult = await pool.query<PasswordResetLookupRow>(
      `
        SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email
        FROM password_reset_tokens prt
        JOIN users u ON u.id = prt.user_id
        WHERE prt.token_hash = $1
        ORDER BY prt.id DESC
        LIMIT 1
      `,
      [tokenHash],
    );

    const resetRow = lookupResult.rows[0];
    if (!resetRow) {
      return res.status(400).json({ error: '유효하지 않은 비밀번호 재설정 토큰입니다.' });
    }

    if (resetRow.used_at) {
      return res.status(400).json({ error: '이미 사용된 비밀번호 재설정 토큰입니다.' });
    }

    if (new Date(resetRow.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: '만료된 비밀번호 재설정 토큰입니다.' });
    }

    if (resetRow.email.toLowerCase() !== normalizedEmail) {
      return res.status(400).json({ error: '토큰과 이메일이 일치하지 않습니다.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const consumeResult = await client.query(
        `
          UPDATE password_reset_tokens
          SET used_at = NOW()
          WHERE id = $1 AND used_at IS NULL
        `,
        [resetRow.id],
      );

      if (consumeResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '이미 사용된 비밀번호 재설정 토큰입니다.' });
      }

      const updateResult = await client.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, resetRow.user_id],
      );

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: '해당 사용자를 찾을 수 없습니다.' });
      }

      await client.query('COMMIT');
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('Password Reset Error:', error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
};

export const requestReset = async (req: Request, res: Response) => {
  const { email } = req.body as {
    email?: string;
  };

  if (!email) {
    return res.status(400).json({ error: '이메일을 입력해주세요.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const lookupResult = await pool.query<UserEmailRow>('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [
      normalizedEmail,
    ]);

    const genericMessage = '입력한 이메일로 비밀번호 재설정 링크를 전송했습니다.';
    const user = lookupResult.rows[0];
    if (!user) {
      return res.json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [
      user.id,
    ]);

    await pool.query(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))
      `,
      [user.id, tokenHash, RESET_TOKEN_TTL_MINUTES],
    );

    const resetLink = `${FRONTEND_BASE_URL.replace(/\/+$/, '')}/signin?resetToken=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalizedEmail)}`;

    if (process.env.NODE_ENV === 'production') {
      return res.json({ message: genericMessage });
    }

    return res.json({ message: genericMessage, devResetLink: resetLink });
  } catch (error) {
    console.error('Request Reset Error:', error);
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
};

export const verifyResetToken = async (req: Request, res: Response) => {
  const { email, token } = req.body as {
    email?: string;
    token?: string;
  };

  if (!email || !token) {
    return res.status(400).json({ error: '이메일과 토큰을 입력해주세요.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const lookupResult = await pool.query<PasswordResetLookupRow>(
      `
        SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email
        FROM password_reset_tokens prt
        JOIN users u ON u.id = prt.user_id
        WHERE prt.token_hash = $1
        ORDER BY prt.id DESC
        LIMIT 1
      `,
      [tokenHash],
    );

    const resetRow = lookupResult.rows[0];
    if (!resetRow) {
      return res.status(400).json({ error: '유효하지 않은 비밀번호 재설정 토큰입니다.' });
    }

    if (resetRow.used_at) {
      return res.status(400).json({ error: '이미 사용된 비밀번호 재설정 토큰입니다.' });
    }

    if (new Date(resetRow.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: '만료된 비밀번호 재설정 토큰입니다.' });
    }

    if (resetRow.email.toLowerCase() !== normalizedEmail) {
      return res.status(400).json({ error: '토큰과 이메일이 일치하지 않습니다.' });
    }

    return res.json({ message: '유효한 비밀번호 재설정 토큰입니다.' });
  } catch (error) {
    console.error('Verify Reset Token Error:', error);
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
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

    let userResult = await pool.query<PublicUserRow>('SELECT id, name, email FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);

    if (userResult.rows.length === 0) {
      await pool.query('INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3)', [
        email.toLowerCase(),
        name,
        googleId,
      ]);
      userResult = await pool.query<PublicUserRow>('SELECT id, name, email FROM users WHERE email = $1', [
        email.toLowerCase(),
      ]);
    }

    const user = userResult.rows[0];
    if (!user) {
      return res.status(500).json({ error: '구글 로그인 사용자 생성에 실패했습니다.' });
    }

    return res.json(buildAuthResponse(user, '구글 로그인 성공'));
  } catch (error) {
    res.status(500).json({ error: '구글 인증 실패' });
  }
};
