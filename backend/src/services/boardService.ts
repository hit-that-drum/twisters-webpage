import { HttpError } from '../errors/httpError.js';
import { boardRepository } from '../repositories/boardRepository.js';
import { type AuthenticatedUser } from '../types/common.types.js';
import {
  type Board,
  type BoardMutationPayload,
  type CreateBoardDTO,
  type UpdateBoardDTO,
} from '../types/board.types.js';
import { resolveDataScopeByUser } from '../utils/dataScope.js';

const parseBoardId = (rawBoardId?: string) => {
  const boardId = Number(rawBoardId);
  if (!Number.isInteger(boardId) || boardId <= 0) {
    return null;
  }

  return boardId;
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

const resolveAuditUser = (authenticatedUser: AuthenticatedUser) => {
  const normalizedName = authenticatedUser.name?.trim();
  if (normalizedName) {
    return normalizedName;
  }

  return authenticatedUser.email;
};

const normalizeBoardMutationPayload = (
  payload: CreateBoardDTO | UpdateBoardDTO,
  authenticatedUser: AuthenticatedUser,
): BoardMutationPayload => {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';

  if (!title || !content) {
    throw new HttpError(400, '제목과 내용을 모두 입력해주세요.');
  }

  return {
    title,
    content,
    auditUser: resolveAuditUser(authenticatedUser),
  };
};

class BoardService {
  async getBoards(authenticatedUser: AuthenticatedUser | undefined): Promise<Board[]> {
    const scope = resolveDataScopeByUser(authenticatedUser);
    const rows = await boardRepository.findAll(scope);
    return rows;
  }

  async createBoard(authenticatedUser: AuthenticatedUser | undefined, payload: CreateBoardDTO) {
    const adminUser = requireAdminUser(authenticatedUser, '관리자만 게시글을 등록할 수 있습니다.');
    const normalizedPayload = normalizeBoardMutationPayload(payload, adminUser);
    const scope = resolveDataScopeByUser(adminUser);
    await boardRepository.create(scope, normalizedPayload);
  }

  async updateBoard(
    authenticatedUser: AuthenticatedUser | undefined,
    rawBoardId: string | undefined,
    payload: UpdateBoardDTO,
  ) {
    const adminUser = requireAdminUser(authenticatedUser, '관리자만 게시글을 수정할 수 있습니다.');
    const boardId = parseBoardId(rawBoardId);

    if (!boardId) {
      throw new HttpError(400, '유효한 게시글 ID가 필요합니다.');
    }

    const normalizedPayload = normalizeBoardMutationPayload(payload, adminUser);
    const scope = resolveDataScopeByUser(adminUser);
    const updatedCount = await boardRepository.updateById(scope, boardId, normalizedPayload);

    if (updatedCount === 0) {
      throw new HttpError(404, '해당 게시글을 찾을 수 없습니다.');
    }
  }

  async deleteBoard(authenticatedUser: AuthenticatedUser | undefined, rawBoardId: string | undefined) {
    const adminUser = requireAdminUser(authenticatedUser, '관리자만 게시글을 삭제할 수 있습니다.');
    const boardId = parseBoardId(rawBoardId);

    if (!boardId) {
      throw new HttpError(400, '유효한 게시글 ID가 필요합니다.');
    }

    const scope = resolveDataScopeByUser(adminUser);
    const deletedCount = await boardRepository.deleteById(scope, boardId);

    if (deletedCount === 0) {
      throw new HttpError(404, '해당 게시글을 찾을 수 없습니다.');
    }
  }
}

export const boardService = new BoardService();
