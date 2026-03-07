import pool from '../db.js';
import {
  type AdminUserRow,
  type ApprovalUserRow,
  type MeUserRow,
  type PasswordResetLookupRow,
  type PendingUserRow,
  type PublicUserRow,
  type UserApprovalRow,
  type UserEmailRow,
} from '../types/auth.types.js';

type ResetPasswordMutationResult = 'success' | 'already_used' | 'user_not_found';

class AuthRepository {
  async createUser(name: string, email: string, hashedPassword: string) {
    const result = await pool.query<{ id: number }>(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hashedPassword],
    );

    return result.rows[0]?.id ?? null;
  }

  async findMeById(userId: number) {
    const result = await pool.query<MeUserRow>('SELECT id, name, email, "isAdmin" FROM users WHERE id = $1', [
      userId,
    ]);

    return result.rows[0] ?? null;
  }

  async findPublicUserById(userId: number) {
    const result = await pool.query<PublicUserRow>('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    return result.rows[0] ?? null;
  }

  async findAllPublicUsers() {
    const result = await pool.query<PublicUserRow>('SELECT id, name, email FROM users');
    return result.rows;
  }

  async findPublicUserByEmail(email: string) {
    const result = await pool.query<PublicUserRow>('SELECT id, name, email FROM users WHERE email = $1', [email]);
    return result.rows[0] ?? null;
  }

  async findApprovalUserByEmail(email: string) {
    const result = await pool.query<ApprovalUserRow>(
      'SELECT id, name, email, "isAllowed" FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    return result.rows[0] ?? null;
  }

  async createGoogleUser(email: string, name: string, googleId: string, profileImage: string | null) {
    await pool.query(
      'INSERT INTO users (email, name, google_id, "profileImage") VALUES ($1, $2, $3, $4)',
      [email, name, googleId, profileImage],
    );
  }

  async updateGoogleProfileByUserId(userId: number, googleId: string, profileImage: string | null) {
    await pool.query('UPDATE users SET google_id = $2, "profileImage" = $3 WHERE id = $1', [
      userId,
      googleId,
      profileImage,
    ]);
  }

  async findUserEmailByEmail(email: string) {
    const result = await pool.query<UserEmailRow>('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [email]);
    return result.rows[0] ?? null;
  }

  async findPendingUsers() {
    const result = await pool.query<PendingUserRow>(
      'SELECT id, name, email, "createdAt" FROM users WHERE "isAllowed" = FALSE ORDER BY "createdAt" ASC, id ASC',
    );
    return result.rows;
  }

  async findAllAdminUsers() {
    const result = await pool.query<AdminUserRow>(
      'SELECT id, name, email, "isAdmin", "isAllowed", "createdAt" FROM users ORDER BY "createdAt" DESC, id DESC',
    );
    return result.rows;
  }

  async findUserApprovalById(userId: number) {
    const result = await pool.query<UserApprovalRow>('SELECT id, "isAllowed" FROM users WHERE id = $1 LIMIT 1', [
      userId,
    ]);
    return result.rows[0] ?? null;
  }

  async approveUserById(userId: number) {
    const result = await pool.query('UPDATE users SET "isAllowed" = TRUE WHERE id = $1', [userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async markUnusedResetTokensAsUsed(userId: number) {
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [
      userId,
    ]);
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

export const authRepository = new AuthRepository();
