import pool from '../db.js';
import {
  type MeetingAttendanceUpsertRow,
  type MeetingAttendanceOverrideRow,
  type MeetingBoardSeedRow,
  type MeetingCommentSeedRow,
  type MeetingMemberSeedRow,
  type MeetingSourceMutationPayload,
  type MeetingSourceRow,
  type MemberMeetingAttendanceRow,
  type UserMemberMappingRow,
} from '../types/meetingAttendance.types.js';
import { getScopedTableNames, type DataScope } from '../utils/dataScope.js';

let ensureMeetingAttendanceSchemaPromise: Promise<void> | null = null;

class MeetingAttendanceRepository {
  async ensureMeetingAttendanceSchema() {
    if (!ensureMeetingAttendanceSchemaPromise) {
      ensureMeetingAttendanceSchemaPromise = (async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS meeting_sources (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "boardId" INTEGER NOT NULL UNIQUE REFERENCES board(id) ON DELETE CASCADE,
            "meetingYear" INTEGER NOT NULL,
            "meetingPeriod" SMALLINT NOT NULL DEFAULT 1,
            title VARCHAR(255) NOT NULL,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS test_meeting_sources (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "boardId" INTEGER NOT NULL UNIQUE REFERENCES test_board(id) ON DELETE CASCADE,
            "meetingYear" INTEGER NOT NULL,
            "meetingPeriod" SMALLINT NOT NULL DEFAULT 1,
            title VARCHAR(255) NOT NULL,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS meeting_attendance (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "meetingSourceId" INTEGER NOT NULL REFERENCES meeting_sources(id) ON DELETE CASCADE,
            "memberId" INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
            "sourceCommentId" INTEGER REFERENCES board_comments(id) ON DELETE SET NULL,
            "sourceType" VARCHAR(30) NOT NULL DEFAULT 'derived',
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE("meetingSourceId", "memberId")
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS test_meeting_attendance (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "meetingSourceId" INTEGER NOT NULL REFERENCES test_meeting_sources(id) ON DELETE CASCADE,
            "memberId" INTEGER NOT NULL REFERENCES test_members(id) ON DELETE CASCADE,
            "sourceCommentId" INTEGER REFERENCES test_board_comments(id) ON DELETE SET NULL,
            "sourceType" VARCHAR(30) NOT NULL DEFAULT 'derived',
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE("meetingSourceId", "memberId")
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS meeting_attendance_overrides (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "memberId" INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
            "meetingYear" INTEGER NOT NULL,
            "meetingPeriod" SMALLINT NOT NULL DEFAULT 1,
            attended BOOLEAN NOT NULL,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE("memberId", "meetingYear", "meetingPeriod")
          )
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS test_meeting_attendance_overrides (
            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            "memberId" INTEGER NOT NULL REFERENCES test_members(id) ON DELETE CASCADE,
            "meetingYear" INTEGER NOT NULL,
            "meetingPeriod" SMALLINT NOT NULL DEFAULT 1,
            attended BOOLEAN NOT NULL,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE("memberId", "meetingYear", "meetingPeriod")
          )
        `);

        await pool.query(
          'ALTER TABLE meeting_sources ADD COLUMN IF NOT EXISTS "meetingPeriod" SMALLINT NOT NULL DEFAULT 1',
        );
        await pool.query(
          'ALTER TABLE test_meeting_sources ADD COLUMN IF NOT EXISTS "meetingPeriod" SMALLINT NOT NULL DEFAULT 1',
        );
        await pool.query(
          'ALTER TABLE meeting_attendance_overrides ADD COLUMN IF NOT EXISTS "meetingPeriod" SMALLINT NOT NULL DEFAULT 1',
        );
        await pool.query(
          'ALTER TABLE test_meeting_attendance_overrides ADD COLUMN IF NOT EXISTS "meetingPeriod" SMALLINT NOT NULL DEFAULT 1',
        );

        await pool.query(
          'ALTER TABLE meeting_attendance_overrides DROP CONSTRAINT IF EXISTS "meeting_attendance_overrides_memberId_meetingYear_key"',
        );
        await pool.query(
          'ALTER TABLE test_meeting_attendance_overrides DROP CONSTRAINT IF EXISTS "test_meeting_attendance_overrides_memberId_meetingYear_key"',
        );

        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_meeting_sources_year ON meeting_sources ("meetingYear" DESC)',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_test_meeting_sources_year ON test_meeting_sources ("meetingYear" DESC)',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_meeting_sources_year_period ON meeting_sources ("meetingYear" DESC, "meetingPeriod" ASC)',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_test_meeting_sources_year_period ON test_meeting_sources ("meetingYear" DESC, "meetingPeriod" ASC)',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_meeting_attendance_member_id ON meeting_attendance ("memberId")',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_test_meeting_attendance_member_id ON test_meeting_attendance ("memberId")',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_meeting_attendance_overrides_member_year_period ON meeting_attendance_overrides ("memberId", "meetingYear", "meetingPeriod")',
        );
        await pool.query(
          'CREATE INDEX IF NOT EXISTS idx_test_meeting_attendance_overrides_member_year_period ON test_meeting_attendance_overrides ("memberId", "meetingYear", "meetingPeriod")',
        );
        await pool.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_attendance_overrides_member_year_period_unique ON meeting_attendance_overrides ("memberId", "meetingYear", "meetingPeriod")',
        );
        await pool.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_test_meeting_attendance_overrides_member_year_period_unique ON test_meeting_attendance_overrides ("memberId", "meetingYear", "meetingPeriod")',
        );

        await pool.query(`
          CREATE OR REPLACE FUNCTION update_meeting_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW."updatedAt" = NOW();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_meeting_sources_updated_at ON meeting_sources');
        await pool.query(`
          CREATE TRIGGER trg_meeting_sources_updated_at
          BEFORE UPDATE ON meeting_sources
          FOR EACH ROW
          EXECUTE FUNCTION update_meeting_updated_at()
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_test_meeting_sources_updated_at ON test_meeting_sources');
        await pool.query(`
          CREATE TRIGGER trg_test_meeting_sources_updated_at
          BEFORE UPDATE ON test_meeting_sources
          FOR EACH ROW
          EXECUTE FUNCTION update_meeting_updated_at()
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_meeting_attendance_updated_at ON meeting_attendance');
        await pool.query(`
          CREATE TRIGGER trg_meeting_attendance_updated_at
          BEFORE UPDATE ON meeting_attendance
          FOR EACH ROW
          EXECUTE FUNCTION update_meeting_updated_at()
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_test_meeting_attendance_updated_at ON test_meeting_attendance');
        await pool.query(`
          CREATE TRIGGER trg_test_meeting_attendance_updated_at
          BEFORE UPDATE ON test_meeting_attendance
          FOR EACH ROW
          EXECUTE FUNCTION update_meeting_updated_at()
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_meeting_attendance_overrides_updated_at ON meeting_attendance_overrides');
        await pool.query(`
          CREATE TRIGGER trg_meeting_attendance_overrides_updated_at
          BEFORE UPDATE ON meeting_attendance_overrides
          FOR EACH ROW
          EXECUTE FUNCTION update_meeting_updated_at()
        `);

        await pool.query('DROP TRIGGER IF EXISTS trg_test_meeting_attendance_overrides_updated_at ON test_meeting_attendance_overrides');
        await pool.query(`
          CREATE TRIGGER trg_test_meeting_attendance_overrides_updated_at
          BEFORE UPDATE ON test_meeting_attendance_overrides
          FOR EACH ROW
          EXECUTE FUNCTION update_meeting_updated_at()
        `);
      })().catch((error) => {
        ensureMeetingAttendanceSchemaPromise = null;
        throw error;
      });
    }

    await ensureMeetingAttendanceSchemaPromise;
  }

  async findMeetingBoardById(scope: DataScope, boardId: number) {
    const { board: boardTable } = getScopedTableNames(scope);
    const result = await pool.query<MeetingBoardSeedRow>(
      `
        SELECT b.id, b."authorId", u."isAdmin" AS "authorIsAdmin", b.title, b.content
        FROM ${boardTable} b
        LEFT JOIN users u ON u.id = b."authorId"
        WHERE b.id = $1
        LIMIT 1
      `,
      [boardId],
    );

    return result.rows[0] ?? null;
  }

  async findAllMeetingBoardCandidates(scope: DataScope) {
    const { board: boardTable } = getScopedTableNames(scope);
    const result = await pool.query<MeetingBoardSeedRow>(
      `
        SELECT b.id, b."authorId", u."isAdmin" AS "authorIsAdmin", b.title, b.content
        FROM ${boardTable} b
        LEFT JOIN users u ON u.id = b."authorId"
        WHERE b.title LIKE '%모임%'
        ORDER BY b.id ASC
      `,
    );

    return result.rows;
  }

  async findCommentsByBoardId(scope: DataScope, boardId: number) {
    const { boardComments: boardCommentsTable } = getScopedTableNames(scope);
    const result = await pool.query<MeetingCommentSeedRow>(
      `
        SELECT id, "boardId", "authorId", "authorName", content
        FROM ${boardCommentsTable}
        WHERE "boardId" = $1
        ORDER BY "createdAt" ASC, id ASC
      `,
      [boardId],
    );

    return result.rows;
  }

  async findAllMembers(scope: DataScope) {
    const { members: membersTable } = getScopedTableNames(scope);
    const result = await pool.query<MeetingMemberSeedRow>(
      `SELECT id, name, email FROM ${membersTable} ORDER BY name COLLATE "ko-KR-x-icu" ASC, id ASC`,
    );
    return result.rows;
  }

  async findMemberIdsByUserIds(scope: DataScope, userIds: number[]) {
    if (userIds.length === 0) {
      return [] as UserMemberMappingRow[];
    }

    const { members: membersTable } = getScopedTableNames(scope);
    const result = await pool.query<UserMemberMappingRow>(
      `
        SELECT u.id AS "userId", m.id AS "memberId"
        FROM users u
        INNER JOIN ${membersTable} m
          ON m.email IS NOT NULL
         AND LOWER(BTRIM(m.email)) = LOWER(BTRIM(u.email))
        WHERE u.id = ANY($1::int[])
      `,
      [userIds],
    );

    return result.rows;
  }

  async upsertMeetingSource(scope: DataScope, payload: MeetingSourceMutationPayload) {
    const { meetingSources: meetingSourcesTable } = getScopedTableNames(scope);
      const result = await pool.query<MeetingSourceRow>(
        `
        INSERT INTO ${meetingSourcesTable} ("boardId", "meetingYear", "meetingPeriod", title)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ("boardId") DO UPDATE
        SET "meetingYear" = EXCLUDED."meetingYear",
            "meetingPeriod" = EXCLUDED."meetingPeriod",
            title = EXCLUDED.title,
            "updatedAt" = NOW()
        RETURNING id, "boardId", "meetingYear", "meetingPeriod", title
      `,
      [payload.boardId, payload.meetingYear, payload.meetingPeriod, payload.title],
    );

    return result.rows[0] ?? null;
  }

  async deleteMeetingSourceByBoardId(scope: DataScope, boardId: number) {
    const { meetingSources: meetingSourcesTable } = getScopedTableNames(scope);
    await pool.query(`DELETE FROM ${meetingSourcesTable} WHERE "boardId" = $1`, [boardId]);
  }

  async deleteMeetingSourcesExceptBoardIds(scope: DataScope, boardIds: number[]) {
    const { meetingSources: meetingSourcesTable } = getScopedTableNames(scope);

    if (boardIds.length === 0) {
      await pool.query(`DELETE FROM ${meetingSourcesTable}`);
      return;
    }

    await pool.query(`DELETE FROM ${meetingSourcesTable} WHERE NOT ("boardId" = ANY($1::int[]))`, [boardIds]);
  }

  async replaceMeetingAttendance(
    scope: DataScope,
    meetingSourceId: number,
    rows: MeetingAttendanceUpsertRow[],
  ) {
    const { meetingAttendance: meetingAttendanceTable } = getScopedTableNames(scope);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM ${meetingAttendanceTable} WHERE "meetingSourceId" = $1`, [
        meetingSourceId,
      ]);

      if (rows.length > 0) {
        const values: Array<number | string | null> = [];
        const placeholders = rows.map((row, index) => {
          const offset = index * 4;
          values.push(meetingSourceId, row.memberId, row.sourceCommentId, row.sourceType);
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
        });

        await client.query(
          `
            INSERT INTO ${meetingAttendanceTable} ("meetingSourceId", "memberId", "sourceCommentId", "sourceType")
            VALUES ${placeholders.join(', ')}
          `,
          values,
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findMeetingAttendanceRows(scope: DataScope) {
    const { meetingSources: meetingSourcesTable, meetingAttendance: meetingAttendanceTable } =
      getScopedTableNames(scope);
    const result = await pool.query<MemberMeetingAttendanceRow>(
      `
        SELECT attendance."memberId" AS "memberId", source."meetingYear" AS "meetingYear", source."meetingPeriod" AS "meetingPeriod"
        FROM ${meetingAttendanceTable} attendance
        INNER JOIN ${meetingSourcesTable} source ON source.id = attendance."meetingSourceId"
      `,
    );
    return result.rows;
  }

  async findMeetingAttendanceOverrideRows(scope: DataScope) {
    const { meetingAttendanceOverrides: meetingAttendanceOverridesTable } = getScopedTableNames(scope);
    const result = await pool.query<MeetingAttendanceOverrideRow>(
      `
        SELECT "memberId" AS "memberId", "meetingYear" AS "meetingYear", "meetingPeriod" AS "meetingPeriod", attended
        FROM ${meetingAttendanceOverridesTable}
      `,
    );
    return result.rows;
  }

  async findMeetingPeriods(scope: DataScope) {
    const {
      meetingSources: meetingSourcesTable,
      meetingAttendanceOverrides: meetingAttendanceOverridesTable,
    } = getScopedTableNames(scope);
    const result = await pool.query<{ meetingYear: number | string; meetingPeriod: number | string }>(
      `
        SELECT DISTINCT "meetingYear" AS "meetingYear", "meetingPeriod" AS "meetingPeriod" FROM ${meetingSourcesTable}
        UNION
        SELECT DISTINCT "meetingYear" AS "meetingYear", "meetingPeriod" AS "meetingPeriod" FROM ${meetingAttendanceOverridesTable}
        ORDER BY "meetingYear" ASC, "meetingPeriod" ASC
      `,
    );
    return result.rows;
  }

  async upsertMeetingAttendanceOverride(
    scope: DataScope,
    memberId: number,
    meetingYear: number,
    meetingPeriod: number,
    attended: boolean,
  ) {
    const { meetingAttendanceOverrides: meetingAttendanceOverridesTable } = getScopedTableNames(scope);
    await pool.query(
      `
        INSERT INTO ${meetingAttendanceOverridesTable} ("memberId", "meetingYear", "meetingPeriod", attended)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ("memberId", "meetingYear", "meetingPeriod") DO UPDATE
        SET attended = EXCLUDED.attended,
            "updatedAt" = NOW()
      `,
      [memberId, meetingYear, meetingPeriod, attended],
    );
  }

  async deleteMeetingAttendanceOverride(
    scope: DataScope,
    memberId: number,
    meetingYear: number,
    meetingPeriod: number,
  ) {
    const { meetingAttendanceOverrides: meetingAttendanceOverridesTable } = getScopedTableNames(scope);
    await pool.query(
      `DELETE FROM ${meetingAttendanceOverridesTable} WHERE "memberId" = $1 AND "meetingYear" = $2 AND "meetingPeriod" = $3`,
      [memberId, meetingYear, meetingPeriod],
    );
  }
}

export const meetingAttendanceRepository = new MeetingAttendanceRepository();
