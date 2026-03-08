import { HttpError } from '../errors/httpError.js';
import { settlementRepository } from '../repositories/settlementRepository.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import {
  type Settlement,
  type SettlementMutationDTO,
  type SettlementMutationPayload,
} from '../types/settlement.types.js';
import { resolveDataScopeByUser } from '../utils/dataScope.js';

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

const requireAdminUser = (authenticatedUser: AuthenticatedUser | undefined, actionMessage: string) => {
  if (!authenticatedUser) {
    throw new HttpError(401, '인증된 사용자 정보가 없습니다.');
  }

  if (!isAdminUser(authenticatedUser)) {
    throw new HttpError(403, actionMessage);
  }

  return authenticatedUser;
};

const normalizeSettlementPayload = (payload: SettlementMutationDTO): SettlementMutationPayload => {
  const date = parseDate(payload.date);
  const amount = parseAmount(payload.amount);
  const item = typeof payload.item === 'string' ? payload.item.trim() : '';
  const relation = typeof payload.relation === 'string' ? payload.relation.trim() : '';

  if (!date) {
    throw new HttpError(400, '유효한 날짜(YYYY-MM-DD)가 필요합니다.');
  }

  if (!item) {
    throw new HttpError(400, '항목을 입력해주세요.');
  }

  if (amount === null) {
    throw new HttpError(400, '유효한 금액(정수)을 입력해주세요.');
  }

  if (!relation) {
    throw new HttpError(400, 'Relation 값을 입력해주세요.');
  }

  return {
    date,
    item,
    amount,
    relation,
  };
};

class SettlementService {
  async getSettlements(authenticatedUser: AuthenticatedUser | undefined): Promise<Settlement[]> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    const rows = await settlementRepository.findAll(scope);
    return rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
    }));
  }

  async createSettlement(authenticatedUser: AuthenticatedUser | undefined, payload: SettlementMutationDTO) {
    const adminUser = requireAdminUser(authenticatedUser, '관리자만 정산 내역을 등록할 수 있습니다.');
    const normalizedPayload = normalizeSettlementPayload(payload);
    const scope = resolveDataScopeByUser(adminUser);
    await settlementRepository.create(scope, normalizedPayload);
  }

  async updateSettlement(
    authenticatedUser: AuthenticatedUser | undefined,
    rawSettlementId: string | undefined,
    payload: SettlementMutationDTO,
  ) {
    const adminUser = requireAdminUser(authenticatedUser, '관리자만 정산 내역을 수정할 수 있습니다.');
    const scope = resolveDataScopeByUser(adminUser);

    const settlementId = parseSettlementId(rawSettlementId);
    if (!settlementId) {
      throw new HttpError(400, '유효한 정산 ID가 필요합니다.');
    }

    const normalizedPayload = normalizeSettlementPayload(payload);
    const updatedCount = await settlementRepository.updateById(scope, settlementId, normalizedPayload);

    if (updatedCount === 0) {
      throw new HttpError(404, '해당 정산 내역을 찾을 수 없습니다.');
    }
  }

  async deleteSettlement(authenticatedUser: AuthenticatedUser | undefined, rawSettlementId: string | undefined) {
    const adminUser = requireAdminUser(authenticatedUser, '관리자만 정산 내역을 삭제할 수 있습니다.');
    const scope = resolveDataScopeByUser(adminUser);

    const settlementId = parseSettlementId(rawSettlementId);
    if (!settlementId) {
      throw new HttpError(400, '유효한 정산 ID가 필요합니다.');
    }

    const deletedCount = await settlementRepository.deleteById(scope, settlementId);
    if (deletedCount === 0) {
      throw new HttpError(404, '해당 정산 내역을 찾을 수 없습니다.');
    }
  }
}

export const settlementService = new SettlementService();
