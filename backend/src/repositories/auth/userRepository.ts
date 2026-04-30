import pool from '../../config/database.js';
import {
  type AdminUserRow,
  type ApprovalUserRow,
  type ManagedUserRow,
  type MeUserRow,
  type PendingUserRow,
  type PublicUserRow,
  type UserApprovalRow,
  type UserEmailRow,
} from '../../types/auth.types.js';
import { ensureAuthSchema } from './authSchema.js';

class UserRepository {
  async ensureAuthSchema() {
    await ensureAuthSchema();
  }

  async createUser(name: string, email: string, hashedPassword: string, isTest: boolean) {
    await ensureAuthSchema();
    const result = await pool.query<{ id: number }>(
      'INSERT INTO users (name, email, password, "isTest") VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashedPassword, isTest],
    );

    return result.rows[0]?.id ?? null;
  }

  async findMeById(userId: number) {
    await ensureAuthSchema();
    const result = await pool.query<MeUserRow>(
      `SELECT
         id,
         name,
         email,
         "profileImage",
         phone,
         CASE WHEN "birthDate" IS NULL THEN NULL ELSE TO_CHAR("birthDate", 'YYYY-MM-DD') END AS "birthDate",
         TO_CHAR("createdAt", 'YYYY-MM-DD') AS "joinedAt",
         "isAdmin",
         "isTest"
       FROM users
       WHERE id = $1`,
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
    await ensureAuthSchema();
    const result = await pool.query<ApprovalUserRow>(
      'SELECT id, name, email, "isAllowed", "emailVerifiedAt" FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findApprovalUserByKakaoId(kakaoId: string) {
    await ensureAuthSchema();
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
    await ensureAuthSchema();
    await pool.query(
      'INSERT INTO users (email, name, google_id, "profileImage", "isTest", "emailVerifiedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [email, name, googleId, profileImage, isTest],
    );
  }

  async updateGoogleProfileByUserId(userId: number, googleId: string, profileImage: string | null) {
    await ensureAuthSchema();
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
    await ensureAuthSchema();
    await pool.query(
      'INSERT INTO users (email, name, kakao_id, "profileImage", "isTest", "emailVerifiedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [email, name, kakaoId, profileImage, isTest],
    );
  }

  async updateKakaoProfileByUserId(userId: number, kakaoId: string, profileImage: string | null) {
    await ensureAuthSchema();
    await pool.query('UPDATE users SET kakao_id = $2, "profileImage" = $3 WHERE id = $1', [
      userId,
      kakaoId,
      profileImage,
    ]);
  }

  async updateProfileImageByUserId(userId: number, profileImage: string | null) {
    await ensureAuthSchema();
    const result = await pool.query('UPDATE users SET "profileImage" = $2 WHERE id = $1', [
      userId,
      profileImage,
    ]);

    return (result.rowCount ?? 0) > 0;
  }

  async updateMeProfileByUserId(
    userId: number,
    payload: { phone: string | null; birthDate: string | null },
  ) {
    await ensureAuthSchema();
    const result = await pool.query(
      'UPDATE users SET phone = $2, "birthDate" = $3 WHERE id = $1',
      [userId, payload.phone, payload.birthDate],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async findUserEmailByEmail(email: string) {
    await ensureAuthSchema();
    const result = await pool.query<UserEmailRow>(
      'SELECT id, email, "emailVerifiedAt" FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    return result.rows[0] ?? null;
  }

  async markEmailVerifiedByUserId(userId: number) {
    await ensureAuthSchema();
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
    await ensureAuthSchema();
    const result = await pool.query<AdminUserRow>(
      `
        SELECT
          id,
          name,
          email,
          "profileImage",
          "isAdmin",
          "isAllowed",
          "createdAt",
          "emailVerifiedAt",
          (google_id IS NOT NULL) AS "hasGoogleAuth",
          (kakao_id IS NOT NULL) AS "hasKakaoAuth"
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
}

export const userRepository = new UserRepository();
