import pool from '../../config/database.js';

let ensureAuthSchemaPromise: Promise<void> | null = null;

/**
 * Idempotently applies additive schema changes required by the auth stack:
 * user flag columns, profile image storage, the unique email index, and
 * the email_verification_tokens table. Cached per-process so concurrent
 * callers await the same migration run.
 */
export const ensureAuthSchema = async () => {
  if (!ensureAuthSchemaPromise) {
    ensureAuthSchemaPromise = (async () => {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT FALSE');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "profileImage" TEXT');
      await pool.query('ALTER TABLE users ALTER COLUMN "profileImage" TYPE TEXT');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMPTZ');
      await pool.query(
        `
          UPDATE users
          SET "emailVerifiedAt" = COALESCE("createdAt", NOW())
          WHERE password IS NOT NULL
            AND "isAllowed" = TRUE
            AND "emailVerifiedAt" IS NULL
        `,
      );
      await pool.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique ON users (LOWER(email))',
      );
      await pool.query(
        `
          CREATE TABLE IF NOT EXISTS email_verification_tokens (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash CHAR(64) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `,
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens (user_id)',
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_tokens (expires_at)',
      );
    })().catch((error) => {
      ensureAuthSchemaPromise = null;
      throw error;
    });
  }

  await ensureAuthSchemaPromise;
};
