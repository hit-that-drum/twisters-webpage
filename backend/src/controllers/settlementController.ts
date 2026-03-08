import { type Request, type Response } from 'express';
import { settlementService } from '../services/settlementService.js';
import { type AuthenticatedRequest } from '../types/common.types.js';
import { type SettlementMutationDTO } from '../types/settlement.types.js';
import { handleControllerError } from '../utils/controllerErrorHandler.js';

export const getSettlements = async (_req: Request, res: Response) => {
  try {
    const authenticatedUser = (_req as AuthenticatedRequest).user;
    const settlements = await settlementService.getSettlements(authenticatedUser);
    return res.json(settlements);
  } catch (error) {
    return handleControllerError(res, error, '정산 내역 조회 중 오류가 발생했습니다.', 'Settlement list fetch error');
  }
};

export const createSettlement = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as SettlementMutationDTO;
    await settlementService.createSettlement(authenticatedUser, payload);
    return res.status(201).json({ message: '정산 내역이 등록되었습니다.' });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '정산 내역 등록 중 오류가 발생했습니다.',
      'Settlement creation error',
    );
  }
};

export const updateSettlement = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as SettlementMutationDTO;
    await settlementService.updateSettlement(authenticatedUser, req.params.id, payload);
    return res.json({ message: '정산 내역이 수정되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '정산 내역 수정 중 오류가 발생했습니다.', 'Settlement update error');
  }
};

export const deleteSettlement = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    await settlementService.deleteSettlement(authenticatedUser, req.params.id);
    return res.json({ message: '정산 내역이 삭제되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '정산 내역 삭제 중 오류가 발생했습니다.', 'Settlement delete error');
  }
};
