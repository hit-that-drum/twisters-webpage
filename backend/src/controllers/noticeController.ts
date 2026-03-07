import { type Request, type Response } from 'express';
import { noticeService } from '../services/noticeService.js';
import { type AuthenticatedRequest } from '../types/common.types.js';
import { type CreateNoticeDTO, type UpdateNoticeDTO } from '../types/notice.types.js';
import { handleControllerError } from '../utils/controllerErrorHandler.js';

export const getNotices = async (_req: Request, res: Response) => {
  try {
    const notices = await noticeService.getNotices();
    return res.json(notices);
  } catch (error) {
    return handleControllerError(res, error, '공지사항 조회 중 오류가 발생했습니다.', 'Notice list fetch error');
  }
};

export const createNotice = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as CreateNoticeDTO;
    await noticeService.createNotice(authenticatedUser, payload);
    return res.status(201).json({ message: '공지사항이 등록되었습니다.' });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '공지사항 등록 중 오류가 발생했습니다.',
      'Notice creation error',
    );
  }
};

export const updateNotice = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as UpdateNoticeDTO;
    await noticeService.updateNotice(authenticatedUser, req.params.id, payload);
    return res.json({ message: '공지사항이 수정되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '공지사항 수정 중 오류가 발생했습니다.', 'Notice update error');
  }
};

export const deleteNotice = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    await noticeService.deleteNotice(authenticatedUser, req.params.id);
    return res.json({ message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '공지사항 삭제 중 오류가 발생했습니다.', 'Notice delete error');
  }
};
