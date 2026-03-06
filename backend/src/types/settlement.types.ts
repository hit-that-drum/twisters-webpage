export interface SettlementRow {
  id: number;
  date: string;
  item: string;
  amount: number | string;
  relation: string;
}

export interface Settlement {
  id: number;
  date: string;
  item: string;
  amount: number;
  relation: string;
}

export interface SettlementMutationDTO {
  date?: unknown;
  item?: unknown;
  amount?: unknown;
  relation?: unknown;
}

export interface SettlementMutationPayload {
  date: string;
  item: string;
  amount: number;
  relation: string;
}
