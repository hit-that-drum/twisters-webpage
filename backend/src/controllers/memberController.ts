import { type Request, type Response } from 'express';
import { memberService } from '../services/memberService.js';
import { type AuthenticatedRequest } from '../types/common.types.js';
import { type MemberMutationDTO } from '../types/member.types.js';
import { handleControllerError } from '../utils/controllerErrorHandler.js';

export const getMembers = async (_req: Request, res: Response) => {
  try {
    const authenticatedUser = (_req as AuthenticatedRequest).user;
    const members = await memberService.getMembers(authenticatedUser);
    return res.json(members);
  } catch (error) {
    return handleControllerError(res, error, '회원 정보 조회 중 오류가 발생했습니다.', 'Member list fetch error');
  }
};

export const getMemberDuesDepositStatus = async (_req: Request, res: Response) => {
  try {
    const authenticatedUser = (_req as AuthenticatedRequest).user;
    const memberDuesDepositStatus = await memberService.getMemberDuesDepositStatus(authenticatedUser);
    return res.json(memberDuesDepositStatus);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '회원 회비 입금 현황 조회 중 오류가 발생했습니다.',
      'Member dues status fetch error',
    );
  }
};

export const createMember = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as MemberMutationDTO;
    await memberService.createMember(authenticatedUser, payload);
    return res.status(201).json({ message: '회원이 등록되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '회원 등록 중 오류가 발생했습니다.', 'Member create error');
  }
};

export const updateMember = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as MemberMutationDTO;
    await memberService.updateMember(authenticatedUser, req.params.memberId, payload);
    return res.json({ message: '회원 정보가 수정되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '회원 정보 수정 중 오류가 발생했습니다.', 'Member update error');
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    await memberService.deleteMember(authenticatedUser, req.params.memberId);
    return res.json({ message: '회원이 삭제되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '회원 삭제 중 오류가 발생했습니다.', 'Member delete error');
  }
};
