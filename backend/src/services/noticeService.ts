import { HttpError } from '../errors/httpError.js';
import { noticeRepository } from '../repositories/noticeRepository.js';
import {
  type CreateNoticeDTO,
  type Notice,
  type NoticeMutationPayload,
  type UpdateNoticeDTO,
} from '../types/notice.types.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import { resolveDataScopeByUser } from '../utils/dataScope.js';

const parseNoticeId = (rawNoticeId?: string) => {
  const noticeId = Number(rawNoticeId);
  if (!Number.isInteger(noticeId) || noticeId <= 0) {
    return null;
  }

  return noticeId;
};

const parsePinned = (rawPinned: unknown, defaultValue = false) => {
  if (typeof rawPinned === 'boolean') {
    return rawPinned;
  }

  if (typeof rawPinned === 'number') {
    return rawPinned === 1;
  }

  if (typeof rawPinned === 'string') {
    const normalized = rawPinned.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return defaultValue;
};

const resolveAuditUser = (authenticatedUser: AuthenticatedUser) => {
  const normalizedName = authenticatedUser.name?.trim();
  if (normalizedName) {
    return normalizedName;
  }

  return authenticatedUser.email;
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

const normalizeNoticeMutationPayload = (
  payload: CreateNoticeDTO | UpdateNoticeDTO,
  authenticatedUser: AuthenticatedUser,
): NoticeMutationPayload => {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';

  if (!title || !content) {
    throw new HttpError(400, '제목과 내용을 모두 입력해주세요.');
  }

  return {
    title,
    content,
    pinned: parsePinned(payload.pinned, false),
    auditUser: resolveAuditUser(authenticatedUser),
  };
};

class NoticeService {
  async getNotices(authenticatedUser: AuthenticatedUser | undefined): Promise<Notice[]> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    const rows = await noticeRepository.findAll(scope);
    return rows.map((row) => ({
      ...row,
      pinned: Boolean(row.pinned),
    }));
  }

  async createNotice(authenticatedUser: AuthenticatedUser | undefined, payload: CreateNoticeDTO) {
    const adminUser = requireAdminUser(authenticatedUser, '관리자만 공지사항을 등록할 수 있습니다.');
    const normalizedPayload = normalizeNoticeMutationPayload(payload, adminUser);
    const scope = resolveDataScopeByUser(adminUser);
    await noticeRepository.create(scope, normalizedPayload);
  }

  async updateNotice(
    authenticatedUser: AuthenticatedUser | undefined,
    rawNoticeId: string | undefined,
    payload: UpdateNoticeDTO,
  ) {
    const adminUser = requireAdminUser(authenticatedUser, '관리자만 공지사항을 수정할 수 있습니다.');
    const noticeId = parseNoticeId(rawNoticeId);
    if (!noticeId) {
      throw new HttpError(400, '유효한 공지사항 ID가 필요합니다.');
    }

    const normalizedPayload = normalizeNoticeMutationPayload(payload, adminUser);
    const scope = resolveDataScopeByUser(adminUser);
    const updatedCount = await noticeRepository.updateById(scope, noticeId, normalizedPayload);

    if (updatedCount === 0) {
      throw new HttpError(404, '해당 공지사항을 찾을 수 없습니다.');
    }
  }

  async deleteNotice(authenticatedUser: AuthenticatedUser | undefined, rawNoticeId: string | undefined) {
    const adminUser = requireAdminUser(authenticatedUser, '관리자만 공지사항을 삭제할 수 있습니다.');

    const noticeId = parseNoticeId(rawNoticeId);
    if (!noticeId) {
      throw new HttpError(400, '유효한 공지사항 ID가 필요합니다.');
    }

    const scope = resolveDataScopeByUser(adminUser);
    const deletedCount = await noticeRepository.deleteById(scope, noticeId);
    if (deletedCount === 0) {
      throw new HttpError(404, '해당 공지사항을 찾을 수 없습니다.');
    }
  }
}

export const noticeService = new NoticeService();
