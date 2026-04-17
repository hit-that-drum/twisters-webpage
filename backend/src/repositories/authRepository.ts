import pool from '../db.js';
import {
  type AdminUserRow,
  type ApprovalUserRow,
  type EmailVerificationLookupRow,
  type ManagedUserRow,
  type MeUserRow,
  type PasswordResetLookupRow,
  type PendingUserRow,
  type PublicUserRow,
  type UserApprovalRow,
  type UserEmailRow,
} from '../types/auth.types.js';

type ResetPasswordMutationResult = 'success' | 'already_used' | 'user_not_found';
type VerifyEmailMutationResult = 'success' | 'already_used' | 'user_not_found';

let ensureUsersSchemaPromise: Promise<void> | null = null;

class AuthRepository {
  private async ensureUsersSchema() {
    if (!ensureUsersSchemaPromise) {
      ensureUsersSchemaPromise = (async () => {
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
        ensureUsersSchemaPromise = null;
        throw error;
      });
    }

    await ensureUsersSchemaPromise;
  }

  async ensureAuthSchema() {
    await this.ensureUsersSchema();
  }

  async createUser(name: string, email: string, hashedPassword: string, isTest: boolean) {
    await this.ensureUsersSchema();
    const result = await pool.query<{ id: number }>(
      'INSERT INTO users (name, email, password, "isTest") VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashedPassword, isTest],
    );

    return result.rows[0]?.id ?? null;
  }

  async findMeById(userId: number) {
    await this.ensureUsersSchema();
    const result = await pool.query<MeUserRow>(
      'SELECT id, name, email, "profileImage", "isAdmin", "isTest" FROM users WHERE id = $1',
      [userId],
    );

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
    const result = await pool.query<PublicUserRow>('SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return result.rows[0] ?? null;
  }

  async findApprovalUserByEmail(email: string) {
    await this.ensureUsersSchema();
    const result = await pool.query<ApprovalUserRow>(
      'SELECT id, name, email, "isAllowed", "emailVerifiedAt" FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findApprovalUserByKakaoId(kakaoId: string) {
    await this.ensureUsersSchema();
    const result = await pool.query<ApprovalUserRow>(
      'SELECT id, name, email, "isAllowed", "emailVerifiedAt" FROM users WHERE kakao_id = $1 LIMIT 1',
      [kakaoId],
    );
    return result.rows[0] ?? null;
  }

  async createGoogleUser(
    email: string,
    name: string,
    googleId: string,
    profileImage: string | null,
    isTest: boolean,
  ) {
    await this.ensureUsersSchema();
    await pool.query(
      'INSERT INTO users (email, name, google_id, "profileImage", "isTest", "emailVerifiedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [email, name, googleId, profileImage, isTest],
    );
  }

  async updateGoogleProfileByUserId(userId: number, googleId: string, profileImage: string | null) {
    await this.ensureUsersSchema();
    await pool.query('UPDATE users SET google_id = $2, "profileImage" = $3 WHERE id = $1', [
      userId,
      googleId,
      profileImage,
    ]);
  }

  async createKakaoUser(
    email: string,
    name: string,
    kakaoId: string,
    profileImage: string | null,
    isTest: boolean,
  ) {
    await this.ensureUsersSchema();
    await pool.query(
      'INSERT INTO users (email, name, kakao_id, "profileImage", "isTest", "emailVerifiedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [email, name, kakaoId, profileImage, isTest],
    );
  }

  async updateKakaoProfileByUserId(userId: number, kakaoId: string, profileImage: string | null) {
    await this.ensureUsersSchema();
    await pool.query('UPDATE users SET kakao_id = $2, "profileImage" = $3 WHERE id = $1', [
      userId,
      kakaoId,
      profileImage,
    ]);
  }

  async updateProfileImageByUserId(userId: number, profileImage: string | null) {
    await this.ensureUsersSchema();
    const result = await pool.query('UPDATE users SET "profileImage" = $2 WHERE id = $1', [
      userId,
      profileImage,
    ]);

    return (result.rowCount ?? 0) > 0;
  }

  async findUserEmailByEmail(email: string) {
    await this.ensureUsersSchema();
    const result = await pool.query<UserEmailRow>(
      'SELECT id, email, "emailVerifiedAt" FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    return result.rows[0] ?? null;
  }

  async markEmailVerifiedByUserId(userId: number) {
    await this.ensureUsersSchema();
    const result = await pool.query(
      'UPDATE users SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", NOW()) WHERE id = $1',
      [userId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async findPendingUsers(onlyTestUsers = false) {
    const result = await pool.query<PendingUserRow>(
      `
        SELECT id, name, email, "createdAt", "emailVerifiedAt"
        FROM users
        WHERE "isAllowed" = FALSE
          AND ($1::boolean = FALSE OR ("isTest" = TRUE OR name ILIKE 'TEST%'))
        ORDER BY "createdAt" ASC, id ASC
      `,
      [onlyTestUsers],
    );
    return result.rows;
  }

  async findAllAdminUsers(onlyTestUsers = false) {
    await this.ensureUsersSchema();
    const result = await pool.query<AdminUserRow>(
      `
        SELECT id, name, email, "profileImage", "isAdmin", "isAllowed", "createdAt", "emailVerifiedAt"
        FROM users
        WHERE $1::boolean = FALSE OR ("isTest" = TRUE OR name ILIKE 'TEST%')
        ORDER BY "createdAt" DESC, id DESC
      `,
      [onlyTestUsers],
    );
    return result.rows;
  }

  async findUserApprovalById(userId: number) {
    const result = await pool.query<UserApprovalRow>(
      'SELECT id, name, "isTest", "isAllowed" FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async findManagedUserById(userId: number) {
    const result = await pool.query<ManagedUserRow>(
      'SELECT id, name, "isTest", "isAdmin", "isAllowed" FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async approveUserById(userId: number) {
    const result = await pool.query('UPDATE users SET "isAllowed" = TRUE WHERE id = $1', [userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async deletePendingUserById(userId: number) {
    const result = await pool.query('DELETE FROM users WHERE id = $1 AND "isAllowed" = FALSE', [userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteManagedUserById(userId: number, protectLastActiveAdmin: boolean) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (protectLastActiveAdmin) {
        const activeAdminsResult = await client.query<{ id: number }>(
          'SELECT id FROM users WHERE "isAdmin" = TRUE AND "isAllowed" = TRUE FOR UPDATE',
        );

        if (activeAdminsResult.rows.length <= 1) {
          await client.query('ROLLBACK');
          return 'last_active_admin' as const;
        }
      }

      const deleteResult = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      await client.query('COMMIT');

      if ((deleteResult.rowCount ?? 0) === 0) {
        return 'not_found' as const;
      }

      return 'deleted' as const;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateManagedUserById(
    userId: number,
    payload: { name: string; email: string; isAdmin: boolean; isAllowed: boolean },
    protectLastActiveAdmin: boolean,
  ) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (protectLastActiveAdmin) {
        const activeAdminsResult = await client.query<{ id: number }>(
          'SELECT id FROM users WHERE "isAdmin" = TRUE AND "isAllowed" = TRUE FOR UPDATE',
        );

        if (activeAdminsResult.rows.length <= 1) {
          await client.query('ROLLBACK');
          return 'last_active_admin' as const;
        }
      }

      const updateResult = await client.query(
        'UPDATE users SET name = $1, email = $2, "isAdmin" = $3, "isAllowed" = $4 WHERE id = $5',
        [payload.name, payload.email, payload.isAdmin, payload.isAllowed, userId],
      );
      await client.query('COMMIT');

      if ((updateResult.rowCount ?? 0) === 0) {
        return 'not_found' as const;
      }

      return 'updated' as const;
    } catch (error) {
      await client.query('ROLLBACK');

      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        return 'email_conflict' as const;
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async markUnusedResetTokensAsUsed(userId: number) {
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [
      userId,
    ]);
  }

  async markUnusedEmailVerificationTokensAsUsed(userId: number) {
    await this.ensureUsersSchema();
    await pool.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
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

  async createEmailVerificationToken(
    userId: number,
    tokenHash: string,
    emailVerificationTokenTtlMinutes: number,
  ) {
    await this.ensureUsersSchema();
    await pool.query(
      `
        INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))
      `,
      [userId, tokenHash, emailVerificationTokenTtlMinutes],
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

  async findEmailVerificationLookupByTokenHash(tokenHash: string) {
    await this.ensureUsersSchema();
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

  async verifyEmailByToken(
    verificationTokenId: number,
    userId: number,
  ): Promise<VerifyEmailMutationResult> {
    await this.ensureUsersSchema();
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

export const authRepository = new AuthRepository();
