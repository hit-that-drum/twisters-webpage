/**
 * Owns the members / test_members schema. Idempotent — the migration
 * promise is cached per process so concurrent callers (index startup,
 * memberService, memberAttendanceService, memberDuesService) all wait on
 * the same one-shot init.
 */
import pool from '../../config/database.js';

let ensureMembersSchemaPromise: Promise<void> | null = null;

export const ensureMembersSchema = async () => {
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

      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_test_members_email_lower ON test_members (LOWER(email))',
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_test_members_department ON test_members (department)',
      );
    })().catch((error) => {
      ensureMembersSchemaPromise = null;
      throw error;
    });
  }

  await ensureMembersSchemaPromise;
};
