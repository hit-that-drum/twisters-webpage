import { useAuth } from '@/features';
import { GlobalButton, useConfirmDialog } from '@/common/components';
import type { TAction } from '@/common/components/GlobalModal';
import useExpiredSession from '@/common/hooks/useExpiredSession';
import LoadingComponent from '@/common/LoadingComponent';
import NoticeDetailModal from '@/pages/notice/NoticeDetailModal';
import NoticeCard from '@/pages/notice/components/NoticeCard';
import useNoticeList from '@/pages/notice/hooks/useNoticeList';
import useNoticeMutations from '@/pages/notice/hooks/useNoticeMutations';
import { NOTICE_IMAGE_PRESETS } from '@/pages/notice/lib/noticeTypes';

export default function Notice() {
  const { meInfo } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();
  const handleExpiredSession = useExpiredSession();

  const canManageNotices = meInfo?.isAdmin === true;

  const {
    displayedNotices,
    hasMoreNotices,
    isLoading,
    loadNotices,
    handleLoadMoreNotices,
  } = useNoticeList();

  const mutations = useNoticeMutations({
    meInfo,
    confirm,
    loadNotices,
    onExpiredSession: handleExpiredSession,
  });

  const addNoticeActions: TAction[] = [
    {
      label: '저장',
      onClick: () => {
        void mutations.handleCreateNotice();
      },
      buttonStyle: 'confirm',
      disabled: mutations.isSubmitting,
    },
  ];

  const editNoticeActions: TAction[] = [
    {
      label: '수정',
      onClick: () => {
        void mutations.handleUpdateNotice();
      },
      buttonStyle: 'confirm',
      disabled: mutations.isSubmitting,
    },
  ];

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
              onClick={mutations.handleOpenAddDialog}
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
            displayedNotices.map((notice, index) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                imagePreset={NOTICE_IMAGE_PRESETS[index % NOTICE_IMAGE_PRESETS.length]!}
                canManageNotices={canManageNotices}
                deletingNoticeId={mutations.deletingNoticeId}
                onOpenEditDialog={mutations.handleOpenEditDialog}
                onDeleteNotice={(noticeId) => {
                  void mutations.handleDeleteNotice(noticeId);
                }}
              />
            ))
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
        open={mutations.openAddDialog}
        handleClose={mutations.handleCloseAddDialog}
        title="공지사항 등록"
        actions={addNoticeActions}
        form={mutations.newNotice}
        isSubmitting={mutations.isSubmitting}
        onFormChange={mutations.handleChangeNewNotice}
        onImageUrlsChange={(value) => {
          mutations.setNewNotice((previous) => ({
            ...previous,
            imageUrl: value[0] ?? '',
          }));
        }}
        onPinnedChange={(checked) => {
          mutations.setNewNotice((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />

      <NoticeDetailModal
        type="EDIT"
        open={mutations.openEditDialog}
        handleClose={mutations.handleCloseEditDialog}
        title="공지사항 수정"
        actions={editNoticeActions}
        form={mutations.editNotice}
        isSubmitting={mutations.isSubmitting}
        onFormChange={mutations.handleChangeEditNotice}
        onImageUrlsChange={(value) => {
          mutations.setEditNotice((previous) => ({
            ...previous,
            imageUrl: value[0] ?? '',
          }));
        }}
        onPinnedChange={(checked) => {
          mutations.setEditNotice((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />

      {confirmDialog}
    </main>
  );
}
