import pool from '../../config/database.js';

let ensureMeetingAttendanceSchemaPromise: Promise<void> | null = null;

export const ensureMeetingAttendanceSchema = async () => {
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
};
