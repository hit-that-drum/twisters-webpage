import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/features';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import { GlobalButton, useConfirmDialog } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import BoardDetailModal, { type BoardFormState } from './BoardDetailModal';
import BoardImageModal from './BoardImageModal';
import BoardPostCard from './BoardPostCard';
import LoadingComponent from '@/common/LoadingComponent';
import type {
  BoardCommentItem,
  BoardPostItem,
  BoardSortOption,
} from '@/pages/board/lib/boardTypes';
import {
  BOARD_IMAGE_PRESETS,
  BOARD_SORT_OPTIONS,
  DEFAULT_VISIBLE_POSTS,
} from '@/pages/board/lib/boardConstants';
import {
  buildBoardListPath,
  parseBoardComments,
  parseBoardPosts,
} from '@/pages/board/lib/boardParsers';

export default function Board() {
  const navigate = useNavigate();
  const { meInfo, logout } = useAuth();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [boardPosts, setBoardPosts] = useState<BoardPostItem[]>([]);
  const [visiblePostCount, setVisiblePostCount] = useState(DEFAULT_VISIBLE_POSTS);
  const [expandedPostIds, setExpandedPostIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortOption, setSortOption] = useState<BoardSortOption>('latest');

  const [commentsByPost, setCommentsByPost] = useState<Record<number, BoardCommentItem[]>>({});
  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<number, string>>({});
  const [loadingCommentsPostIds, setLoadingCommentsPostIds] = useState<number[]>([]);
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState<number | null>(null);
  const [deletingCommentKey, setDeletingCommentKey] = useState<string | null>(null);
  const [currentImageIndexByPost, setCurrentImageIndexByPost] = useState<Record<number, number>>(
    {},
  );
  const [imageModalPostId, setImageModalPostId] = useState<number | null>(null);

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [newPost, setNewPost] = useState<BoardFormState>({
    title: '',
    imageUrl: [],
    content: '',
    pinned: false,
  });
  const [editPost, setEditPost] = useState<BoardFormState>({
    title: '',
    imageUrl: [],
    content: '',
    pinned: false,
  });

  const canPinPost = meInfo?.isAdmin === true;
  const canCreatePost = Boolean(meInfo);

  const displayedPosts = useMemo(
    () => boardPosts.slice(0, visiblePostCount),
    [boardPosts, visiblePostCount],
  );
  const hasMorePosts = boardPosts.length > visiblePostCount;

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

  const handleExpiredSession = useCallback(() => {
    logout();
    enqueueSnackbar('로그인이 만료되었습니다. 다시 로그인해주세요.', { variant: 'error' });
    navigate('/signin', { replace: true });
  }, [logout, navigate]);

  const loadBoardPosts = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch(buildBoardListPath(appliedSearch, sortOption));
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
          return;
        }

        enqueueSnackbar(`게시글 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      const normalizedPosts = parseBoardPosts(payload);
      setBoardPosts(normalizedPosts);
      setVisiblePostCount(DEFAULT_VISIBLE_POSTS);
      setExpandedPostIds(normalizedPosts.filter((post) => post.pinned).map((post) => post.id));
      setCurrentImageIndexByPost({});
      setImageModalPostId(null);
      setCommentsByPost({});
      setCommentDraftByPost({});
      setLoadingCommentsPostIds([]);
      setSubmittingCommentPostId(null);
      setDeletingCommentKey(null);
    } catch (error) {
      console.error('Board posts fetch error:', error);
      enqueueSnackbar('게시글을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch, handleExpiredSession, sortOption]);

  useEffect(() => {
    void loadBoardPosts();
  }, [loadBoardPosts]);

  const loadBoardComments = useCallback(
    async (postId: number) => {
      setLoadingCommentsPostIds((previous) => {
        if (previous.includes(postId)) {
          return previous;
        }

        return [...previous, postId];
      });

      try {
        const response = await apiFetch(`/board/${postId}/comments`);
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredSession();
            return;
          }

          enqueueSnackbar(`댓글 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        const normalizedComments = parseBoardComments(payload);
        setCommentsByPost((previous) => ({
          ...previous,
          [postId]: normalizedComments,
        }));
      } catch (error) {
        console.error('Board comments fetch error:', error);
        enqueueSnackbar('댓글을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setLoadingCommentsPostIds((previous) => previous.filter((id) => id !== postId));
      }
    },
    [handleExpiredSession],
  );

  const requireAuthenticatedAction = () => {
    if (!meInfo) {
      enqueueSnackbar('로그인 후 게시글을 등록/수정/삭제할 수 있습니다.', { variant: 'error' });
      navigate('/signin', { replace: true });
      return false;
    }

    return true;
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setSortOption('latest');
  };

  const handleOpenAddDialog = () => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    setNewPost({ title: '', imageUrl: [], content: '', pinned: false });
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

  const handleOpenEditDialog = (post: BoardPostItem) => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    if (!canMutatePost(post)) {
      enqueueSnackbar('작성자 또는 관리자만 게시글을 수정할 수 있습니다.', { variant: 'error' });
      return;
    }

    setEditingPostId(post.id);
    setEditPost({
      title: post.title,
      imageUrl: post.imageUrl,
      content: post.content,
      pinned: post.pinned,
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
    setEditingPostId(null);
  };

  const handleOpenImageModal = (postId: number) => {
    setImageModalPostId(postId);
  };

  const handleCloseImageModal = (event: object, reason: ModalCloseReason) => {
    void event;
    void reason;
    setImageModalPostId(null);
  };

  const handleChangeNewPost = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setNewPost((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleChangeEditPost = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setEditPost((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const addPostActions: TAction[] = [
    {
      label: '저장',
      onClick: () => {
        void handleCreatePost();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting,
    },
  ];

  const editPostActions: TAction[] = [
    {
      label: '수정',
      onClick: () => {
        void handleUpdatePost();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting,
    },
  ];

  const handleCreatePost = async () => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    const title = newPost.title.trim();
    const content = newPost.content.trim();
    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody: { title: string; imageUrl: string[]; content: string; pinned?: boolean } =
        {
          imageUrl: newPost.imageUrl,
          title,
          content,
        };

      if (canPinPost) {
        requestBody.pinned = newPost.pinned;
      }

      const response = await apiFetch('/board', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
          return;
        }

        enqueueSnackbar(`게시글 등록 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '게시글이 등록되었습니다.'), { variant: 'success' });
      setOpenAddDialog(false);
      setNewPost({ title: '', imageUrl: [], content: '', pinned: false });
      await loadBoardPosts();
    } catch (error) {
      console.error('Board post create error:', error);
      enqueueSnackbar('게시글 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePost = async () => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    if (editingPostId === null) {
      enqueueSnackbar('수정할 게시글을 찾을 수 없습니다.', { variant: 'error' });
      return;
    }

    const title = editPost.title.trim();
    const content = editPost.content.trim();
    if (!title || !content) {
      enqueueSnackbar('제목과 내용을 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody: { title: string; imageUrl: string[]; content: string; pinned?: boolean } =
        {
          imageUrl: editPost.imageUrl,
          title,
          content,
        };

      if (canPinPost) {
        requestBody.pinned = editPost.pinned;
      }

      const response = await apiFetch(`/board/${editingPostId}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
          return;
        }

        enqueueSnackbar(`게시글 수정 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '게시글이 수정되었습니다.'), { variant: 'success' });
      setOpenEditDialog(false);
      setEditingPostId(null);
      await loadBoardPosts();
    } catch (error) {
      console.error('Board post update error:', error);
      enqueueSnackbar('게시글 수정 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (post: BoardPostItem) => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    if (!canMutatePost(post)) {
      enqueueSnackbar('작성자 또는 관리자만 게시글을 삭제할 수 있습니다.', { variant: 'error' });
      return;
    }

    const shouldDelete = await confirm({
      title: '게시글 삭제',
      description: '해당 게시글을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      confirmButtonStyle: 'error',
    });
    if (!shouldDelete) {
      return;
    }

    setDeletingPostId(post.id);

    try {
      const response = await apiFetch(`/board/${post.id}`, {
        method: 'DELETE',
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
          return;
        }

        enqueueSnackbar(`게시글 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '게시글이 삭제되었습니다.'), { variant: 'success' });
      await loadBoardPosts();
    } catch (error) {
      console.error('Board post delete error:', error);
      enqueueSnackbar('게시글 삭제 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleCommentDraftChange = (postId: number, value: string) => {
    setCommentDraftByPost((previous) => ({
      ...previous,
      [postId]: value,
    }));
  };

  const handleCreateComment = async (postId: number) => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    const rawDraft = commentDraftByPost[postId] ?? '';
    const content = rawDraft.trim();
    if (!content) {
      enqueueSnackbar('댓글 내용을 입력해주세요.', { variant: 'error' });
      return;
    }

    setSubmittingCommentPostId(postId);

    try {
      const response = await apiFetch(`/board/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
          return;
        }

        enqueueSnackbar(`댓글 등록 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '댓글이 등록되었습니다.'), { variant: 'success' });
      setCommentDraftByPost((previous) => ({
        ...previous,
        [postId]: '',
      }));
      await loadBoardComments(postId);
    } catch (error) {
      console.error('Board comment create error:', error);
      enqueueSnackbar('댓글 등록 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setSubmittingCommentPostId(null);
    }
  };

  const handleDeleteComment = async (postId: number, comment: BoardCommentItem) => {
    if (!requireAuthenticatedAction()) {
      return;
    }

    if (!canDeleteComment(comment)) {
      enqueueSnackbar('댓글 작성자 또는 관리자만 댓글을 삭제할 수 있습니다.', { variant: 'error' });
      return;
    }

    const shouldDelete = await confirm({
      title: '댓글 삭제',
      description: '해당 댓글을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      confirmButtonStyle: 'error',
    });
    if (!shouldDelete) {
      return;
    }

    const commentKey = `${postId}:${comment.id}`;
    setDeletingCommentKey(commentKey);

    try {
      const response = await apiFetch(`/board/${postId}/comments/${comment.id}`, {
        method: 'DELETE',
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
          return;
        }

        enqueueSnackbar(`댓글 삭제 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '댓글이 삭제되었습니다.'), { variant: 'success' });
      await loadBoardComments(postId);
    } catch (error) {
      console.error('Board comment delete error:', error);
      enqueueSnackbar('댓글 삭제 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setDeletingCommentKey(null);
    }
  };

  const handleLoadMorePosts = () => {
    setVisiblePostCount((previous) => previous + DEFAULT_VISIBLE_POSTS);
  };

  const handleMovePostImage = (postId: number, totalImages: number, direction: 'next' | 'prev') => {
    if (totalImages <= 1) {
      return;
    }

    setCurrentImageIndexByPost((previous) => {
      const currentIndex = previous[postId] ?? 0;
      const nextIndex =
        direction === 'next'
          ? (currentIndex + 1) % totalImages
          : (currentIndex - 1 + totalImages) % totalImages;

      return {
        ...previous,
        [postId]: nextIndex,
      };
    });
  };

  const handleSelectPostImage = (postId: number, imageIndex: number) => {
    setCurrentImageIndexByPost((previous) => ({
      ...previous,
      [postId]: imageIndex,
    }));
  };

  const imageModalPost = useMemo(
    () => boardPosts.find((post) => post.id === imageModalPostId) ?? null,
    [boardPosts, imageModalPostId],
  );
  const imageModalCurrentIndex = imageModalPost
    ? (currentImageIndexByPost[imageModalPost.id] ?? 0) %
      Math.max(imageModalPost.imageUrl.length, 1)
    : 0;

  useEffect(() => {
    displayedPosts.forEach((post) => {
      if (post.pinned && commentsByPost[post.id] === undefined) {
        void loadBoardComments(post.id);
      }
    });
  }, [commentsByPost, displayedPosts, loadBoardComments]);

  const togglePostExpand = (postId: number) => {
    setExpandedPostIds((previous) => {
      const isExpanded = previous.includes(postId);
      if (isExpanded) {
        return previous.filter((id) => id !== postId);
      }

      if (commentsByPost[postId] === undefined) {
        void loadBoardComments(postId);
      }

      return [...previous, postId];
    });
  };

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
              onClick={handleOpenAddDialog}
              label="Add Post"
              iconBasicMappingType="ADD"
            />
          )}
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto]"
        >
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search title/content/author"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500"
          />

          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as BoardSortOption)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-blue-500"
          >
            {BOARD_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="flex h-10 items-center justify-center rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Reset
          </button>
        </form>

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
                isExpanded={post.pinned || expandedPostIds.includes(post.id)}
                canEditOrDelete={canMutatePost(post)}
                deletingPostId={deletingPostId}
                currentImageIndex={currentImageIndexByPost[post.id] ?? 0}
                comments={commentsByPost[post.id] ?? []}
                isLoadingComments={loadingCommentsPostIds.includes(post.id)}
                commentDraft={commentDraftByPost[post.id] ?? ''}
                isSubmittingComment={submittingCommentPostId === post.id}
                deletingCommentKey={deletingCommentKey}
                isLoggedIn={Boolean(meInfo)}
                canDeleteComment={canDeleteComment}
                onOpenImageModal={handleOpenImageModal}
                onMovePostImage={handleMovePostImage}
                onSelectPostImage={handleSelectPostImage}
                onTogglePostExpand={togglePostExpand}
                onOpenEditDialog={handleOpenEditDialog}
                onDeletePost={(targetPost) => {
                  void handleDeletePost(targetPost);
                }}
                onCommentDraftChange={handleCommentDraftChange}
                onCreateComment={(targetPostId) => {
                  void handleCreateComment(targetPostId);
                }}
                onDeleteComment={(targetPostId, comment) => {
                  void handleDeleteComment(targetPostId, comment);
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
              className="flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-6 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 sm:h-11 sm:px-8"
            >
              <span>Load More Posts</span>
              <span aria-hidden="true">⌄</span>
            </button>
          </div>
        )}
      </div>

      <BoardDetailModal
        type="ADD"
        open={openAddDialog}
        handleClose={handleCloseAddDialog}
        title="게시물 등록"
        actions={addPostActions}
        form={newPost}
        isSubmitting={isSubmitting}
        canPinPost={canPinPost}
        onFormChange={handleChangeNewPost}
        onImageUrlsChange={(value) => {
          setNewPost((previous) => ({
            ...previous,
            imageUrl: value,
          }));
        }}
        onPinnedChange={(checked) => {
          setNewPost((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />

      <BoardDetailModal
        type="EDIT"
        open={openEditDialog}
        handleClose={handleCloseEditDialog}
        title="게시물 수정"
        actions={editPostActions}
        form={editPost}
        isSubmitting={isSubmitting}
        canPinPost={canPinPost}
        onFormChange={handleChangeEditPost}
        onImageUrlsChange={(value) => {
          setEditPost((previous) => ({
            ...previous,
            imageUrl: value,
          }));
        }}
        onPinnedChange={(checked) => {
          setEditPost((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />

      <BoardImageModal
        open={imageModalPost !== null}
        handleClose={handleCloseImageModal}
        title={imageModalPost?.title ?? 'BOARD IMAGE'}
        images={imageModalPost?.imageUrl ?? []}
        currentIndex={imageModalCurrentIndex}
        onPrevious={() => {
          if (!imageModalPost) {
            return;
          }

          handleMovePostImage(imageModalPost.id, imageModalPost.imageUrl.length, 'prev');
        }}
        onNext={() => {
          if (!imageModalPost) {
            return;
          }

          handleMovePostImage(imageModalPost.id, imageModalPost.imageUrl.length, 'next');
        }}
        onSelectImage={(index) => {
          if (!imageModalPost) {
            return;
          }

          handleSelectPostImage(imageModalPost.id, index);
        }}
      />

      {confirmDialog}
    </main>
  );
}
