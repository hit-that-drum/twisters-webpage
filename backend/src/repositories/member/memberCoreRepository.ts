/**
 * Owns CRUD against the `members` / `test_members` tables. Scope is
 * resolved per call by `getScopedTableNames(scope).members` so the same
 * methods work for both production and the multi-tenant `test_*` twins.
 */
import pool from '../../config/database.js';
import {
  type MemberListRow,
  type MemberLookupRow,
  type MemberMutationPayload,
  type MemberNameRow,
} from '../../types/member.types.js';
import { getScopedTableNames, type DataScope } from '../../utils/dataScope.js';

class MemberCoreRepository {
  async findAllMembers(scope: DataScope) {
    const membersTable = getScopedTableNames(scope).members;
    const result = await pool.query<MemberListRow>(
      `
        SELECT
          m.id,
          m.name,
          m.email,
          u."profileImage" AS "profileImage",
          m.is_admin AS "isAdmin",
          m.phone,
          m.department,
          CASE WHEN m.joined_at IS NULL THEN NULL ELSE TO_CHAR(m.joined_at, 'YYYY-MM-DD') END AS "joinedAt",
          CASE WHEN m.birth_date IS NULL THEN NULL ELSE TO_CHAR(m.birth_date, 'YYYY-MM-DD') END AS "birthDate"
        FROM ${membersTable} m
        LEFT JOIN users u ON m.email IS NOT NULL AND LOWER(BTRIM(u.email)) = LOWER(BTRIM(m.email))
        ORDER BY m.name COLLATE "ko-KR-x-icu" ASC, m.id ASC
      `,
    );

    return result.rows;
  }

  async findAllMemberNames(scope: DataScope) {
    const membersTable = getScopedTableNames(scope).members;
    const result = await pool.query<MemberNameRow>(
      `
        SELECT id, name
        FROM ${membersTable}
        ORDER BY name COLLATE "ko-KR-x-icu" ASC, id ASC
      `,
    );

    return result.rows;
  }

  async findMemberByEmail(scope: DataScope, email: string) {
    const membersTable = getScopedTableNames(scope).members;
    const result = await pool.query<MemberLookupRow>(
      `SELECT id FROM ${membersTable} WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findMemberById(scope: DataScope, memberId: number) {
    const membersTable = getScopedTableNames(scope).members;
    const result = await pool.query<MemberLookupRow>(
      `SELECT id FROM ${membersTable} WHERE id = $1 LIMIT 1`,
      [memberId],
    );
    return result.rows[0] ?? null;
  }

  async findMemberByEmailExcludingId(scope: DataScope, email: string, memberId: number) {
    const membersTable = getScopedTableNames(scope).members;
    const result = await pool.query<MemberLookupRow>(
      `SELECT id FROM ${membersTable} WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
      [email, memberId],
    );
    return result.rows[0] ?? null;
  }

  async createMember(scope: DataScope, payload: MemberMutationPayload) {
    const membersTable = getScopedTableNames(scope).members;
    await pool.query(
      `
        INSERT INTO ${membersTable} (name, email, is_admin, phone, department, joined_at, birth_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        payload.name,
        payload.email,
        payload.isAdmin,
        payload.phone,
        payload.department,
        payload.joinedAt,
        payload.birthDate,
      ],
    );
  }

  async updateMember(scope: DataScope, memberId: number, payload: MemberMutationPayload) {
    const membersTable = getScopedTableNames(scope).members;
    const result = await pool.query(
      `
        UPDATE ${membersTable}
        SET
          name = $1,
          email = $2,
          is_admin = $3,
          phone = $4,
          department = $5,
          joined_at = $6,
          birth_date = $7,
          updated_at = NOW()
        WHERE id = $8
      `,
      [
        payload.name,
        payload.email,
        payload.isAdmin,
        payload.phone,
        payload.department,
        payload.joinedAt,
        payload.birthDate,
        memberId,
      ],
    );

    return result.rowCount ?? 0;
  }

  async deleteMember(scope: DataScope, memberId: number) {
    const membersTable = getScopedTableNames(scope).members;
    const result = await pool.query(`DELETE FROM ${membersTable} WHERE id = $1`, [memberId]);
    return result.rowCount ?? 0;
  }
}

export const memberCoreRepository = new MemberCoreRepository();
