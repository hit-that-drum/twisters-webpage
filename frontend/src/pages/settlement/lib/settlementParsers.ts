import type { SettlementRecord } from '@/pages/settlement/lib/settlementTypes';

/**
 * Normalizes the raw `/settlement` response into strongly typed rows.
 * Rows with missing or malformed fields are dropped rather than coerced.
 */
export function parseSettlementRows(payload: unknown): SettlementRecord[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const record = row as {
        id?: unknown;
        date?: unknown;
        item?: unknown;
        amount?: unknown;
        relation?: unknown;
      };

      const parsedAmount =
        typeof record.amount === 'number'
          ? record.amount
          : typeof record.amount === 'string'
          ? Number(record.amount)
          : NaN;

      if (
        typeof record.id !== 'number' ||
        typeof record.date !== 'string' ||
        typeof record.item !== 'string' ||
        Number.isNaN(parsedAmount) ||
        typeof record.relation !== 'string'
      ) {
        return null;
      }

      return {
        id: record.id,
        date: record.date,
        item: record.item,
        amount: parsedAmount,
        relation: record.relation,
      } satisfies SettlementRecord;
    })
    .filter((row): row is SettlementRecord => row !== null);
}
