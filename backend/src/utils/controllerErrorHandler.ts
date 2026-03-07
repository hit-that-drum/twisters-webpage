import { type Response } from 'express';
import { isHttpError } from '../errors/httpError.js';

export const handleControllerError = (
  res: Response,
  error: unknown,
  fallbackMessage: string,
  logPrefix: string,
) => {
  if (isHttpError(error)) {
    return res
      .status(error.statusCode)
      .json(error.code ? { error: error.message, code: error.code } : { error: error.message });
  }

  console.error(`${logPrefix}:`, error);
  return res.status(500).json({ error: fallbackMessage });
};
