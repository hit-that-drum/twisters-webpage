import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/features';
import { apiFetch } from '@/common/lib/api/apiClient';
import { EditDeleteButton, GlobalButton } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import BoardDetailModal, { type BoardFormState } from './BoardDetailModal';

interface BoardPostItem {
  id: number;
  authorId: number | null;
  title: string;
  createUser: string;
  createDate: string;
  updateUser: string;
  updateDate: string;
  content: string;
  pinned: boolean;
}

interface BoardCommentItem {
  id: number;
  boardId: number;
  authorId: number | null;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

type BoardSortOption = 'latest' | 'oldest' | 'updated' | 'pinned';

const DEFAULT_VISIBLE_POSTS = 3;

const BOARD_SORT_OPTIONS: Array<{ value: BoardSortOption; label: string }> = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'pinned', label: 'Pinned First' },
];

const BOARD_IMAGE_PRESETS = [
  {
    alt: 'Community board post visual',
    gradient:
      'linear-gradient(135deg, rgba(26,54,93,0.95) 0%, rgba(60,114,178,0.82) 55%, rgba(178,214,242,0.75) 100%)',
    symbol: '🗂',
  },
  {
    alt: 'Discussion and policy visual',
    gradient:
      'linear-gradient(135deg, rgba(26,49,66,0.96) 0%, rgba(74,104,129,0.86) 55%, rgba(191,211,230,0.75) 100%)',
    symbol: '📋',
  },
  {
    alt: 'Project and maintenance visual',
    gradient:
      'linear-gradient(135deg, rgba(59,62,82,0.95) 0%, rgba(109,130,171,0.84) 54%, rgba(236,223,170,0.76) 100%)',
    symbol: '🛠',
  },
];

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

const extractPreviewLines = (content: string, maxLines = 3) => {
  const byLine = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (byLine.length > 0) {
    return byLine.slice(0, maxLines);
  }

  const bySentence = (content.match(/[^.!?]+[.!?]?/g) ?? [])
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (bySentence.length > 0) {
    return bySentence.slice(0, maxLines);
  }

  const trimmed = content.trim();
  return trimmed ? [trimmed] : [];
};

const parseBoardPosts = (payload: unknown): BoardPostItem[] => {
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
        authorId?: unknown;
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

      const normalizedAuthorId =
        typeof row.authorId === 'number' && Number.isInteger(row.authorId) ? row.authorId : null;

      const normalizedUpdateUser =
        typeof row.updateUser === 'string' && row.updateUser.trim().length > 0
          ? row.updateUser
          : row.createUser;

      const normalizedUpdateDate =
        typeof row.updateDate === 'string' && row.updateDate.trim().length > 0
          ? row.updateDate
          : row.createDate;

      const normalizedPinned =
        row.pinned === true || row.pinned === 1 || row.pinned === '1' || row.pinned === 'true';

      return {
        id: row.id,
        authorId: normalizedAuthorId,
        title: row.title,
        createUser: row.createUser,
        createDate: row.createDate,
        updateUser: normalizedUpdateUser,
        updateDate: normalizedUpdateDate,
        content: row.content,
        pinned: normalizedPinned,
      } satisfies BoardPostItem;
    })
    .filter((item): item is BoardPostItem => item !== null);
};

const parseBoardComments = (payload: unknown): BoardCommentItem[] => {
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
        boardId?: unknown;
        authorId?: unknown;
        authorName?: unknown;
        content?: unknown;
        createdAt?: unknown;
        updatedAt?: unknown;
      };

      if (
        typeof row.id !== 'number' ||
        typeof row.boardId !== 'number' ||
        typeof row.authorName !== 'string' ||
        typeof row.content !== 'string' ||
        typeof row.createdAt !== 'string'
      ) {
        return null;
      }

      const normalizedAuthorId =
        typeof row.authorId === 'number' && Number.isInteger(row.authorId) ? row.authorId : null;

      const normalizedUpdatedAt =
        typeof row.updatedAt === 'string' && row.updatedAt.trim().length > 0
          ? row.updatedAt
          : row.createdAt;

      return {
        id: row.id,
        boardId: row.boardId,
        authorId: normalizedAuthorId,
        authorName: row.authorName,
        content: row.content,
        createdAt: row.createdAt,
        updatedAt: normalizedUpdatedAt,
      } satisfies BoardCommentItem;
    })
    .filter((item): item is BoardCommentItem => item !== null);
};

const buildBoardListPath = (search: string, sort: BoardSortOption) => {
  const queryParams = new URLSearchParams();
  if (search.trim()) {
    queryParams.set('search', search.trim());
  }

  if (sort !== 'latest') {
    queryParams.set('sort', sort);
  }

  const queryString = queryParams.toString();
  if (!queryString) {
    return '/board';
  }

  return `/board?${queryString}`;
};

export default function Board() {
  const navigate = useNavigate();
  const { meInfo, logout } = useAuth();

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

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [newPost, setNewPost] = useState<BoardFormState>({
    title: '',
    content: '',
    pinned: false,
  });
  const [editPost, setEditPost] = useState<BoardFormState>({
    title: '',
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
      setExpandedPostIds([]);
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

    setNewPost({ title: '', content: '', pinned: false });
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
      label: isSubmitting ? 'Saving...' : 'Save',
      onClick: () => {
        void handleCreatePost();
      },
      buttonStyle: 'confirm',
      disabled: isSubmitting,
    },
  ];

  const editPostActions: TAction[] = [
    {
      label: isSubmitting ? 'Updating...' : 'Update',
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
      const requestBody: { title: string; content: string; pinned?: boolean } = {
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
      setNewPost({ title: '', content: '', pinned: false });
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
      const requestBody: { title: string; content: string; pinned?: boolean } = {
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

    const shouldDelete = window.confirm('해당 게시글을 삭제하시겠습니까?');
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

    const shouldDelete = window.confirm('해당 댓글을 삭제하시겠습니까?');
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

  return (
    <main className="flex flex-1 flex-col items-center px-3 py-6 sm:px-4 sm:py-8 lg:px-20">
      <div className="layout-content-container flex w-full max-w-[1024px] flex-col gap-5 sm:gap-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-3 sm:gap-4 sm:pb-4 md:flex-row md:items-end">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Board
            </h1>
            <p className="text-sm font-normal text-slate-500 sm:text-base">
              Team discussions, updates, and collaboration notes
            </p>
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
          {isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-7 text-sm font-medium text-slate-500 sm:px-6 sm:py-8">
              게시글을 불러오는 중입니다.
            </div>
          ) : displayedPosts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-7 text-sm font-medium text-slate-500 sm:px-6 sm:py-8">
              등록된 게시글이 없습니다.
            </div>
          ) : (
            displayedPosts.map((post, index) => {
              const previewLines = extractPreviewLines(post.content, 3);
              const imagePreset = BOARD_IMAGE_PRESETS[index % BOARD_IMAGE_PRESETS.length];
              const isExpanded = expandedPostIds.includes(post.id);
              const canEditOrDelete = canMutatePost(post);
              const comments = commentsByPost[post.id] ?? [];
              const isLoadingComments = loadingCommentsPostIds.includes(post.id);
              const commentDraft = commentDraftByPost[post.id] ?? '';

              return (
                <article key={post.id} className="group">
                  <div
                    className={`flex flex-col items-stretch justify-start overflow-hidden rounded-xl bg-white transition-all xl:flex-row ${
                      post.pinned
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
                      <div className="flex h-full w-full items-end bg-black/5 p-3 sm:p-4">
                        <span className="text-3xl drop-shadow-sm sm:text-4xl" aria-hidden="true">
                          {imagePreset.symbol}
                        </span>
                      </div>

                      {post.pinned && (
                        <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
                          <span className="flex items-center gap-1 rounded bg-amber-300 px-2 py-1 text-[10px] font-black uppercase text-slate-900 shadow-sm">
                            <span aria-hidden="true" className="text-[11px]">
                              📌
                            </span>
                            Pinned
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 md:p-6">
                      <div className="flex flex-col gap-2.5 sm:gap-3">
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <h3 className="text-lg font-bold leading-tight text-slate-900 transition-colors group-hover:text-blue-700 sm:text-xl">
                            {post.title}
                          </h3>

                          {canEditOrDelete && (
                            <EditDeleteButton
                              onEditClick={() => handleOpenEditDialog(post)}
                              onDeleteClick={() => {
                                void handleDeletePost(post);
                              }}
                              isDeleting={deletingPostId === post.id}
                            />
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
                          <span aria-hidden="true">👤</span>
                          <span>Posted by {post.createUser}</span>
                          <span className="mx-1" aria-hidden="true">
                            •
                          </span>
                          <span aria-hidden="true">⏱</span>
                          <span>{formatRelativeTime(post.createDate)}</span>
                        </div>

                        <ul className="space-y-2 text-sm text-slate-600">
                          {(previewLines.length > 0 ? previewLines : ['내용이 없습니다.']).map(
                            (line, lineIndex) => (
                              <li
                                key={`${post.id}-line-${lineIndex}`}
                                className="flex items-start gap-2"
                              >
                                <span className="mt-1 text-amber-500" aria-hidden="true">
                                  •
                                </span>
                                <span>{line}</span>
                              </li>
                            ),
                          )}
                        </ul>

                        <button
                          type="button"
                          onClick={() => togglePostExpand(post.id)}
                          className="w-fit text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
                          aria-expanded={isExpanded}
                          aria-controls={`board-post-content-${post.id}`}
                        >
                          {isExpanded ? 'Hide full post' : 'Read full post'}
                        </button>

                        {isExpanded && (
                          <div id={`board-post-content-${post.id}`} className="space-y-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                              <p className="whitespace-pre-wrap">{post.content}</p>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-800">Comments</p>
                                <span className="text-xs font-medium text-slate-500">
                                  {comments.length}
                                </span>
                              </div>

                              {isLoadingComments ? (
                                <p className="text-sm text-slate-500">댓글을 불러오는 중입니다.</p>
                              ) : comments.length === 0 ? (
                                <p className="text-sm text-slate-500">첫 댓글을 남겨보세요.</p>
                              ) : (
                                <ul className="mb-3 space-y-2">
                                  {comments.map((comment) => {
                                    const canDelete = canDeleteComment(comment);
                                    const commentDeleteKey = `${post.id}:${comment.id}`;

                                    return (
                                      <li
                                        key={comment.id}
                                        className="rounded-md border border-slate-200 bg-slate-50 p-2.5"
                                      >
                                        <div className="mb-1 flex items-start justify-between gap-2">
                                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                            <span className="font-semibold text-slate-700">
                                              {comment.authorName}
                                            </span>
                                            <span aria-hidden="true">•</span>
                                            <span>{formatRelativeTime(comment.createdAt)}</span>
                                          </div>

                                          {canDelete && (
                                            <EditDeleteButton
                                              isExisteEditButton={false}
                                              onDeleteClick={() =>
                                                void handleDeleteComment(post.id, comment)
                                              }
                                              isDeleting={deletingCommentKey === commentDeleteKey}
                                              isDeleteDisabled={
                                                deletingCommentKey === commentDeleteKey
                                              }
                                            />
                                          )}
                                        </div>

                                        <p className="whitespace-pre-wrap text-sm text-slate-700">
                                          {comment.content}
                                        </p>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}

                              {meInfo ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={commentDraft}
                                    onChange={(event) =>
                                      handleCommentDraftChange(post.id, event.target.value)
                                    }
                                    rows={3}
                                    placeholder="댓글을 입력하세요"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500"
                                  />
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => void handleCreateComment(post.id)}
                                      disabled={submittingCommentPostId === post.id}
                                      className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
                                    >
                                      {submittingCommentPostId === post.id
                                        ? 'Saving...'
                                        : 'Add Comment'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-500">
                                  댓글을 작성하려면 로그인하세요.
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <p className="text-xs font-medium text-slate-400">
                          Updated: {post.updateUser} · {formatDateTime(post.updateDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
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
        title="ADD POST"
        actions={addPostActions}
        form={newPost}
        isSubmitting={isSubmitting}
        canPinPost={canPinPost}
        onFormChange={handleChangeNewPost}
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
        title="EDIT POST"
        actions={editPostActions}
        form={editPost}
        isSubmitting={isSubmitting}
        canPinPost={canPinPost}
        onFormChange={handleChangeEditPost}
        onPinnedChange={(checked) => {
          setEditPost((previous) => ({
            ...previous,
            pinned: checked,
          }));
        }}
      />
    </main>
  );
}
