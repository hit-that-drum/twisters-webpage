import { type Request, type Response } from 'express';
import { b2StorageService } from '../services/storage/b2StorageService.js';
import { type AuthenticatedRequest } from '../types/common.types.js';
import {
  type CreateImageDownloadUrlDTO,
  type CreateImageUploadUrlDTO,
} from '../types/upload.types.js';
import { requireAuthenticatedUser } from '../utils/authScope.js';
import { handleControllerError } from '../utils/controllerErrorHandler.js';

export const createImageUploadUrl = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = requireAuthenticatedUser((req as AuthenticatedRequest).user);
    const payload = req.body as CreateImageUploadUrlDTO;
    const result = await b2StorageService.createImageUploadUrl(authenticatedUser, payload);
    return res.json(result);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '이미지 업로드 URL 생성 중 오류가 발생했습니다.',
      'Image upload URL creation error',
    );
  }
};

export const createImageDownloadUrl = async (req: Request, res: Response) => {
  try {
    requireAuthenticatedUser((req as AuthenticatedRequest).user);
    const payload = req.body as CreateImageDownloadUrlDTO;
    const result = await b2StorageService.createImageDownloadUrl(payload);
    return res.json(result);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      '이미지 조회 URL 생성 중 오류가 발생했습니다.',
      'Image download URL creation error',
    );
  }
};
