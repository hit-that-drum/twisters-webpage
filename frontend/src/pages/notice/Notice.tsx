import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/features';
import { apiFetch } from '@/common/lib/api/apiClient';
import {
  formatDateTime,
  formatRelativeTime,
  getApiMessage,
  parseApiResponse,
} from '@/common/lib/api/apiHelpers';
import { EditDeleteButton, GlobalButton, useConfirmDialog } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import NoticeDetailModal, { type NoticeFormState } from './NoticeDetailModal';
import { AiTwotonePushpin } from 'react-icons/ai';
import { IoPersonCircleSharp } from 'react-icons/io5';
import { FaClock } from 'react-icons/fa';
import LoadingComponent from '@/common/LoadingComponent';
import {
  DEFAULT_VISIBLE_NOTICES,
  NOTICE_IMAGE_PRESETS,
  type NoticeItem,
} from '@/pages/notice/lib/noticeTypes';
import { parseNoticeList } from '@/pages/notice/lib/noticeParsers';

export default function Notice() {
  const navigate = useNavigate();
  const { meInfo, logout } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
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
    imageUrl: '',
    content: '',
    pinned: false,
  });
  const [editNotice, setEditNotice] = useState<NoticeFormState>({
    title: '',
    imageUrl: '',
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

    setNewNotice({ title: '', imageUrl: '', content: '', pinned: false });
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
      imageUrl: notice.imageUrl ?? '',
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
          imageUrl: newNotice.imageUrl.trim() || null,
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
      setNewNotice({ title: '', imageUrl: '', content: '', pinned: false });
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
          imageUrl: editNotice.imageUrl.trim() || null,
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

    const shouldDelete = await confirm({
      title: '공지사항 삭제',
      description: '해당 공지사항을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      confirmButtonStyle: 'error',
    });
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

  if (isLoading) {
    return <LoadingComponent />;
  }

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
          {displayedNotices.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-sm font-medium text-slate-500">
              등록된 공지사항이 없습니다.
            </div>
          ) : (
            displayedNotices.map((notice, index) => {
              const imagePreset = NOTICE_IMAGE_PRESETS[index % NOTICE_IMAGE_PRESETS.length];
              const imageStyle = notice.imageUrl
                ? {
                    backgroundImage: `linear-gradient(140deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.36) 100%), url(${notice.imageUrl})`,
                  }
                : {
                    background: imagePreset.gradient,
                  };

              return (
                <article key={notice.id} className="group">
                  <div
                    className={`flex flex-col items-stretch justify-start overflow-hidden rounded-xl bg-white transition-all xl:flex-row ${
                      notice.pinned
                        ? 'border-2 border-amber-300 shadow-md hover:shadow-lg'
                        : 'border border-slate-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-center border-r border-gray-300">
                      <div
                        role="img"
                        aria-label={imagePreset.alt}
                        className="relative w-full min-h-[282px] overflow-hidden bg-center bg-cover bg-no-repeat xl:w-[282px] xl:min-w-[282px] xl:flex-shrink-0 xl:self-center"
                        style={imageStyle}
                      >
                        {notice.pinned && (
                          <div className="absolute left-4 top-4">
                            <span className="flex items-center gap-1 rounded bg-amber-300 px-1 py-1 text-[10px] font-black uppercase text-slate-900 shadow-sm">
                              <AiTwotonePushpin size="20px" color="white" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-xl font-bold leading-tight text-slate-900 transition-colors">
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

                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 min-h-[122px]">
                          <p className="whitespace-pre-wrap">{notice.content}</p>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-4">
                        Updated by {notice.updateUser} · {formatDateTime(notice.updateDate)}
                      </p>
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
        title="공지사항 등록"
        actions={addNoticeActions}
        form={newNotice}
        isSubmitting={isSubmitting}
        onFormChange={handleChangeNewNotice}
        onImageUrlsChange={(value) => {
          setNewNotice((previous) => ({
            ...previous,
            imageUrl: value[0] ?? '',
          }));
        }}
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
        title="공지사항 수정"
        actions={editNoticeActions}
        form={editNotice}
        isSubmitting={isSubmitting}
        onFormChange={handleChangeEditNotice}
        onImageUrlsChange={(value) => {
          setEditNotice((previous) => ({
            ...previous,
            imageUrl: value[0] ?? '',
          }));
        }}
        onPinnedChange={(checked) => {
          setEditNotice((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />

      {confirmDialog}
    </main>
  );
}
