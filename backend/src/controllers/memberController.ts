import { type Request, type Response } from 'express';
import pool from '../db.js';

interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean | number | string;
}

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

interface MemberListRow {
  id: number;
  name: string;
  email: string | null;
  isAdmin: boolean | number;
  phone: string | null;
  role: string | null;
  department: string | null;
  joinedAt: string | null;
  bio: string | null;
}

interface MemberLookupRow {
  id: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let ensureMembersSchemaPromise: Promise<void> | null = null;

const ensureMembersSchema = async () => {
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

      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_members_email_lower ON members (LOWER(email))',
      );
      await pool.query('CREATE INDEX IF NOT EXISTS idx_members_role ON members (role)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_members_department ON members (department)');
    })().catch((error) => {
      ensureMembersSchemaPromise = null;
      throw error;
    });
  }

  await ensureMembersSchemaPromise;
};

const parseMemberId = (rawMemberId?: string) => {
  const parsedMemberId = Number(rawMemberId);
  if (!Number.isInteger(parsedMemberId) || parsedMemberId <= 0) {
    return null;
  }

  return parsedMemberId;
};

const normalizeOptionalText = (rawValue: unknown, maxLength: number) => {
  if (rawValue === null || rawValue === undefined) {
    return { value: null as string | null };
  }

  if (typeof rawValue !== 'string') {
    return { error: '문자열 형식이 올바르지 않습니다.' };
  }

  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return { value: null as string | null };
  }

  if (trimmedValue.length > maxLength) {
    return { error: `입력 값은 ${maxLength}자 이하여야 합니다.` };
  }

  return { value: trimmedValue };
};

const normalizeRequiredText = (rawValue: unknown, fieldName: string, maxLength: number) => {
  if (typeof rawValue !== 'string') {
    return { error: `${fieldName}은(는) 필수입니다.` };
  }

  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return { error: `${fieldName}은(는) 필수입니다.` };
  }

  if (trimmedValue.length > maxLength) {
    return { error: `${fieldName}은(는) ${maxLength}자 이하여야 합니다.` };
  }

  return { value: trimmedValue };
};

const normalizeOptionalEmail = (rawValue: unknown) => {
  if (rawValue === null || rawValue === undefined) {
    return { value: null as string | null };
  }

  if (typeof rawValue !== 'string') {
    return { error: '이메일 형식이 올바르지 않습니다.' };
  }

  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return { value: null as string | null };
  }

  if (trimmedValue.length > 100) {
    return { error: '이메일은 100자 이하여야 합니다.' };
  }

  const lowerCaseEmail = trimmedValue.toLowerCase();
  if (!EMAIL_PATTERN.test(lowerCaseEmail)) {
    return { error: '유효한 이메일 주소를 입력해주세요.' };
  }

  return { value: lowerCaseEmail };
};

const normalizeOptionalDate = (rawValue: unknown) => {
  if (rawValue === null || rawValue === undefined) {
    return { value: null as string | null };
  }

  if (typeof rawValue !== 'string') {
    return { error: '입사일 형식이 올바르지 않습니다.' };
  }

  const normalizedDate = rawValue.trim();
  if (!normalizedDate) {
    return { value: null as string | null };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return { error: '입사일은 YYYY-MM-DD 형식이어야 합니다.' };
  }

  const [yearText, monthText, dayText] = normalizedDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { error: '입사일 형식이 올바르지 않습니다.' };
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return { error: '유효한 입사일을 입력해주세요.' };
  }

  return { value: normalizedDate };
};

const normalizeBoolean = (rawValue: unknown, fallbackValue = false) => {
  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue === 'number') {
    return rawValue === 1;
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return fallbackValue;
};

const isAdminUser = (authenticatedUser: AuthenticatedUser) => {
  return normalizeBoolean(authenticatedUser.isAdmin, false);
};

const assertAdminUser = (authenticatedUser: AuthenticatedUser | undefined, res: Response) => {
  if (!authenticatedUser) {
    res.status(401).json({ error: '인증된 사용자 정보가 없습니다.' });
    return false;
  }

  if (!isAdminUser(authenticatedUser)) {
    res.status(403).json({ error: '관리자만 회원 정보를 관리할 수 있습니다.' });
    return false;
  }

  return true;
};

export const getMembers = async (_req: Request, res: Response) => {
  try {
    await ensureMembersSchema();

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

    return res.json(
      result.rows.map((row) => ({
        ...row,
        isAdmin: normalizeBoolean(row.isAdmin, false),
      })),
    );
  } catch (error) {
    console.error('Member list fetch error:', error);
    return res.status(500).json({ error: '회원 정보 조회 중 오류가 발생했습니다.' });
  }
};

export const createMember = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const { name, email, isAdmin, phone, role, department, joinedAt, bio } = req.body as {
    name?: unknown;
    email?: unknown;
    isAdmin?: unknown;
    phone?: unknown;
    role?: unknown;
    department?: unknown;
    joinedAt?: unknown;
    bio?: unknown;
  };

  if (!assertAdminUser(authenticatedUser, res)) {
    return;
  }

  const normalizedName = normalizeRequiredText(name, '이름', 100);
  if ('error' in normalizedName) {
    return res.status(400).json({ error: normalizedName.error });
  }

  const normalizedEmail = normalizeOptionalEmail(email);
  if ('error' in normalizedEmail) {
    return res.status(400).json({ error: normalizedEmail.error });
  }

  const normalizedPhone = normalizeOptionalText(phone, 30);
  if ('error' in normalizedPhone) {
    return res.status(400).json({ error: `전화번호 ${normalizedPhone.error}` });
  }

  const normalizedRole = normalizeOptionalText(role, 100);
  if ('error' in normalizedRole) {
    return res.status(400).json({ error: `직책 ${normalizedRole.error}` });
  }

  const normalizedDepartment = normalizeOptionalText(department, 100);
  if ('error' in normalizedDepartment) {
    return res.status(400).json({ error: `부서 ${normalizedDepartment.error}` });
  }

  const normalizedJoinedAt = normalizeOptionalDate(joinedAt);
  if ('error' in normalizedJoinedAt) {
    return res.status(400).json({ error: normalizedJoinedAt.error });
  }

  const normalizedBio = normalizeOptionalText(bio, 2000);
  if ('error' in normalizedBio) {
    return res.status(400).json({ error: `소개 ${normalizedBio.error}` });
  }

  const normalizedIsAdmin = normalizeBoolean(isAdmin, false);

  try {
    await ensureMembersSchema();

    if (normalizedEmail.value) {
      const existingMemberByEmail = await pool.query<MemberLookupRow>(
        'SELECT id FROM members WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [normalizedEmail.value],
      );

      if (existingMemberByEmail.rows.length > 0) {
        return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
      }
    }

    await pool.query(
      `
        INSERT INTO members (name, email, is_admin, phone, role, department, joined_at, bio)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        normalizedName.value,
        normalizedEmail.value,
        normalizedIsAdmin,
        normalizedPhone.value,
        normalizedRole.value,
        normalizedDepartment.value,
        normalizedJoinedAt.value,
        normalizedBio.value,
      ],
    );

    return res.status(201).json({ message: '회원이 등록되었습니다.' });
  } catch (error) {
    console.error('Member create error:', error);
    return res.status(500).json({ error: '회원 등록 중 오류가 발생했습니다.' });
  }
};

export const updateMember = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const memberId = parseMemberId(req.params.memberId);
  const { name, email, isAdmin, phone, role, department, joinedAt, bio } = req.body as {
    name?: unknown;
    email?: unknown;
    isAdmin?: unknown;
    phone?: unknown;
    role?: unknown;
    department?: unknown;
    joinedAt?: unknown;
    bio?: unknown;
  };

  if (!assertAdminUser(authenticatedUser, res)) {
    return;
  }

  if (!memberId) {
    return res.status(400).json({ error: '유효한 회원 ID가 필요합니다.' });
  }

  const normalizedName = normalizeRequiredText(name, '이름', 100);
  if ('error' in normalizedName) {
    return res.status(400).json({ error: normalizedName.error });
  }

  const normalizedEmail = normalizeOptionalEmail(email);
  if ('error' in normalizedEmail) {
    return res.status(400).json({ error: normalizedEmail.error });
  }

  const normalizedPhone = normalizeOptionalText(phone, 30);
  if ('error' in normalizedPhone) {
    return res.status(400).json({ error: `전화번호 ${normalizedPhone.error}` });
  }

  const normalizedRole = normalizeOptionalText(role, 100);
  if ('error' in normalizedRole) {
    return res.status(400).json({ error: `직책 ${normalizedRole.error}` });
  }

  const normalizedDepartment = normalizeOptionalText(department, 100);
  if ('error' in normalizedDepartment) {
    return res.status(400).json({ error: `부서 ${normalizedDepartment.error}` });
  }

  const normalizedJoinedAt = normalizeOptionalDate(joinedAt);
  if ('error' in normalizedJoinedAt) {
    return res.status(400).json({ error: normalizedJoinedAt.error });
  }

  const normalizedBio = normalizeOptionalText(bio, 2000);
  if ('error' in normalizedBio) {
    return res.status(400).json({ error: `소개 ${normalizedBio.error}` });
  }

  const normalizedIsAdmin = normalizeBoolean(isAdmin, false);

  try {
    await ensureMembersSchema();

    if (normalizedEmail.value) {
      const existingMemberByEmail = await pool.query<MemberLookupRow>(
        'SELECT id FROM members WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
        [normalizedEmail.value, memberId],
      );

      if (existingMemberByEmail.rows.length > 0) {
        return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
      }
    }

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
        normalizedName.value,
        normalizedEmail.value,
        normalizedIsAdmin,
        normalizedPhone.value,
        normalizedRole.value,
        normalizedDepartment.value,
        normalizedJoinedAt.value,
        normalizedBio.value,
        memberId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '해당 회원을 찾을 수 없습니다.' });
    }

    return res.json({ message: '회원 정보가 수정되었습니다.' });
  } catch (error) {
    console.error('Member update error:', error);
    return res.status(500).json({ error: '회원 정보 수정 중 오류가 발생했습니다.' });
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const memberId = parseMemberId(req.params.memberId);

  if (!assertAdminUser(authenticatedUser, res)) {
    return;
  }

  if (!memberId) {
    return res.status(400).json({ error: '유효한 회원 ID가 필요합니다.' });
  }

  try {
    await ensureMembersSchema();
    const result = await pool.query('DELETE FROM members WHERE id = $1', [memberId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '해당 회원을 찾을 수 없습니다.' });
    }

    return res.json({ message: '회원이 삭제되었습니다.' });
  } catch (error) {
    console.error('Member delete error:', error);
    return res.status(500).json({ error: '회원 삭제 중 오류가 발생했습니다.' });
  }
};
