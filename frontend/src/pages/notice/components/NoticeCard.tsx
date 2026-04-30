import { memo } from 'react';
import { AiTwotonePushpin } from 'react-icons/ai';
import { IoPersonCircleSharp } from 'react-icons/io5';
import { FaClock } from 'react-icons/fa';
import { EditDeleteButton } from '@/common/components';
import { formatDateTime, formatRelativeTime } from '@/common/lib/api/apiHelpers';
import type { NoticeImagePreset, NoticeItem } from '@/pages/notice/lib/noticeTypes';

interface NoticeCardProps {
  notice: NoticeItem;
  imagePreset: NoticeImagePreset;
  canManageNotices: boolean;
  deletingNoticeId: number | null;
  onOpenEditDialog: (notice: NoticeItem) => void;
  onDeleteNotice: (noticeId: number) => void;
}

function NoticeCardComponent({
  notice,
  imagePreset,
  canManageNotices,
  deletingNoticeId,
  onOpenEditDialog,
  onDeleteNotice,
}: NoticeCardProps) {
  const imageStyle = notice.imageUrl
    ? {
        backgroundImage: `linear-gradient(140deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.36) 100%), url(${notice.imageUrl})`,
      }
    : {
        background: imagePreset.gradient,
      };

  return (
    <article className="group">
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
                  onEditClick={() => onOpenEditDialog(notice)}
                  onDeleteClick={() => onDeleteNotice(notice.id)}
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
}

const NoticeCard = memo(NoticeCardComponent);

export default NoticeCard;
