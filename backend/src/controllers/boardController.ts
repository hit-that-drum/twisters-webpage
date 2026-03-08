import { type Request, type Response } from 'express';
import { boardService } from '../services/boardService.js';
import { type AuthenticatedRequest } from '../types/common.types.js';
import {
  type CreateBoardCommentDTO,
  type CreateBoardDTO,
  type UpdateBoardDTO,
} from '../types/board.types.js';
import { handleControllerError } from '../utils/controllerErrorHandler.js';

export const getBoards = async (req: Request, res: Response) => {
  try {
    const query: { search?: string; sort?: string } = {};
    if (typeof req.query.search === 'string') {
      query.search = req.query.search;
    }

    if (typeof req.query.sort === 'string') {
      query.sort = req.query.sort;
    }

    const boards = await boardService.getBoards(query);
    return res.json(boards);
  } catch (error) {
    return handleControllerError(res, error, '게시글 조회 중 오류가 발생했습니다.', 'Board list fetch error');
  }
};

export const createBoard = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as CreateBoardDTO;
    await boardService.createBoard(authenticatedUser, payload);
    return res.status(201).json({ message: '게시글이 등록되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '게시글 등록 중 오류가 발생했습니다.', 'Board create error');
  }
};

export const updateBoard = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as UpdateBoardDTO;
    await boardService.updateBoard(authenticatedUser, req.params.id, payload);
    return res.json({ message: '게시글이 수정되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '게시글 수정 중 오류가 발생했습니다.', 'Board update error');
  }
};

export const deleteBoard = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    await boardService.deleteBoard(authenticatedUser, req.params.id);
    return res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '게시글 삭제 중 오류가 발생했습니다.', 'Board delete error');
  }
};

export const getBoardComments = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const comments = await boardService.getBoardComments(authenticatedUser, req.params.id);
    return res.json(comments);
  } catch (error) {
    return handleControllerError(res, error, '댓글 조회 중 오류가 발생했습니다.', 'Board comments fetch error');
  }
};

export const createBoardComment = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    const payload = req.body as CreateBoardCommentDTO;
    await boardService.createBoardComment(authenticatedUser, req.params.id, payload);
    return res.status(201).json({ message: '댓글이 등록되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '댓글 등록 중 오류가 발생했습니다.', 'Board comment create error');
  }
};

export const deleteBoardComment = async (req: Request, res: Response) => {
  try {
    const authenticatedUser = (req as AuthenticatedRequest).user;
    await boardService.deleteBoardComment(authenticatedUser, req.params.id, req.params.commentId);
    return res.json({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    return handleControllerError(res, error, '댓글 삭제 중 오류가 발생했습니다.', 'Board comment delete error');
  }
};
