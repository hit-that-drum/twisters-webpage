import pool from '../../config/database.js';
import {
  BOARD_REACTION_TYPES,
  type BoardReactionCountRow,
  type BoardReactionLookupRow,
  type BoardReactionMutationPayload,
  type BoardReactionSummary,
  type BoardReactionType,
  type BoardUserReactionRow,
  createEmptyBoardReactionSummary,
} from '../../types/board.types.js';
import { getScopedTableNames, type DataScope } from '../../utils/dataScope.js';

const isBoardReactionType = (value: string): value is BoardReactionType => {
  return BOARD_REACTION_TYPES.includes(value as BoardReactionType);
};

const assignReactionCount = (
  summary: BoardReactionSummary,
  reactionType: BoardReactionType,
  count: number,
) => {
  switch (reactionType) {
    case 'thumbsUp':
      summary.thumbsUpCount = count;
      return;
    case 'thumbsDown':
      summary.thumbsDownCount = count;
      return;
    case 'favorite':
      summary.favoriteCount = count;
      return;
    case 'heart':
      summary.heartCount = count;
      return;
  }
};

class BoardReactionRepository {
  async findReactionSummariesByBoardIds(
    scope: DataScope,
    boardIds: number[],
    userId: number | null,
  ): Promise<Record<number, BoardReactionSummary>> {
    if (boardIds.length === 0) {
      return {};
    }

    const boardReactionsTableName = getScopedTableNames(scope).boardReactions;
    const summaryByBoardId = Object.fromEntries(
      boardIds.map((boardId) => [boardId, createEmptyBoardReactionSummary()]),
    ) as Record<number, BoardReactionSummary>;

    const reactionCountsResult = await pool.query<BoardReactionCountRow>(
      `SELECT "boardId", type, COUNT(*)::int AS "reactionCount"
         FROM ${boardReactionsTableName}
        WHERE "boardId" = ANY($1::int[])
        GROUP BY "boardId", type`,
      [boardIds],
    );

    reactionCountsResult.rows.forEach((row) => {
      if (!isBoardReactionType(row.type)) {
        return;
      }

      const summary = summaryByBoardId[row.boardId];
      if (!summary) {
        return;
      }

      assignReactionCount(summary, row.type, row.reactionCount);
    });

    if (userId === null) {
      return summaryByBoardId;
    }

    const userReactionsResult = await pool.query<BoardUserReactionRow>(
      `SELECT "boardId", type
         FROM ${boardReactionsTableName}
        WHERE "boardId" = ANY($1::int[])
          AND "userId" = $2`,
      [boardIds, userId],
    );

    userReactionsResult.rows.forEach((row) => {
      if (!isBoardReactionType(row.type)) {
        return;
      }

      const summary = summaryByBoardId[row.boardId];
      if (!summary) {
        return;
      }

      summary.userReactions.push(row.type);
    });

    return summaryByBoardId;
  }

  async findReaction(
    scope: DataScope,
    boardId: number,
    userId: number,
    reactionType: BoardReactionType,
  ) {
    const boardReactionsTableName = getScopedTableNames(scope).boardReactions;
    const result = await pool.query<BoardReactionLookupRow>(
      `SELECT id
         FROM ${boardReactionsTableName}
        WHERE "boardId" = $1
          AND "userId" = $2
          AND type = $3
        LIMIT 1`,
      [boardId, userId, reactionType],
    );

    return result.rows[0] ?? null;
  }

  async createReaction(scope: DataScope, payload: BoardReactionMutationPayload) {
    const boardReactionsTableName = getScopedTableNames(scope).boardReactions;
    await pool.query(
      `INSERT INTO ${boardReactionsTableName} ("boardId", "userId", type)
       VALUES ($1, $2, $3)
       ON CONFLICT ("boardId", "userId", type) DO NOTHING`,
      [payload.boardId, payload.userId, payload.reactionType],
    );
  }

  async deleteReaction(
    scope: DataScope,
    boardId: number,
    userId: number,
    reactionType: BoardReactionType,
  ) {
    const boardReactionsTableName = getScopedTableNames(scope).boardReactions;
    const result = await pool.query(
      `DELETE FROM ${boardReactionsTableName}
        WHERE "boardId" = $1
          AND "userId" = $2
          AND type = $3`,
      [boardId, userId, reactionType],
    );

    return result.rowCount ?? 0;
  }
}

export const boardReactionRepository = new BoardReactionRepository();
