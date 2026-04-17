import { type Request, type Response } from 'express';
import { memberService } from '../services/memberService.js';
import { type AuthenticatedRequest } from '../types/common.types.js';
import { type MemberMeetingAttendanceOverrideDTO, type MemberMutationDTO } from '../types/member.types.js';
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

export const getMemberMeetingAttendanceStatus = async (_req: Request, res: Response) => {
  try {
    const authenticatedUser = (_req as AuthenticatedRequest).user;
    const memberMeetingAttendanceStatus =
      await memberService.getMemberMeetingAttendanceStatus(authenticatedUser);
    return res.json(memberMeetingAttendanceStatus);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '회원 모임 참석 현황 조회 중 오류가 발생했습니다.',
      'Member meeting attendance status fetch error',
    );
  }
};

export const updateMemberMeetingAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as MemberMeetingAttendanceOverrideDTO;
    await memberService.updateMemberMeetingAttendanceStatus(
      authenticatedUser,
      req.params.memberId,
      req.params.meetingYear,
      req.params.meetingPeriod,
      payload,
    );
    return res.json({ message: '회원 모임 참석 여부가 저장되었습니다.' });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '회원 모임 참석 여부 저장 중 오류가 발생했습니다.',
      'Member meeting attendance update error',
    );
  }
};

export const clearMemberMeetingAttendanceStatus = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    await memberService.clearMemberMeetingAttendanceStatus(
      authenticatedUser,
      req.params.memberId,
      req.params.meetingYear,
      req.params.meetingPeriod,
    );
    return res.json({ message: '회원 모임 참석 수동 설정이 해제되었습니다.' });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '회원 모임 참석 수동 설정 해제 중 오류가 발생했습니다.',
      'Member meeting attendance clear error',
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
