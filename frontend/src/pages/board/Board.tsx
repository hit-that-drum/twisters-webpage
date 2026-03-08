import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { useAuth } from '@/features';

interface BoardItem {
  id: number;
  title: string;
  createUser: string;
  createDate: string;
  updateUser: string;
  updateDate: string;
  content: string;
}

const parseApiResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text || null;
};

const getApiMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object') {
    const errorMessage = (payload as { error?: unknown }).error;
    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage;
    }

    const successMessage = (payload as { message?: unknown }).message;
    if (typeof successMessage === 'string' && successMessage.trim()) {
      return successMessage;
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return fallback;
};

export default function Board() {
  const navigate = useNavigate();
  const { meInfo, logout } = useAuth();
  const [boardList, setBoardList] = useState<BoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<number | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [newBoard, setNewBoard] = useState({
    title: '',
    content: '',
  });
  const [editBoard, setEditBoard] = useState({
    title: '',
    content: '',
  });

  const loadBoards = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch('/board');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        enqueueSnackbar(`게시글 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      if (Array.isArray(payload)) {
        const normalizedList = payload
          .map((item) => {
            if (!item || typeof item !== 'object') {
              return null;
            }

            const row = item as {
              id?: unknown;
              title?: unknown;
              createUser?: unknown;
              createDate?: unknown;
              updateUser?: unknown;
              updateDate?: unknown;
              content?: unknown;
            };
            if (
              typeof row.id !== 'number' ||
              typeof row.title !== 'string' ||
              typeof row.createUser !== 'string' ||
              typeof row.createDate !== 'string' ||
              typeof row.updateUser !== 'string' ||
              typeof row.updateDate !== 'string' ||
              typeof row.content !== 'string'
            ) {
              return null;
            }

            return {
              id: row.id,
              title: row.title,
              createUser: row.createUser,
              createDate: row.createDate,
              updateUser: row.updateUser,
              updateDate: row.updateDate,
              content: row.content,
            } satisfies BoardItem;
          })
          .filter((item): item is BoardItem => item !== null);

        setBoardList(normalizedList);
        return;
      }

      setBoardList([]);
    } catch (error) {
      console.error('Board list fetch error:', error);
      enqueueSnackbar('게시글을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  const canManageBoards = meInfo?.isAdmin === true;

  const requireAuthForMutation = () => {
    if (!meInfo) {
      enqueueSnackbar('게시글 작성/수정/삭제는 로그인 후 가능합니다.', { variant: 'error' });
      navigate('/signin', { replace: true });
      return false;
    }

    if (!meInfo.isAdmin) {
      enqueueSnackbar('관리자만 게시글을 작성/수정/삭제할 수 있습니다.', { variant: 'error' });
      return false;
    }

    return true;
  };

  const handleOpenAddDialog = () => {
    if (!requireAuthForMutation()) {
      return;
    }

    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    if (isSubmitting) {
      return;
    }

    setOpenAddDialog(false);
  };

  const handleOpenEditDialog = (board: BoardItem) => {
    if (!requireAuthForMutation()) {
      return;
    }

    setEditingBoardId(board.id);
    setEditBoard({
      title: board.title,
      content: board.content,
    });
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    if (isSubmitting) {
      return;
    }

    setOpenEditDialog(false);
  };

  const handleChangeNewBoard = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setNewBoard((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleChangeEditBoard = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setEditBoard((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateBoard = async () => {
    if (!requireAuthForMutation()) {
      return;
    }

    const title = newBoard.title.trim();
    const content = newBoard.content.trim();

    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/board', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar(`게시글 등록 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '게시글이 등록되었습니다.'), { variant: 'success' });
      setOpenAddDialog(false);
      setNewBoard({ title: '', content: '' });
      await loadBoards();
    } catch (error) {
      console.error('Board create error:', error);
      enqueueSnackbar('게시글 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBoard = async () => {
    if (!requireAuthForMutation()) {
      return;
    }

    if (!editingBoardId) {
      enqueueSnackbar('수정할 게시글을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    const title = editBoard.title.trim();
    const content = editBoard.content.trim();

    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/board/${editingBoardId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar(`게시글 수정 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '게시글이 수정되었습니다.'), { variant: 'success' });
      setOpenEditDialog(false);
      setEditingBoardId(null);
      await loadBoards();
    } catch (error) {
      console.error('Board update error:', error);
      enqueueSnackbar('게시글 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBoard = async (boardId: number) => {
    if (!requireAuthForMutation()) {
      return;
    }

    const shouldDelete = window.confirm('해당 게시글을 삭제하시겠습니까?');
    if (!shouldDelete) {
      return;
    }

    setDeletingBoardId(boardId);

    try {
      const response = await apiFetch(`/board/${boardId}`, {
        method: 'DELETE',
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar(`게시글 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '게시글이 삭제되었습니다.'), { variant: 'success' });
      await loadBoards();
    } catch (error) {
      console.error('Board delete error:', error);
      enqueueSnackbar('게시글 삭제 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setDeletingBoardId(null);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Board
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {meInfo
              ? `Logged in as ${meInfo.name}${meInfo.isAdmin ? ' (Admin)' : ''}`
              : '로그인 후 게시글을 작성/수정/삭제할 수 있습니다.'}
          </Typography>
        </Box>
        {canManageBoards && (
          <Button variant="contained" onClick={handleOpenAddDialog}>
            ADD POST
          </Button>
        )}
      </Box>

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          게시글을 불러오는 중입니다.
        </Typography>
      ) : boardList.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          등록된 게시글이 없습니다.
        </Typography>
      ) : (
        boardList.map((board) => (
          <Accordion defaultExpanded key={board.id}>
            <AccordionSummary expandIcon={<span aria-hidden="true">▼</span>}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography fontWeight={700}>{board.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {board.createUser}
                </Typography>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1.5 }}>{board.content}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Created: {new Date(board.createDate).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Updated: {board.updateUser} / {new Date(board.updateDate).toLocaleString()}
              </Typography>

              {canManageBoards && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" onClick={() => handleOpenEditDialog(board)}>
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    disabled={deletingBoardId === board.id}
                    onClick={() => handleDeleteBoard(board.id)}
                  >
                    {deletingBoardId === board.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add Post</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Title"
            name="title"
            fullWidth
            value={newBoard.title}
            onChange={handleChangeNewBoard}
          />
          <TextField
            margin="dense"
            label="Content"
            name="content"
            fullWidth
            multiline
            minRows={5}
            value={newBoard.content}
            onChange={handleChangeNewBoard}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreateBoard} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Edit Post</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Title"
            name="title"
            fullWidth
            value={editBoard.title}
            onChange={handleChangeEditBoard}
          />
          <TextField
            margin="dense"
            label="Content"
            name="content"
            fullWidth
            multiline
            minRows={5}
            value={editBoard.content}
            onChange={handleChangeEditBoard}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleUpdateBoard} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
