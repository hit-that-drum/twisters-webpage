import pool from '../../config/database.js';
import {
  type MeetingBoardSeedRow,
  type MeetingCommentSeedRow,
  type MeetingMemberSeedRow,
  type UserMemberMappingRow,
} from '../../types/meetingAttendance.types.js';
import { getScopedTableNames, type DataScope } from '../../utils/dataScope.js';

class MeetingSeedRepository {
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
}

export const meetingSeedRepository = new MeetingSeedRepository();
