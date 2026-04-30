import pool from '../../config/database.js';
import { type MeetingAttendanceOverrideRow } from '../../types/meetingAttendance.types.js';
import { getScopedTableNames, type DataScope } from '../../utils/dataScope.js';

class MeetingAttendanceOverrideRepository {
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

export const meetingAttendanceOverrideRepository = new MeetingAttendanceOverrideRepository();
