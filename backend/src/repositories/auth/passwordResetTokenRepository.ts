import pool from '../../config/database.js';
import { type PasswordResetLookupRow } from '../../types/auth.types.js';

type ResetPasswordMutationResult = 'success' | 'already_used' | 'user_not_found';

class PasswordResetTokenRepository {
  async markUnusedResetTokensAsUsed(userId: number) {
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [userId],
    );
  }

  async createPasswordResetToken(userId: number, tokenHash: string, resetTokenTtlMinutes: number) {
    await pool.query(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))
      `,
      [userId, tokenHash, resetTokenTtlMinutes],
    );
  }

  async findPasswordResetLookupByTokenHash(tokenHash: string) {
    const result = await pool.query<PasswordResetLookupRow>(
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

    return result.rows[0] ?? null;
  }

  /**
   * Atomically consumes the token row and writes the new password hash.
   * Lives here (rather than in userRepository) because the transaction is
   * fundamentally about "consume token AND apply its effect"; splitting the
   * two halves across repositories would force callers to manage the
   * cross-table transaction themselves.
   */
  async resetPasswordByToken(
    resetTokenId: number,
    userId: number,
    hashedPassword: string,
  ): Promise<ResetPasswordMutationResult> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const consumeResult = await client.query(
        `
          UPDATE password_reset_tokens
          SET used_at = NOW()
          WHERE id = $1 AND used_at IS NULL
        `,
        [resetTokenId],
      );

      if ((consumeResult.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return 'already_used';
      }

      const updateResult = await client.query('UPDATE users SET password = $1 WHERE id = $2', [
        hashedPassword,
        userId,
      ]);

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

export const passwordResetTokenRepository = new PasswordResetTokenRepository();
