import {
  type CSSProperties,
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
import { EditDeleteButton, GlobalButton } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import BoardDetailModal, { type BoardFormState } from './BoardDetailModal';
import BoardImageModal from './BoardImageModal';
import { AiTwotonePushpin } from 'react-icons/ai';
import { IoPersonCircleSharp } from 'react-icons/io5';
import { FaClock } from 'react-icons/fa';
import { IoIosArrowBack, IoIosArrowDown, IoIosArrowForward, IoIosArrowUp } from 'react-icons/io';
import LoadingComponent from '@/common/LoadingComponent';

interface BoardPostItem {
  id: number;
  authorId: number | null;
  title: string;
  createUser: string;
  createDate: string;
  updateUser: string;
  updateDate: string;
  imageUrl: string[];
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

const DEFAULT_VISIBLE_POSTS = 5;

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
  },
  {
    alt: 'Discussion and policy visual',
    gradient:
      'linear-gradient(135deg, rgba(26,49,66,0.96) 0%, rgba(74,104,129,0.86) 55%, rgba(191,211,230,0.75) 100%)',
  },
  {
    alt: 'Project and maintenance visual',
    gradient:
      'linear-gradient(135deg, rgba(59,62,82,0.95) 0%, rgba(109,130,171,0.84) 54%, rgba(236,223,170,0.76) 100%)',
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

const COLLAPSED_POST_CONTENT_STYLE: CSSProperties = {
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 5,
};

const normalizeImageUrlList = (rawValue: unknown): string[] => {
  if (Array.isArray(rawValue)) {
    return rawValue
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof rawValue === 'string' && rawValue.trim()) {
    return [rawValue.trim()];
  }

  return [];
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
        imageUrl?: unknown;
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

      const normalizedImageUrl = normalizeImageUrlList(row.imageUrl);

      return {
        id: row.id,
        authorId: normalizedAuthorId,
        title: row.title,
        createUser: row.createUser,
        createDate: row.createDate,
        updateUser: normalizedUpdateUser,
        updateDate: normalizedUpdateDate,
        imageUrl: normalizedImageUrl,
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
            displayedPosts.map((post, index) => {
              const imagePreset = BOARD_IMAGE_PRESETS[index % BOARD_IMAGE_PRESETS.length];
              const isExpanded = post.pinned || expandedPostIds.includes(post.id);
              const postContent = post.content.trim() || '내용이 없습니다.';
              const canEditOrDelete = canMutatePost(post);
              const comments = commentsByPost[post.id] ?? [];
              const isLoadingComments = loadingCommentsPostIds.includes(post.id);
              const commentDraft = commentDraftByPost[post.id] ?? '';
              const currentImageIndex = currentImageIndexByPost[post.id] ?? 0;
              const safeImageIndex =
                post.imageUrl.length > 0 ? currentImageIndex % post.imageUrl.length : 0;
              const activeImageUrl = post.imageUrl[safeImageIndex] ?? null;
              const imageStyle = activeImageUrl
                ? {
                    backgroundImage: `linear-gradient(140deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.36) 100%), url(${activeImageUrl})`,
                  }
                : {
                    background: imagePreset.gradient,
                  };

              return (
                <article key={post.id} className="group">
                  <div
                    className={`flex flex-col items-stretch justify-start overflow-hidden rounded-xl bg-white transition-all xl:flex-row ${
                      post.pinned
                        ? 'border-2 border-amber-300 shadow-md hover:shadow-lg'
                        : 'border border-slate-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col border-r border-gray-300 bg-white xl:w-[282px] xl:min-w-[282px] xl:flex-shrink-0">
                      <div
                        role={post.imageUrl.length > 0 ? 'button' : 'img'}
                        aria-label={imagePreset.alt}
                        aria-haspopup={post.imageUrl.length > 0 ? 'dialog' : undefined}
                        tabIndex={post.imageUrl.length > 0 ? 0 : undefined}
                        onClick={(event) => {
                          if (post.imageUrl.length === 0) {
                            return;
                          }

                          if (event.target instanceof Element && event.target.closest('button')) {
                            return;
                          }

                          handleOpenImageModal(post.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget || post.imageUrl.length === 0) {
                            return;
                          }

                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleOpenImageModal(post.id);
                          }
                        }}
                        className={`relative min-h-[282px] overflow-hidden bg-center bg-cover bg-no-repeat ${
                          post.imageUrl.length > 0
                            ? 'cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
                            : ''
                        }`}
                        style={imageStyle}
                      >
                        {post.pinned && (
                          <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
                            <span className="flex items-center gap-1 rounded bg-amber-300 px-2 py-1 text-[10px] font-black uppercase text-slate-900 shadow-sm">
                              <AiTwotonePushpin size="20px" color="white" />
                            </span>
                          </div>
                        )}

                        {post.imageUrl.length > 0 && (
                          <div className="pointer-events-none absolute right-3 top-3 sm:right-4 sm:top-4">
                            <div className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-sm">
                              {`${safeImageIndex + 1}/${post.imageUrl.length}`}
                            </div>
                          </div>
                        )}

                        {post.imageUrl.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleMovePostImage(post.id, post.imageUrl.length, 'prev');
                              }}
                              className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-lg font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
                              aria-label="Previous image"
                            >
                              <IoIosArrowBack />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleMovePostImage(post.id, post.imageUrl.length, 'next');
                              }}
                              className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-lg font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
                              aria-label="Next image"
                            >
                              <IoIosArrowForward />
                            </button>
                          </>
                        )}
                      </div>

                      {isExpanded && (
                        <div
                          className="grid grid-cols-4 gap-2 border-t border-slate-200 p-3"
                          aria-label={`${post.title} image thumbnails`}
                        >
                          {post.imageUrl.map((imageUrl, imageIndex) => (
                            <button
                              key={`${post.id}-thumb-${imageIndex}`}
                              type="button"
                              onClick={() => handleSelectPostImage(post.id, imageIndex)}
                              className={`overflow-hidden rounded-lg border-2 transition ${
                                safeImageIndex === imageIndex
                                  ? 'border-blue-500 shadow-sm shadow-blue-200/70'
                                  : 'border-transparent opacity-70 hover:opacity-100'
                              }`}
                              aria-label={`Select image ${imageIndex + 1} for ${post.title}`}
                              aria-pressed={safeImageIndex === imageIndex}
                            >
                              <img
                                src={imageUrl}
                                alt={`${post.title} thumbnail ${imageIndex + 1}`}
                                className="aspect-square w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-end p-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-xl font-bold leading-tight text-slate-900 transition-colors">
                            {post.title}
                          </h3>

                          <div className="flex gap-5">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
                              <span aria-hidden="true">
                                <IoPersonCircleSharp size="20px" />
                              </span>
                              <span>Posted by {post.createUser}</span>
                              <span className="mx-1" aria-hidden="true">
                                •
                              </span>
                              <span aria-hidden="true">
                                <FaClock size="16px" />
                              </span>
                              <span>{formatRelativeTime(post.createDate)}</span>
                            </div>
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
                        </div>

                        <div id={`board-post-content-${post.id}`} className="space-y-3">
                          <div className="relative min-h-[142px] rounded-lg border border-slate-200 bg-slate-50 p-3 pr-14 text-sm text-slate-700">
                            {!post.pinned && (
                              <button
                                type="button"
                                onClick={() => togglePostExpand(post.id)}
                                className="absolute right-3 top-3 inline-flex size-8 items-center justify-center transition-colors hover:cursor-pointer"
                                aria-expanded={isExpanded}
                                aria-controls={`board-post-content-${post.id}`}
                                aria-label={
                                  isExpanded ? 'Collapse post content' : 'Expand post content'
                                }
                              >
                                {isExpanded ? (
                                  <IoIosArrowUp size="22px" />
                                ) : (
                                  <IoIosArrowDown size="22px" />
                                )}
                              </button>
                            )}

                            <p
                              className="whitespace-pre-wrap break-words leading-relaxed"
                              style={isExpanded ? undefined : COLLAPSED_POST_CONTENT_STYLE}
                            >
                              {postContent}
                            </p>
                          </div>

                          {isExpanded && (
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
                                <p className="text-sm text-slate-500 pb-2">첫 댓글을 남겨보세요.</p>
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
                          )}
                        </div>

                        <p className="text-xs font-medium text-slate-400 mt-4">
                          Updated by {post.updateUser} · {formatDateTime(post.updateDate)}
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
    </main>
  );
}
