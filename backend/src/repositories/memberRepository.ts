import pool from '../db.js';
import {
  type MemberListRow,
  type MemberLookupRow,
  type MemberMutationPayload,
  type MemberNameRow,
  type SettlementDuesRow,
} from '../types/member.types.js';
import { getScopedTableNames, type DataScope } from '../utils/dataScope.js';

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
            department VARCHAR(100),
            joined_at DATE,
            birth_date DATE,
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
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS department VARCHAR(100)');
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS joined_at DATE');
        await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS birth_date DATE');
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
        await pool.query('DROP INDEX IF EXISTS idx_members_role');
        await pool.query('ALTER TABLE members DROP COLUMN IF EXISTS role');
        await pool.query('ALTER TABLE members DROP COLUMN IF EXISTS bio');

        await pool.query('ALTER TABLE members ALTER COLUMN name SET NOT NULL');
        await pool.query('ALTER TABLE members ALTER COLUMN email DROP NOT NULL');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "profileImage" TEXT');
        await pool.query('ALTER TABLE users ALTER COLUMN "profileImage" TYPE TEXT');

        await pool.query('CREATE INDEX IF NOT EXISTS idx_members_email_lower ON members (LOWER(email))');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_members_department ON members (department)');

        await pool.query(`
          CREATE TABLE IF NOT EXISTS test_members (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE,
            is_admin BOOLEAN NOT NULL DEFAULT FALSE,
            phone VARCHAR(30),
            department VARCHAR(100),
            joined_at DATE,
            birth_date DATE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await pool.query('ALTER TABLE test_members ADD COLUMN IF NOT EXISTS name VARCHAR(100)');
        await pool.query('ALTER TABLE test_members ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE');
        await pool.query(
          'ALTER TABLE test_members ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE',
        );
        await pool.query('ALTER TABLE test_members ADD COLUMN IF NOT EXISTS phone VARCHAR(30)');
        await pool.query('ALTER TABLE test_members ADD COLUMN IF NOT EXISTS department VARCHAR(100)');
        await pool.query('ALTER TABLE test_members ADD COLUMN IF NOT EXISTS joined_at DATE');
        await pool.query('ALTER TABLE test_members ADD COLUMN IF NOT EXISTS birth_date DATE');
        await pool.query(
          'ALTER TABLE test_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
        );
        await pool.query(
          'ALTER TABLE test_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
        );

        await pool.query(`
          UPDATE test_members
          SET name = COALESCE(NULLIF(BTRIM(name), ''), 'Member ' || id::text)
          WHERE name IS NULL OR BTRIM(name) = ''
        `);

        await pool.query('ALTER TABLE test_members ALTER COLUMN name SET NOT NULL');
        await pool.query('ALTER TABLE test_members ALTER COLUMN email DROP NOT NULL');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS "profileImage" TEXT');
        await pool.query('ALTER TABLE users ALTER COLUMN "profileImage" TYPE TEXT');
        await pool.query('DROP INDEX IF EXISTS idx_test_members_role');
        await pool.query('ALTER TABLE test_members DROP COLUMN IF EXISTS role');
        await pool.query('ALTER TABLE test_members DROP COLUMN IF EXISTS bio');

        await pool.query('CREATE INDEX IF NOT EXISTS idx_test_members_email_lower ON test_members (LOWER(email))');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_test_members_department ON test_members (department)');
      })().catch((error) => {
        ensureMembersSchemaPromise = null;
        throw error;
      });
    }

    await ensureMembersSchemaPromise;
  }

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

  async findSettlementDuesRows(scope: DataScope, duesBaseYear: number) {
    const settlementTable = getScopedTableNames(scope).settlement;
    const result = await pool.query<SettlementDuesRow>(
      `
        SELECT
          item,
          EXTRACT(YEAR FROM settlement_date)::int AS year
        FROM ${settlementTable}
        WHERE settlement_date >= MAKE_DATE($1, 1, 1)
          AND item LIKE '%회비%'
          AND amount > 0
        ORDER BY settlement_date ASC, id ASC
      `,
      [duesBaseYear],
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

export const memberRepository = new MemberRepository();
