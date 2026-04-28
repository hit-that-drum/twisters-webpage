import { query } from '../config/database.js';

export interface SessionLookupRow {
  id: number;
  user_id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isTest: boolean;
  isAllowed: boolean;
  remember_me: boolean;
  idle_expires_at: Date;
  absolute_expires_at: Date;
}

export interface SessionValidationRow {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isTest: boolean;
}

interface CreatedSessionRow {
  id: number | string;
}

let ensureSessionSchemaPromise: Promise<void> | null = null;

export const ensureSessionSchema = async () => {
  if (!ensureSessionSchemaPromise) {
    ensureSessionSchemaPromise = (async () => {
      await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT FALSE');

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

export const insertSession = async (params: {
  userId: number;
  refreshTokenHash: string;
  rememberMe: boolean;
  idleTimeoutMinutes: number;
  absoluteTimeoutDays: number;
}) => {
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
    [
      params.userId,
      params.refreshTokenHash,
      params.rememberMe,
      params.idleTimeoutMinutes,
      params.absoluteTimeoutDays,
    ],
  );

  return result.rows[0]?.id ?? null;
};

export const findSessionByRefreshTokenHash = async (refreshTokenHash: string) => {
  const result = await query<SessionLookupRow>(
    `
      SELECT
        s.id,
        s.user_id,
        u.name,
        u.email,
        u."isAdmin",
        u."isTest",
        u."isAllowed",
        s.remember_me,
        s.idle_expires_at,
        s.absolute_expires_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.refresh_token_hash = $1 AND s.revoked_at IS NULL AND u."isAllowed" = TRUE
      LIMIT 1
    `,
    [refreshTokenHash],
  );

  return result.rows[0] ?? null;
};

export const rotateSessionRefreshToken = async (
  sessionId: number,
  refreshTokenHash: string,
  idleTimeoutMinutes: number,
) => {
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
    [refreshTokenHash, idleTimeoutMinutes, sessionId],
  );
};

export const findUserBySessionId = async (userId: number, sessionId: number) => {
  const result = await query<SessionValidationRow>(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u."isAdmin",
        u."isTest"
      FROM users u
      JOIN user_sessions s ON s.user_id = u.id
      WHERE
        u.id = $1
        AND s.id = $2
        AND s.revoked_at IS NULL
        AND s.idle_expires_at > NOW()
        AND s.absolute_expires_at > NOW()
        AND u."isAllowed" = TRUE
      LIMIT 1
    `,
    [userId, sessionId],
  );

  return result.rows[0] ?? null;
};

export const updateSessionActivityForce = async (sessionId: number, idleTimeoutMinutes: number) => {
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
    [idleTimeoutMinutes, sessionId],
  );
};

export const updateSessionActivityIfStale = async (
  sessionId: number,
  idleTimeoutMinutes: number,
  activityTouchThresholdSeconds: number,
) => {
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
    [idleTimeoutMinutes, sessionId, activityTouchThresholdSeconds],
  );
};

export const revokeSession = async (sessionId: number) => {
  await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND revoked_at IS NULL
    `,
    [sessionId],
  );
};
