import { AiTwotonePushpin } from 'react-icons/ai';
import { IoPersonCircleSharp } from 'react-icons/io5';
import { FaClock } from 'react-icons/fa';
import { IoIosArrowBack, IoIosArrowDown, IoIosArrowForward, IoIosArrowUp } from 'react-icons/io';
import { EditDeleteButton } from '@/common/components';
import { formatDateTime, formatRelativeTime } from '@/common/lib/api/apiHelpers';
import { COLLAPSED_POST_CONTENT_STYLE } from '@/pages/board/lib/boardConstants';
import BoardCommentSection from '@/pages/board/BoardCommentSection';
import type { BoardCommentItem, BoardPostItem } from '@/pages/board/lib/boardTypes';

interface BoardImagePreset {
  alt: string;
  gradient: string;
}

interface BoardPostCardProps {
  post: BoardPostItem;
  imagePreset: BoardImagePreset;
  isExpanded: boolean;
  canEditOrDelete: boolean;
  deletingPostId: number | null;
  currentImageIndex: number;
  comments: BoardCommentItem[];
  isLoadingComments: boolean;
  commentDraft: string;
  isSubmittingComment: boolean;
  deletingCommentKey: string | null;
  isLoggedIn: boolean;
  canDeleteComment: (comment: BoardCommentItem) => boolean;
  onOpenImageModal: (postId: number) => void;
  onMovePostImage: (postId: number, imageCount: number, direction: 'prev' | 'next') => void;
  onSelectPostImage: (postId: number, imageIndex: number) => void;
  onTogglePostExpand: (postId: number) => void;
  onOpenEditDialog: (post: BoardPostItem) => void;
  onDeletePost: (post: BoardPostItem) => void;
  onCommentDraftChange: (postId: number, value: string) => void;
  onCreateComment: (postId: number) => void;
  onDeleteComment: (postId: number, comment: BoardCommentItem) => void;
}

export default function BoardPostCard({
  post,
  imagePreset,
  isExpanded,
  canEditOrDelete,
  deletingPostId,
  currentImageIndex,
  comments,
  isLoadingComments,
  commentDraft,
  isSubmittingComment,
  deletingCommentKey,
  isLoggedIn,
  canDeleteComment,
  onOpenImageModal,
  onMovePostImage,
  onSelectPostImage,
  onTogglePostExpand,
  onOpenEditDialog,
  onDeletePost,
  onCommentDraftChange,
  onCreateComment,
  onDeleteComment,
}: BoardPostCardProps) {
  const postContent = post.content.trim() || '내용이 없습니다.';
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
    <article className="group">
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

              onOpenImageModal(post.id);
            }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || post.imageUrl.length === 0) {
                return;
              }

              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenImageModal(post.id);
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
                    onMovePostImage(post.id, post.imageUrl.length, 'prev');
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
                    onMovePostImage(post.id, post.imageUrl.length, 'next');
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
                  onClick={() => onSelectPostImage(post.id, imageIndex)}
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
                    onEditClick={() => onOpenEditDialog(post)}
                    onDeleteClick={() => {
                      void onDeletePost(post);
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
                    onClick={() => onTogglePostExpand(post.id)}
                    className="absolute right-3 top-3 inline-flex size-8 items-center justify-center transition-colors hover:cursor-pointer"
                    aria-expanded={isExpanded}
                    aria-controls={`board-post-content-${post.id}`}
                    aria-label={isExpanded ? 'Collapse post content' : 'Expand post content'}
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
                <BoardCommentSection
                  postId={post.id}
                  comments={comments}
                  isLoadingComments={isLoadingComments}
                  commentDraft={commentDraft}
                  isSubmittingComment={isSubmittingComment}
                  deletingCommentKey={deletingCommentKey}
                  isLoggedIn={isLoggedIn}
                  canDeleteComment={canDeleteComment}
                  onCommentDraftChange={onCommentDraftChange}
                  onCreateComment={onCreateComment}
                  onDeleteComment={onDeleteComment}
                />
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
}
