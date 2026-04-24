import type {
  SettlementFormState,
} from '@/pages/settlement/SettlementDetailModal';
import type { SettlementPayload, SettlementRecord } from './settlementTypes';

export const toInputDate = (rawDate: string) => {
  const normalized = rawDate.trim().replaceAll('/', '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return '';
  }

  return normalized;
};

export const createDefaultForm = (): SettlementFormState => {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  return {
    date: localDate,
    item: '',
    amountType: 'deposit',
    amount: '',
    relation: '',
  };
};

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export const formatAmount = (amount: number) => {
  const absoluteAmount = currencyFormatter.format(Math.abs(amount));
  return amount < 0 ? `-${absoluteAmount}` : absoluteAmount;
};

export const buildSettlementPayload = (form: SettlementFormState) => {
  const date = toInputDate(form.date);
  const item = form.item.trim();
  const relation = form.relation.trim();
  const parsedAmount = Number(form.amount.trim().replaceAll(',', ''));

  if (!date) {
    return { error: '유효한 날짜(YYYY-MM-DD)를 입력해주세요.' };
  }

  if (!item) {
    return { error: '항목을 입력해주세요.' };
  }

  if (!Number.isFinite(parsedAmount) || !Number.isInteger(parsedAmount) || parsedAmount < 0) {
    return { error: '금액은 0 이상의 정수로 입력해주세요.' };
  }

  if (!relation) {
    return { error: 'Relation 값을 입력해주세요.' };
  }

  const signedAmount =
    form.amountType === 'withdraw' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

  return {
    value: {
      date,
      item,
      amount: signedAmount,
      relation,
    } satisfies SettlementPayload,
  };
};

export const toFormStateFromRecord = (record: SettlementRecord): SettlementFormState => ({
  date: toInputDate(record.date),
  item: record.item,
  amountType: record.amount < 0 ? 'withdraw' : 'deposit',
  amount: String(Math.abs(record.amount)),
  relation: record.relation,
});
