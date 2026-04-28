import pool from '../../config/database.js';
import { type EmailVerificationLookupRow } from '../../types/auth.types.js';
import { ensureAuthSchema } from './authSchema.js';

type VerifyEmailMutationResult = 'success' | 'already_used' | 'user_not_found';

class EmailVerificationTokenRepository {
  async markUnusedEmailVerificationTokensAsUsed(userId: number) {
    await ensureAuthSchema();
    await pool.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [userId],
    );
  }

  async createEmailVerificationToken(
    userId: number,
    tokenHash: string,
    emailVerificationTokenTtlMinutes: number,
  ) {
    await ensureAuthSchema();
    await pool.query(
      `
        INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))
      `,
      [userId, tokenHash, emailVerificationTokenTtlMinutes],
    );
  }

  async findEmailVerificationLookupByTokenHash(tokenHash: string) {
    await ensureAuthSchema();
    const result = await pool.query<EmailVerificationLookupRow>(
      `
        SELECT evt.id, evt.user_id, evt.expires_at, evt.used_at, u.email, u."emailVerifiedAt" AS email_verified_at
        FROM email_verification_tokens evt
        JOIN users u ON u.id = evt.user_id
        WHERE evt.token_hash = $1
        ORDER BY evt.id DESC
        LIMIT 1
      `,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  }

  /**
   * Atomically consumes the token row and stamps emailVerifiedAt on the
   * user. Kept on the token repository because the transaction's purpose
   * is the consumption-with-side-effect; pulling the user UPDATE into
   * userRepository would require callers to manage the transaction.
   */
  async verifyEmailByToken(
    verificationTokenId: number,
    userId: number,
  ): Promise<VerifyEmailMutationResult> {
    await ensureAuthSchema();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const consumeResult = await client.query(
        `
          UPDATE email_verification_tokens
          SET used_at = NOW()
          WHERE id = $1 AND used_at IS NULL
        `,
        [verificationTokenId],
      );

      if ((consumeResult.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return 'already_used';
      }

      const updateResult = await client.query(
        'UPDATE users SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", NOW()) WHERE id = $1',
        [userId],
      );

      if ((updateResult.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return 'user_not_found';
      }

      await client.query('COMMIT');
      return 'success';
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const emailVerificationTokenRepository = new EmailVerificationTokenRepository();
