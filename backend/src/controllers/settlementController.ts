import { type Request, type Response } from 'express';
import pool from '../db.js';

interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean | number | string;
}

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

interface SettlementRow {
  id: number;
  date: string;
  item: string;
  amount: number | string;
  relation: string;
}

const parseSettlementId = (rawSettlementId?: string) => {
  const settlementId = Number(rawSettlementId);
  if (!Number.isInteger(settlementId) || settlementId <= 0) {
    return null;
  }

  return settlementId;
};

const parseDate = (rawDate: unknown) => {
  if (typeof rawDate !== 'string') {
    return null;
  }

  const normalizedDate = rawDate.trim().replaceAll('/', '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return null;
  }

  const parts = normalizedDate.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return normalizedDate;
};

const parseAmount = (rawAmount: unknown) => {
  const normalizedAmount =
    typeof rawAmount === 'string' ? Number(rawAmount.trim().replaceAll(',', '')) : Number(rawAmount);

  if (!Number.isFinite(normalizedAmount) || !Number.isInteger(normalizedAmount)) {
    return null;
  }

  return normalizedAmount;
};

const isAdminUser = (authenticatedUser: AuthenticatedUser) => {
  const rawIsAdmin = authenticatedUser.isAdmin;

  if (typeof rawIsAdmin === 'boolean') {
    return rawIsAdmin;
  }

  if (typeof rawIsAdmin === 'number') {
    return rawIsAdmin === 1;
  }

  if (typeof rawIsAdmin === 'string') {
    const normalized = rawIsAdmin.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  }

  return false;
};

const validateSettlementPayload = (payload: {
  date?: unknown;
  item?: unknown;
  amount?: unknown;
  relation?: unknown;
}) => {
  const parsedDate = parseDate(payload.date);
  const parsedAmount = parseAmount(payload.amount);
  const parsedItem = typeof payload.item === 'string' ? payload.item.trim() : '';
  const parsedRelation = typeof payload.relation === 'string' ? payload.relation.trim() : '';

  if (!parsedDate) {
    return { error: '유효한 날짜(YYYY-MM-DD)가 필요합니다.' };
  }

  if (!parsedItem) {
    return { error: '항목을 입력해주세요.' };
  }

  if (parsedAmount === null) {
    return { error: '유효한 금액(정수)을 입력해주세요.' };
  }

  if (!parsedRelation) {
    return { error: 'Relation 값을 입력해주세요.' };
  }

  return {
    value: {
      date: parsedDate,
      item: parsedItem,
      amount: parsedAmount,
      relation: parsedRelation,
    },
  };
};

export const getSettlements = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<SettlementRow>(
      `
        SELECT
          id,
          TO_CHAR(settlement_date, 'YYYY/MM/DD') AS date,
          item,
          amount,
          relation
        FROM settlement
        ORDER BY settlement_date DESC, id DESC
      `,
    );

    return res.json(
      result.rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
      })),
    );
  } catch (error) {
    console.error('Settlement list fetch error:', error);
    return res.status(500).json({ error: '정산 내역 조회 중 오류가 발생했습니다.' });
  }
};

export const createSettlement = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const { date, item, amount, relation } = req.body as {
    date?: unknown;
    item?: unknown;
    amount?: unknown;
    relation?: unknown;
  };

  if (!authenticatedUser) {
    return res.status(401).json({ error: '인증된 사용자 정보가 없습니다.' });
  }

  if (!isAdminUser(authenticatedUser)) {
    return res.status(403).json({ error: '관리자만 정산 내역을 등록할 수 있습니다.' });
  }

  const validation = validateSettlementPayload({ date, item, amount, relation });
  if ('error' in validation) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    await pool.query(
      'INSERT INTO settlement (settlement_date, item, amount, relation) VALUES ($1, $2, $3, $4)',
      [validation.value.date, validation.value.item, validation.value.amount, validation.value.relation],
    );

    return res.status(201).json({ message: '정산 내역이 등록되었습니다.' });
  } catch (error) {
    console.error('Settlement creation error:', error);
    return res.status(500).json({ error: '정산 내역 등록 중 오류가 발생했습니다.' });
  }
};

export const updateSettlement = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const settlementId = parseSettlementId(req.params.id);
  const { date, item, amount, relation } = req.body as {
    date?: unknown;
    item?: unknown;
    amount?: unknown;
    relation?: unknown;
  };

  if (!authenticatedUser) {
    return res.status(401).json({ error: '인증된 사용자 정보가 없습니다.' });
  }

  if (!isAdminUser(authenticatedUser)) {
    return res.status(403).json({ error: '관리자만 정산 내역을 수정할 수 있습니다.' });
  }

  if (!settlementId) {
    return res.status(400).json({ error: '유효한 정산 ID가 필요합니다.' });
  }

  const validation = validateSettlementPayload({ date, item, amount, relation });
  if ('error' in validation) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const result = await pool.query(
      'UPDATE settlement SET settlement_date = $1, item = $2, amount = $3, relation = $4 WHERE id = $5',
      [
        validation.value.date,
        validation.value.item,
        validation.value.amount,
        validation.value.relation,
        settlementId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '해당 정산 내역을 찾을 수 없습니다.' });
    }

    return res.json({ message: '정산 내역이 수정되었습니다.' });
  } catch (error) {
    console.error('Settlement update error:', error);
    return res.status(500).json({ error: '정산 내역 수정 중 오류가 발생했습니다.' });
  }
};

export const deleteSettlement = async (req: Request, res: Response) => {
  const authenticatedUser = (req as AuthenticatedRequest).user;
  const settlementId = parseSettlementId(req.params.id);

  if (!authenticatedUser) {
    return res.status(401).json({ error: '인증된 사용자 정보가 없습니다.' });
  }

  if (!isAdminUser(authenticatedUser)) {
    return res.status(403).json({ error: '관리자만 정산 내역을 삭제할 수 있습니다.' });
  }

  if (!settlementId) {
    return res.status(400).json({ error: '유효한 정산 ID가 필요합니다.' });
  }

  try {
    const result = await pool.query('DELETE FROM settlement WHERE id = $1', [settlementId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: '해당 정산 내역을 찾을 수 없습니다.' });
    }

    return res.json({ message: '정산 내역이 삭제되었습니다.' });
  } catch (error) {
    console.error('Settlement delete error:', error);
    return res.status(500).json({ error: '정산 내역 삭제 중 오류가 발생했습니다.' });
  }
};
