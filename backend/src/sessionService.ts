import { query } from './db.js';
import { buildUserResponse, createAccessToken, createRefreshToken, hashToken } from './authUtils.js';

interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface SessionLookupRow {
  id: number;
  user_id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  remember_me: boolean;
  idle_expires_at: Date;
  absolute_expires_at: Date;
}

interface SessionValidationRow {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
}

interface CreatedSessionRow {
  id: number | string;
}

let ensureSessionSchemaPromise: Promise<void> | null = null;

const parsePositiveInteger = (raw: string | undefined, fallbackValue: number) => {
  if (!raw) {
    return fallbackValue;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
};

const parseNumericId = (rawValue: number | string, fieldName: string) => {
  const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName} value from database.`);
  }

  return parsed;
};

const SESSION_IDLE_TIMEOUT_MINUTES = parsePositiveInteger(process.env.SESSION_IDLE_TIMEOUT_MINUTES, 60);
const SESSION_ABSOLUTE_TIMEOUT_DAYS = parsePositiveInteger(process.env.SESSION_ABSOLUTE_TIMEOUT_DAYS, 7);
const SESSION_ABSOLUTE_TIMEOUT_REMEMBER_DAYS = parsePositiveInteger(
  process.env.SESSION_ABSOLUTE_TIMEOUT_REMEMBER_DAYS,
  30,
);
const SESSION_ACTIVITY_TOUCH_THRESHOLD_SECONDS = parsePositiveInteger(
  process.env.SESSION_ACTIVITY_TOUCH_THRESHOLD_SECONDS,
  60,
);

const isSessionExpired = (idleExpiresAt: Date, absoluteExpiresAt: Date) => {
  const now = Date.now();
  return idleExpiresAt.getTime() <= now || absoluteExpiresAt.getTime() <= now;
};

const ensureSessionSchema = async () => {
  if (!ensureSessionSchemaPromise) {
    ensureSessionSchemaPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          refresh_token_hash CHAR(64) NOT NULL UNIQUE,
          remember_me BOOLEAN NOT NULL DEFAULT FALSE,
          last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          idle_expires_at TIMESTAMPTZ NOT NULL,
          absolute_expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await query('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id)');
      await query(
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_idle_expires_at ON user_sessions (idle_expires_at)',
      );
    })().catch((error) => {
      ensureSessionSchemaPromise = null;
      throw error;
    });
  }

  await ensureSessionSchemaPromise;
};

export const createSessionAuthResponse = async (user: AuthUser, message: string, rememberMe = false) => {
  await ensureSessionSchema();

  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const absoluteTimeoutDays = rememberMe
    ? SESSION_ABSOLUTE_TIMEOUT_REMEMBER_DAYS
    : SESSION_ABSOLUTE_TIMEOUT_DAYS;

  const result = await query<CreatedSessionRow>(
    `
      INSERT INTO user_sessions (
        user_id,
        refresh_token_hash,
        remember_me,
        last_activity_at,
        idle_expires_at,
        absolute_expires_at
      )
      VALUES (
        $1,
        $2,
        $3,
        NOW(),
        NOW() + ($4 * INTERVAL '1 minute'),
        NOW() + ($5 * INTERVAL '1 day')
      )
      RETURNING id
    `,
    [user.id, refreshTokenHash, rememberMe, SESSION_IDLE_TIMEOUT_MINUTES, absoluteTimeoutDays],
  );

  const createdSessionId = result.rows[0]?.id;
  if (!createdSessionId) {
    throw new Error('Failed to create user session.');
  }

  const sessionId = parseNumericId(createdSessionId, 'sessionId');

  return {
    message,
    token: createAccessToken({ id: user.id, email: user.email, sessionId }),
    refreshToken,
    ...buildUserResponse(user),
  };
};

export const refreshSessionAuthResponse = async (refreshToken: string) => {
  await ensureSessionSchema();

  const refreshTokenHash = hashToken(refreshToken);

  const result = await query<SessionLookupRow>(
    `
      SELECT
        s.id,
        s.user_id,
        u.name,
        u.email,
        u."isAdmin",
        s.remember_me,
        s.idle_expires_at,
        s.absolute_expires_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.refresh_token_hash = $1 AND s.revoked_at IS NULL
      LIMIT 1
    `,
    [refreshTokenHash],
  );

  const session = result.rows[0];
  if (!session) {
    return null;
  }

  const sessionId = parseNumericId(session.id, 'sessionId');

  if (isSessionExpired(new Date(session.idle_expires_at), new Date(session.absolute_expires_at))) {
    await revokeSessionById(sessionId);
    return null;
  }

  const nextRefreshToken = createRefreshToken();
  const nextRefreshTokenHash = hashToken(nextRefreshToken);

  await query(
    `
      UPDATE user_sessions
      SET
        refresh_token_hash = $1,
        last_activity_at = NOW(),
        idle_expires_at = NOW() + ($2 * INTERVAL '1 minute'),
        updated_at = NOW()
      WHERE id = $3
    `,
    [nextRefreshTokenHash, SESSION_IDLE_TIMEOUT_MINUTES, sessionId],
  );

  return {
    message: '토큰이 갱신되었습니다.',
    token: createAccessToken({ id: session.user_id, email: session.email, sessionId }),
    refreshToken: nextRefreshToken,
    ...buildUserResponse({
      id: session.user_id,
      name: session.name,
      email: session.email,
    }),
  };
};

export const getAuthenticatedUserBySession = async (userId: number, sessionId: number) => {
  await ensureSessionSchema();

  const result = await query<SessionValidationRow>(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u."isAdmin"
      FROM users u
      JOIN user_sessions s ON s.user_id = u.id
      WHERE
        u.id = $1
        AND s.id = $2
        AND s.revoked_at IS NULL
        AND s.idle_expires_at > NOW()
        AND s.absolute_expires_at > NOW()
      LIMIT 1
    `,
    [userId, sessionId],
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
    sessionId,
  };
};

export const touchSessionActivity = async (sessionId: number, force = false) => {
  await ensureSessionSchema();

  if (force) {
    await query(
      `
        UPDATE user_sessions
        SET
          last_activity_at = NOW(),
          idle_expires_at = NOW() + ($1 * INTERVAL '1 minute'),
          updated_at = NOW()
        WHERE
          id = $2
          AND revoked_at IS NULL
          AND idle_expires_at > NOW()
          AND absolute_expires_at > NOW()
      `,
      [SESSION_IDLE_TIMEOUT_MINUTES, sessionId],
    );
    return;
  }

  await query(
    `
      UPDATE user_sessions
      SET
        last_activity_at = NOW(),
        idle_expires_at = NOW() + ($1 * INTERVAL '1 minute'),
        updated_at = NOW()
      WHERE
        id = $2
        AND revoked_at IS NULL
        AND idle_expires_at > NOW()
        AND absolute_expires_at > NOW()
        AND (
          last_activity_at IS NULL
          OR last_activity_at < NOW() - ($3 * INTERVAL '1 second')
        )
    `,
    [SESSION_IDLE_TIMEOUT_MINUTES, sessionId, SESSION_ACTIVITY_TOUCH_THRESHOLD_SECONDS],
  );
};

export const revokeSessionById = async (sessionId: number) => {
  await ensureSessionSchema();

  await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND revoked_at IS NULL
    `,
    [sessionId],
  );
};
