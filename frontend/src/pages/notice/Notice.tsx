import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/features';
import { apiFetch } from '@/common/lib/api/apiClient';
import { EditDeleteButton, GlobalButton } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import NoticeDetailModal, { type NoticeFormState } from './NoticeDetailModal';
import { AiTwotonePushpin } from 'react-icons/ai';
import { IoPersonCircleSharp } from 'react-icons/io5';
import { FaClock } from 'react-icons/fa';

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

const DEFAULT_VISIBLE_NOTICES = 5;

const NOTICE_IMAGE_PRESETS = [
  {
    alt: 'Community meeting visual',
    gradient:
      'linear-gradient(135deg, rgba(26,54,93,0.95) 0%, rgba(60,114,178,0.82) 55%, rgba(178,214,242,0.75) 100%)',
  },
  {
    alt: 'Parking zone visual',
    gradient:
      'linear-gradient(135deg, rgba(26,49,66,0.96) 0%, rgba(74,104,129,0.86) 55%, rgba(191,211,230,0.75) 100%)',
  },
  {
    alt: 'Maintenance and tools visual',
    gradient:
      'linear-gradient(135deg, rgba(59,62,82,0.95) 0%, rgba(109,130,171,0.84) 54%, rgba(236,223,170,0.76) 100%)',
  },
];

const formatRelativeTime = (rawDate: string) => {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'unknown';
  }

  const elapsedMs = Date.now() - parsedDate.getTime();
  if (elapsedMs < 60_000) {
    return 'just now';
  }

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return parsedDate.toLocaleDateString();
};

const formatDateTime = (rawDate: string) => {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return parsedDate.toLocaleString();
};

const parseNoticeList = (payload: unknown): NoticeItem[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
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
        typeof row.content !== 'string'
      ) {
        return null;
      }

      const normalizedPinned =
        row.pinned === true || row.pinned === 1 || row.pinned === '1' || row.pinned === 'true';

      const normalizedUpdateUser =
        typeof row.updateUser === 'string' && row.updateUser.trim().length > 0
          ? row.updateUser
          : row.createUser;

      const normalizedUpdateDate =
        typeof row.updateDate === 'string' && row.updateDate.trim().length > 0
          ? row.updateDate
          : row.createDate;

      return {
        id: row.id,
        title: row.title,
        createUser: row.createUser,
        createDate: row.createDate,
        updateUser: normalizedUpdateUser,
        updateDate: normalizedUpdateDate,
        content: row.content,
        pinned: normalizedPinned,
      } satisfies NoticeItem;
    })
    .filter((item): item is NoticeItem => item !== null);
};

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
  const { meInfo, logout } = useAuth();
  const [noticeList, setNoticeList] = useState<NoticeItem[]>([]);
  const [visibleNoticeCount, setVisibleNoticeCount] = useState(DEFAULT_VISIBLE_NOTICES);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [newNotice, setNewNotice] = useState<NoticeFormState>({
    title: '',
    content: '',
    pinned: false,
  });
  const [editNotice, setEditNotice] = useState<NoticeFormState>({
    title: '',
    content: '',
    pinned: false,
  });

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

      const normalizedList = parseNoticeList(payload);
      setNoticeList(normalizedList);
      setVisibleNoticeCount(DEFAULT_VISIBLE_NOTICES);
    } catch (error) {
      console.error('Notice list fetch error:', error);
      enqueueSnackbar('공지사항을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const canManageNotices = meInfo?.isAdmin === true;
  const displayedNotices = useMemo(
    () => noticeList.slice(0, visibleNoticeCount),
    [noticeList, visibleNoticeCount],
  );
  const hasMoreNotices = noticeList.length > visibleNoticeCount;

  const requireAuthForMutation = () => {
    if (!meInfo) {
      enqueueSnackbar('공지사항 작성/수정/삭제는 로그인 후 가능합니다.', { variant: 'error' });
      navigate('/signin', { replace: true });
      return false;
    }

    if (!meInfo.isAdmin) {
      enqueueSnackbar('관리자만 공지사항을 작성/수정/삭제할 수 있습니다.', { variant: 'error' });
      return false;
    }

    return true;
  };

  const handleOpenAddDialog = () => {
    if (!requireAuthForMutation()) {
      return;
    }

    setNewNotice({ title: '', content: '', pinned: false });
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = (event: object, reason: ModalCloseReason) => {
    void event;
    void reason;

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

  const handleCloseEditDialog = (event: object, reason: ModalCloseReason) => {
    void event;
    void reason;

    if (isSubmitting) {
      return;
    }

    setOpenEditDialog(false);
    setEditingNoticeId(null);
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

  const addNoticeActions: TAction[] = [
    {
      label: '저장',
      onClick: () => {
        void handleCreateNotice();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting,
    },
  ];

  const editNoticeActions: TAction[] = [
    {
      label: '수정',
      onClick: () => {
        void handleUpdateNotice();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting,
    },
  ];

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
          logout();
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

    if (editingNoticeId === null) {
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
          logout();
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
          logout();
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

  const handleLoadMoreNotices = () => {
    setVisibleNoticeCount((previous) => previous + DEFAULT_VISIBLE_NOTICES);
  };

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 lg:px-20">
      <div className="layout-content-container flex w-full flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-end">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900">
              NOTICE
            </h1>
          </div>

          {canManageNotices && (
            <GlobalButton
              onClick={handleOpenAddDialog}
              label="Add Notice"
              iconBasicMappingType="ADD"
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-sm font-medium text-slate-500">
              공지사항을 불러오는 중입니다.
            </div>
          ) : displayedNotices.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-sm font-medium text-slate-500">
              등록된 공지사항이 없습니다.
            </div>
          ) : (
            displayedNotices.map((notice, index) => {
              const imagePreset = NOTICE_IMAGE_PRESETS[index % NOTICE_IMAGE_PRESETS.length];

              return (
                <article key={notice.id} className="group">
                  <div
                    className={`flex flex-col items-stretch justify-start overflow-hidden rounded-xl bg-white transition-all xl:flex-row ${
                      notice.pinned
                        ? 'border-2 border-amber-300 shadow-md hover:shadow-lg'
                        : 'border border-slate-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div
                      role="img"
                      aria-label={imagePreset.alt}
                      className="relative aspect-video w-full overflow-hidden bg-center bg-no-repeat xl:w-72 xl:flex-shrink-0"
                      style={{ background: imagePreset.gradient }}
                    >
                      {notice.pinned && (
                        <div className="absolute left-4 top-4">
                          <span className="flex items-center gap-1 rounded bg-amber-300 px-1 py-1 text-[10px] font-black uppercase text-slate-900 shadow-sm">
                            <AiTwotonePushpin size="20px" color="white" />
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-blue-700">
                            {notice.title}
                          </h3>

                          {canManageNotices && (
                            <EditDeleteButton
                              onEditClick={() => handleOpenEditDialog(notice)}
                              onDeleteClick={() => {
                                void handleDeleteNotice(notice.id);
                              }}
                              isDeleting={deletingNoticeId === notice.id}
                            />
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
                          <span aria-hidden="true">
                            <IoPersonCircleSharp size="20px" />
                          </span>
                          <span>Posted by {notice.createUser}</span>
                          <span className="mx-1">•</span>
                          <span aria-hidden="true">
                            <FaClock size="16px" />
                          </span>
                          <span>{formatRelativeTime(notice.createDate)}</span>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          <p className="whitespace-pre-wrap">{notice.content}</p>
                        </div>

                        <p className="text-xs font-medium text-slate-400">
                          Updated: {notice.updateUser} · {formatDateTime(notice.updateDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {hasMoreNotices && !isLoading && (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={handleLoadMoreNotices}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-8 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
            >
              <span>Load More Notices</span>
              <span aria-hidden="true">⌄</span>
            </button>
          </div>
        )}
      </div>

      <NoticeDetailModal
        type="ADD"
        open={openAddDialog}
        handleClose={handleCloseAddDialog}
        title="ADD NOTICE"
        actions={addNoticeActions}
        form={newNotice}
        isSubmitting={isSubmitting}
        onFormChange={handleChangeNewNotice}
        onPinnedChange={(checked) => {
          setNewNotice((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />

      <NoticeDetailModal
        type="EDIT"
        open={openEditDialog}
        handleClose={handleCloseEditDialog}
        title="EDIT NOTICE"
        actions={editNoticeActions}
        form={editNotice}
        isSubmitting={isSubmitting}
        onFormChange={handleChangeEditNotice}
        onPinnedChange={(checked) => {
          setEditNotice((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />
    </main>
  );
}
