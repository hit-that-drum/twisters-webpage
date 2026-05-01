import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { GlobalButton, useConfirmDialog } from '@/common/components';
import type { TAction } from '@/common/components/GlobalModal';
import useExpiredSession from '@/common/hooks/useExpiredSession';
import LoadingComponent from '@/common/LoadingComponent';
import { useAuth } from '@/features';
import BoardDetailModal from '@/pages/board/BoardDetailModal';
import BoardImageModal from '@/pages/board/BoardImageModal';
import BoardPostCard from '@/pages/board/BoardPostCard';
import BoardToolbar from '@/pages/board/components/BoardToolbar';
import useBoardComments from '@/pages/board/hooks/useBoardComments';
import useBoardImageModal from '@/pages/board/hooks/useBoardImageModal';
import useBoardPostMutations from '@/pages/board/hooks/useBoardPostMutations';
import useBoardPosts from '@/pages/board/hooks/useBoardPosts';
import useBoardReactions from '@/pages/board/hooks/useBoardReactions';
import { BOARD_IMAGE_PRESETS } from '@/pages/board/lib/boardConstants';
import type { BoardCommentItem, BoardPostItem } from '@/pages/board/lib/boardTypes';

export default function Board() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { meInfo } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();

  const canPinPost = meInfo?.isAdmin === true;
  const canCreatePost = Boolean(meInfo);

  const handleExpiredSession = useExpiredSession();

  const targetPostId = useMemo(() => {
    const rawPostId = searchParams.get('postId');
    const parsedPostId = Number(rawPostId);

    if (!Number.isInteger(parsedPostId) || parsedPostId <= 0) {
      return null;
    }

    return parsedPostId;
  }, [searchParams]);

  const requireAuthenticatedAction = useCallback(() => {
    if (!meInfo) {
      enqueueSnackbar('로그인 후 게시판 기능을 이용할 수 있습니다.', { variant: 'error' });
      navigate('/signin', { replace: true });
      return false;
    }

    return true;
  }, [meInfo, navigate]);

  const canMutatePost = useCallback(
    (post: BoardPostItem) => {
      if (!meInfo) {
        return false;
      }

      if (meInfo.isAdmin === true) {
        return true;
      }

      return post.authorId !== null && post.authorId === meInfo.id;
    },
    [meInfo],
  );

  const canDeleteComment = useCallback(
    (comment: BoardCommentItem) => {
      if (!meInfo) {
        return false;
      }

      if (meInfo.isAdmin === true) {
        return true;
      }

      return comment.authorId !== null && comment.authorId === meInfo.id;
    },
    [meInfo],
  );

  const {
    boardPosts,
    displayedPosts,
    hasMorePosts,
    isLoading,
    isFetchingNextPage,
    searchInput,
    sortOption,
    setSearchInput,
    setSortOption,
    ensurePostVisible,
    loadBoardPosts,
    handleSearchSubmit,
    handleResetFilters,
    handleLoadMorePosts,
  } = useBoardPosts({ onExpiredSession: handleExpiredSession });

  const imageModal = useBoardImageModal({ boardPosts });

  const comments = useBoardComments({
    boardPosts,
    displayedPosts,
    canDeleteComment,
    requireAuthenticatedAction,
    confirm,
    onExpiredSession: handleExpiredSession,
  });
  const expandPost = comments.expandPost;

  const reactions = useBoardReactions({
    boardPosts,
    requireAuthenticatedAction,
    onExpiredSession: handleExpiredSession,
  });

  const mutations = useBoardPostMutations({
    canPinPost,
    canMutatePost,
    requireAuthenticatedAction,
    confirm,
    loadBoardPosts,
    onExpiredSession: handleExpiredSession,
  });

  useEffect(() => {
    if (!targetPostId || isLoading) {
      return;
    }

    let isCancelled = false;
    void (async () => {
      const isVisible = await ensurePostVisible(targetPostId);
      if (!isCancelled && isVisible) {
        expandPost(targetPostId);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [boardPosts, ensurePostVisible, expandPost, isLoading, targetPostId]);

  useEffect(() => {
    if (!targetPostId || !displayedPosts.some((post) => post.id === targetPostId)) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`board-post-${targetPostId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);

    return () => window.clearTimeout(scrollTimer);
  }, [displayedPosts, targetPostId]);

  const addPostActions: TAction[] = [
    {
      label: '저장',
      onClick: () => {
        void mutations.handleCreatePost();
      },
      buttonStyle: 'confirm',
      disabled: mutations.isSubmitting,
    },
  ];

  const editPostActions: TAction[] = [
    {
      label: '수정',
      onClick: () => {
        void mutations.handleUpdatePost();
      },
      buttonStyle: 'confirm',
      disabled: mutations.isSubmitting,
    },
  ];

  const imageModalImages = imageModal.imageModalPost
    ? imageModal.imageModalPost.imageRefs.length > 0
      ? imageModal.imageModalPost.imageRefs
      : imageModal.imageModalPost.imageUrl
    : [];

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <main className="flex flex-1 flex-col items-center px-3 py-6 sm:px-4 sm:py-8 lg:px-20">
      <div className="layout-content-container flex w-full flex-col gap-5 sm:gap-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-3 sm:gap-4 sm:pb-4 md:flex-row md:items-end">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">
              BOARD
            </h1>
          </div>

          {canCreatePost && (
            <GlobalButton
              onClick={mutations.handleOpenAddDialog}
              label="Add Post"
              iconBasicMappingType="ADD"
            />
          )}
        </div>

        <BoardToolbar
          searchInput={searchInput}
          sortOption={sortOption}
          onSearchInputChange={setSearchInput}
          onSortOptionChange={setSortOption}
          onSearchSubmit={handleSearchSubmit}
          onResetFilters={handleResetFilters}
        />

        <div className="flex flex-col gap-3 sm:gap-4">
          {displayedPosts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-7 text-sm font-medium text-slate-500 sm:px-6 sm:py-8">
              등록된 게시글이 없습니다.
            </div>
          ) : (
            displayedPosts.map((post, index) => (
              <BoardPostCard
                key={post.id}
                post={post}
                imagePreset={BOARD_IMAGE_PRESETS[index % BOARD_IMAGE_PRESETS.length]!}
                isExpanded={post.pinned || comments.expandedPostIds.includes(post.id)}
                canEditOrDelete={canMutatePost(post)}
                deletingPostId={mutations.deletingPostId}
                currentImageIndex={imageModal.currentImageIndexByPost[post.id] ?? 0}
                comments={comments.commentsByPost[post.id] ?? []}
                isLoadingComments={comments.loadingCommentsPostIds.includes(post.id)}
                commentDraft={comments.commentDraftByPost[post.id] ?? ''}
                isSubmittingComment={comments.submittingCommentPostId === post.id}
                deletingCommentKey={comments.deletingCommentKey}
                reactions={reactions.reactionSummaryByPost[post.id] ?? post.reactions}
                isSubmittingReaction={reactions.submittingReactionPostId === post.id}
                isLoggedIn={Boolean(meInfo)}
                canDeleteComment={canDeleteComment}
                onOpenImageModal={imageModal.handleOpenImageModal}
                onMovePostImage={imageModal.handleMovePostImage}
                onSelectPostImage={imageModal.handleSelectPostImage}
                onTogglePostExpand={comments.togglePostExpand}
                onOpenEditDialog={mutations.handleOpenEditDialog}
                onDeletePost={(targetPost) => {
                  void mutations.handleDeletePost(targetPost);
                }}
                onToggleReaction={(targetPostId, reactionType) => {
                  void reactions.handleToggleReaction(targetPostId, reactionType);
                }}
                onCommentDraftChange={comments.handleCommentDraftChange}
                onCreateComment={(targetPostId) => {
                  void comments.handleCreateComment(targetPostId);
                }}
                onDeleteComment={(targetPostId, comment) => {
                  void comments.handleDeleteComment(targetPostId, comment);
                }}
              />
            ))
          )}
        </div>

        {hasMorePosts && !isLoading && (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={handleLoadMorePosts}
              disabled={isFetchingNextPage}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-6 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:h-11 sm:px-8"
            >
              <span>{isFetchingNextPage ? 'Loading Posts...' : 'Load More Posts'}</span>
              <span aria-hidden="true">{isFetchingNextPage ? '...' : '⌄'}</span>
            </button>
          </div>
        )}
      </div>

      <BoardDetailModal
        type="ADD"
        open={mutations.openAddDialog}
        handleClose={mutations.handleCloseAddDialog}
        title="게시물 등록"
        actions={addPostActions}
        form={mutations.newPost}
        isSubmitting={mutations.isSubmitting}
        canPinPost={canPinPost}
        onFormChange={mutations.handleChangeNewPost}
        onImageUrlsChange={(value) => {
          mutations.setNewPost((previous) => ({
            ...previous,
            imageUrl: value,
          }));
        }}
        onPinnedChange={(checked) => {
          mutations.setNewPost((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />

      <BoardDetailModal
        type="EDIT"
        open={mutations.openEditDialog}
        handleClose={mutations.handleCloseEditDialog}
        title="게시물 수정"
        actions={editPostActions}
        form={mutations.editPost}
        isSubmitting={mutations.isSubmitting}
        canPinPost={canPinPost}
        onFormChange={mutations.handleChangeEditPost}
        onImageUrlsChange={(value) => {
          mutations.setEditPost((previous) => ({
            ...previous,
            imageUrl: value,
          }));
        }}
        onPinnedChange={(checked) => {
          mutations.setEditPost((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />

      <BoardImageModal
        open={imageModal.imageModalPost !== null}
        handleClose={imageModal.handleCloseImageModal}
        title={imageModal.imageModalPost?.title ?? 'BOARD IMAGE'}
        images={imageModalImages}
        currentIndex={imageModal.imageModalCurrentIndex}
        onPrevious={() => {
          const modalPost = imageModal.imageModalPost;
          if (!modalPost) {
            return;
          }

          imageModal.handleMovePostImage(modalPost.id, imageModalImages.length, 'prev');
        }}
        onNext={() => {
          const modalPost = imageModal.imageModalPost;
          if (!modalPost) {
            return;
          }

          imageModal.handleMovePostImage(modalPost.id, imageModalImages.length, 'next');
        }}
        onSelectImage={(index) => {
          const modalPost = imageModal.imageModalPost;
          if (!modalPost) {
            return;
          }

          imageModal.handleSelectPostImage(modalPost.id, index);
        }}
      />

      {confirmDialog}
    </main>
  );
}
