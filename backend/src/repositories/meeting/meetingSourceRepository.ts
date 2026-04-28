import pool from '../../config/database.js';
import {
  type MeetingSourceMutationPayload,
  type MeetingSourceRow,
} from '../../types/meetingAttendance.types.js';
import { getScopedTableNames, type DataScope } from '../../utils/dataScope.js';

class MeetingSourceRepository {
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
}

export const meetingSourceRepository = new MeetingSourceRepository();
