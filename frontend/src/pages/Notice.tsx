import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '../utils/api';
import { clearAccessToken, getAccessToken } from '../utils/authStorage';

interface NoticeItem {
  id: number;
  title: string;
  createUser: string;
  createDate: string;
  updateUser: string;
  updateDate: string;
  content: string;
  pinned: boolean;
}

interface MeInfo {
  id: number;
  name: string;
  email: string;
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

export default function Notice() {
  const navigate = useNavigate();
  const [noticeList, setNoticeList] = useState<NoticeItem[]>([]);
  const [meInfo, setMeInfo] = useState<MeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    pinned: false,
  });
  const [editNotice, setEditNotice] = useState({
    title: '',
    content: '',
    pinned: false,
  });

  const loadMeInfo = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setMeInfo(null);
      return;
    }

    try {
      const response = await apiFetch('/authentication/me');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        setMeInfo(null);
        return;
      }

      if (payload && typeof payload === 'object') {
        const id = (payload as { id?: unknown }).id;
        const name = (payload as { name?: unknown }).name;
        const email = (payload as { email?: unknown }).email;

        if (typeof id === 'number' && typeof name === 'string' && typeof email === 'string') {
          setMeInfo({ id, name, email });
          return;
        }
      }

      setMeInfo(null);
    } catch (error) {
      console.error('Failed to load me info:', error);
      setMeInfo(null);
    }
  }, []);

  const loadNotices = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch('/notice');
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        enqueueSnackbar(`공지사항 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
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
              pinned?: unknown;
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

            const normalizedPinned =
              row.pinned === true ||
              row.pinned === 1 ||
              row.pinned === '1' ||
              row.pinned === 'true';

            return {
              id: row.id,
              title: row.title,
              createUser: row.createUser,
              createDate: row.createDate,
              updateUser: row.updateUser,
              updateDate: row.updateDate,
              content: row.content,
              pinned: normalizedPinned,
            } satisfies NoticeItem;
          })
          .filter((item): item is NoticeItem => item !== null);

        setNoticeList(normalizedList);
        return;
      }

      setNoticeList([]);
    } catch (error) {
      console.error('Notice list fetch error:', error);
      enqueueSnackbar('공지사항을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeInfo();
    void loadNotices();
  }, [loadMeInfo, loadNotices]);

  const requireAuthForMutation = () => {
    if (meInfo) {
      return true;
    }

    enqueueSnackbar('공지사항 작성/수정/삭제는 로그인 후 가능합니다.', { variant: 'error' });
    navigate('/signin', { replace: true });
    return false;
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

  const handleOpenEditDialog = (notice: NoticeItem) => {
    if (!requireAuthForMutation()) {
      return;
    }

    setEditingNoticeId(notice.id);
    setEditNotice({
      title: notice.title,
      content: notice.content,
      pinned: notice.pinned,
    });
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    if (isSubmitting) {
      return;
    }

    setOpenEditDialog(false);
  };

  const handleChangeNewNotice = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setNewNotice((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleChangeEditNotice = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setEditNotice((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateNotice = async () => {
    if (!requireAuthForMutation()) {
      return;
    }

    const title = newNotice.title.trim();
    const content = newNotice.content.trim();

    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/notice', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          pinned: newNotice.pinned,
        }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          clearAccessToken();
          setMeInfo(null);
          enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar(`공지사항 등록 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '공지사항이 등록되었습니다.'), { variant: 'success' });
      setOpenAddDialog(false);
      setNewNotice({ title: '', content: '', pinned: false });
      await loadNotices();
    } catch (error) {
      console.error('Notice create error:', error);
      enqueueSnackbar('공지사항 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNotice = async () => {
    if (!requireAuthForMutation()) {
      return;
    }

    if (!editingNoticeId) {
      enqueueSnackbar('수정할 공지사항을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    const title = editNotice.title.trim();
    const content = editNotice.content.trim();

    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(`/notice/${editingNoticeId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          content,
          pinned: editNotice.pinned,
        }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          clearAccessToken();
          setMeInfo(null);
          enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar(`공지사항 수정 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '공지사항이 수정되었습니다.'), { variant: 'success' });
      setOpenEditDialog(false);
      setEditingNoticeId(null);
      await loadNotices();
    } catch (error) {
      console.error('Notice update error:', error);
      enqueueSnackbar('공지사항 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotice = async (noticeId: number) => {
    if (!requireAuthForMutation()) {
      return;
    }

    const shouldDelete = window.confirm('해당 공지사항을 삭제하시겠습니까?');
    if (!shouldDelete) {
      return;
    }

    setDeletingNoticeId(noticeId);

    try {
      const response = await apiFetch(`/notice/${noticeId}`, {
        method: 'DELETE',
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          clearAccessToken();
          setMeInfo(null);
          enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
          navigate('/signin', { replace: true });
          return;
        }

        enqueueSnackbar(`공지사항 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '공지사항이 삭제되었습니다.'), { variant: 'success' });
      await loadNotices();
    } catch (error) {
      console.error('Notice delete error:', error);
      enqueueSnackbar('공지사항 삭제 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setDeletingNoticeId(null);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Notice
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {meInfo ? `Logged in as ${meInfo.name}` : '로그인 후 공지사항을 작성/수정/삭제할 수 있습니다.'}
          </Typography>
        </Box>
        <Button variant="contained" onClick={handleOpenAddDialog}>
          ADD NOTICE
        </Button>
      </Box>

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          공지사항을 불러오는 중입니다.
        </Typography>
      ) : noticeList.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          등록된 공지사항이 없습니다.
        </Typography>
      ) : (
        noticeList.map((notice) => (
          <Accordion defaultExpanded key={notice.id}>
            <AccordionSummary expandIcon={<span aria-hidden="true">▼</span>}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography fontWeight={700}>
                  {notice.pinned ? '[PINNED] ' : ''}
                  {notice.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {notice.createUser}
                </Typography>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1.5 }}>{notice.content}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Created: {new Date(notice.createDate).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Updated: {notice.updateUser} / {new Date(notice.updateDate).toLocaleString()}
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small" onClick={() => handleOpenEditDialog(notice)}>
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  disabled={deletingNoticeId === notice.id}
                  onClick={() => handleDeleteNotice(notice.id)}
                >
                  {deletingNoticeId === notice.id ? 'Deleting...' : 'Delete'}
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add Notice</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Title"
            name="title"
            fullWidth
            value={newNotice.title}
            onChange={handleChangeNewNotice}
          />
          <TextField
            margin="dense"
            label="Content"
            name="content"
            fullWidth
            multiline
            minRows={5}
            value={newNotice.content}
            onChange={handleChangeNewNotice}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={newNotice.pinned}
                onChange={(event) =>
                  setNewNotice((previous) => ({
                    ...previous,
                    pinned: event.target.checked,
                  }))
                }
              />
            }
            label="Pinned"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreateNotice} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Edit Notice</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Title"
            name="title"
            fullWidth
            value={editNotice.title}
            onChange={handleChangeEditNotice}
          />
          <TextField
            margin="dense"
            label="Content"
            name="content"
            fullWidth
            multiline
            minRows={5}
            value={editNotice.content}
            onChange={handleChangeEditNotice}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editNotice.pinned}
                onChange={(event) =>
                  setEditNotice((previous) => ({
                    ...previous,
                    pinned: event.target.checked,
                  }))
                }
              />
            }
            label="Pinned"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleUpdateNotice} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
