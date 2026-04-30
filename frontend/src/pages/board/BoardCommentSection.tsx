import { EditDeleteButton } from '@/common/components';
import { formatRelativeTime } from '@/common/lib/api/apiHelpers';
import { handleBulletListKeyDown } from '@/common/lib/textareaBulletList';
import type { BoardCommentItem } from '@/pages/board/lib/boardTypes';

interface BoardCommentSectionProps {
  postId: number;
  comments: BoardCommentItem[];
  isLoadingComments: boolean;
  commentDraft: string;
  isSubmittingComment: boolean;
  deletingCommentKey: string | null;
  isLoggedIn: boolean;
  canDeleteComment: (comment: BoardCommentItem) => boolean;
  onCommentDraftChange: (postId: number, value: string) => void;
  onCreateComment: (postId: number) => void;
  onDeleteComment: (postId: number, comment: BoardCommentItem) => void;
}

export default function BoardCommentSection({
  postId,
  comments,
  isLoadingComments,
  commentDraft,
  isSubmittingComment,
  deletingCommentKey,
  isLoggedIn,
  canDeleteComment,
  onCommentDraftChange,
  onCreateComment,
  onDeleteComment,
}: BoardCommentSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">Comments</p>
        <span className="text-xs font-medium text-slate-500">{comments.length}</span>
      </div>

      {isLoadingComments ? (
        <p className="text-sm text-slate-500">댓글을 불러오는 중입니다.</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500 pb-2">첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {comments.map((comment) => {
            const canDelete = canDeleteComment(comment);
            const commentDeleteKey = `${postId}:${comment.id}`;

            return (
              <li
                key={comment.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-2.5"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{comment.authorName}</span>
                    <span aria-hidden="true">•</span>
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                  </div>

                  {canDelete && (
                    <EditDeleteButton
                      isExisteEditButton={false}
                      onDeleteClick={() => onDeleteComment(postId, comment)}
                      isDeleting={deletingCommentKey === commentDeleteKey}
                      isDeleteDisabled={deletingCommentKey === commentDeleteKey}
                    />
                  )}
                </div>

                <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.content}</p>
              </li>
            );
          })}
        </ul>
      )}

      {isLoggedIn ? (
        <div className="space-y-2">
          <textarea
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(postId, event.target.value)}
            onKeyDown={handleBulletListKeyDown}
            rows={3}
            placeholder="댓글을 입력하세요"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onCreateComment(postId)}
              disabled={isSubmittingComment}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
            >
              {isSubmittingComment ? 'Saving...' : 'Add Comment'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">댓글을 작성하려면 로그인하세요.</p>
      )}
    </div>
  );
}
