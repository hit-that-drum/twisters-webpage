import pool from '../../config/database.js';
import {
  type MeetingAttendanceUpsertRow,
  type MemberMeetingAttendanceRow,
} from '../../types/meetingAttendance.types.js';
import { getScopedTableNames, type DataScope } from '../../utils/dataScope.js';

class MeetingAttendanceDerivedRepository {
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
}

export const meetingAttendanceDerivedRepository = new MeetingAttendanceDerivedRepository();
