import pool from '../db.js';
import {
  type MemberListRow,
  type MemberLookupRow,
  type MemberMutationPayload,
  type MemberNameRow,
  type SettlementDuesRow,
} from '../types/member.types.js';

let ensureMembersSchemaPromise: Promise<void> | null = null;

class MemberRepository {
  async ensureMembersSchema() {
    if (!ensureMembersSchemaPromise) {
      ensureMembersSchemaPromise = (async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS members (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE,
            is_admin BOOLEAN NOT NULL DEFAULT FALSE,
            phone VARCHAR(30),
            role VARCHAR(100),
            department VARCHAR(100),
            joined_at DATE,
            bio TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS name VARCHAR(100)');
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE');
        await pool.query(
          'ALTER TABLE members ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE',
        );
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS phone VARCHAR(30)');
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS role VARCHAR(100)');
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS department VARCHAR(100)');
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS joined_at DATE');
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS bio TEXT');
        await pool.query(
          'ALTER TABLE members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
        );
        await pool.query(
          'ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
        );

        await pool.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'user_id'
            ) THEN
              UPDATE members m
              SET
                name = COALESCE(m.name, u.name),
                email = COALESCE(m.email, u.email),
                is_admin = COALESCE(m.is_admin, u."isAdmin")
              FROM users u
              WHERE m.user_id = u.id;
            END IF;
          END
          $$;
        `);

        await pool.query(`
          UPDATE members
          SET name = COALESCE(NULLIF(BTRIM(name), ''), 'Member ' || id::text)
          WHERE name IS NULL OR BTRIM(name) = ''
        `);

        await pool.query('ALTER TABLE members DROP CONSTRAINT IF EXISTS fk_members_user');
        await pool.query('ALTER TABLE members DROP CONSTRAINT IF EXISTS members_user_id_key');
        await pool.query('ALTER TABLE members DROP CONSTRAINT IF EXISTS members_user_id_fkey');
        await pool.query('ALTER TABLE members DROP COLUMN IF EXISTS user_id');

        await pool.query('ALTER TABLE members ALTER COLUMN name SET NOT NULL');
        await pool.query('ALTER TABLE members ALTER COLUMN email DROP NOT NULL');

        await pool.query('CREATE INDEX IF NOT EXISTS idx_members_email_lower ON members (LOWER(email))');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_members_role ON members (role)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_members_department ON members (department)');
      })().catch((error) => {
        ensureMembersSchemaPromise = null;
        throw error;
      });
    }

    await ensureMembersSchemaPromise;
  }

  async findAllMembers() {
    const result = await pool.query<MemberListRow>(
      `
        SELECT
          id,
          name,
          email,
          is_admin AS "isAdmin",
          phone,
          role,
          department,
          CASE WHEN joined_at IS NULL THEN NULL ELSE TO_CHAR(joined_at, 'YYYY-MM-DD') END AS "joinedAt",
          bio
        FROM members
        ORDER BY name COLLATE "ko-KR-x-icu" ASC, id ASC
      `,
    );

    return result.rows;
  }

  async findAllMemberNames() {
    const result = await pool.query<MemberNameRow>(
      `
        SELECT id, name
        FROM members
        ORDER BY name COLLATE "ko-KR-x-icu" ASC, id ASC
      `,
    );

    return result.rows;
  }

  async findSettlementDuesRows(duesBaseYear: number) {
    const result = await pool.query<SettlementDuesRow>(
      `
        SELECT
          item,
          EXTRACT(YEAR FROM settlement_date)::int AS year
        FROM settlement
        WHERE settlement_date >= DATE '${duesBaseYear}-01-01'
          AND item LIKE '%회비%'
          AND amount > 0
        ORDER BY settlement_date ASC, id ASC
      `,
    );

    return result.rows;
  }

  async findMemberByEmail(email: string) {
    const result = await pool.query<MemberLookupRow>(
      'SELECT id FROM members WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findMemberByEmailExcludingId(email: string, memberId: number) {
    const result = await pool.query<MemberLookupRow>(
      'SELECT id FROM members WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
      [email, memberId],
    );
    return result.rows[0] ?? null;
  }

  async createMember(payload: MemberMutationPayload) {
    await pool.query(
      `
        INSERT INTO members (name, email, is_admin, phone, role, department, joined_at, bio)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        payload.name,
        payload.email,
        payload.isAdmin,
        payload.phone,
        payload.role,
        payload.department,
        payload.joinedAt,
        payload.bio,
      ],
    );
  }

  async updateMember(memberId: number, payload: MemberMutationPayload) {
    const result = await pool.query(
      `
        UPDATE members
        SET
          name = $1,
          email = $2,
          is_admin = $3,
          phone = $4,
          role = $5,
          department = $6,
          joined_at = $7,
          bio = $8,
          updated_at = NOW()
        WHERE id = $9
      `,
      [
        payload.name,
        payload.email,
        payload.isAdmin,
        payload.phone,
        payload.role,
        payload.department,
        payload.joinedAt,
        payload.bio,
        memberId,
      ],
    );

    return result.rowCount ?? 0;
  }

  async deleteMember(memberId: number) {
    const result = await pool.query('DELETE FROM members WHERE id = $1', [memberId]);
    return result.rowCount ?? 0;
  }
}

export const memberRepository = new MemberRepository();
