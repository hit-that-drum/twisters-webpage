export interface SettlementRecord {
  id: number;
  date: string;
  item: string;
  amount: number;
  relation: string;
}

export interface SettlementPayload {
  date: string;
  item: string;
  amount: number;
  relation: string;
}

export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;
