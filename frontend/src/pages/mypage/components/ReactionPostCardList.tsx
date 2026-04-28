import { formatRelativeTime } from '@/common/lib/api/apiHelpers';
import type { BoardPostItem } from '@/pages/board/lib/boardTypes';
import { createBoardPostUrl, getReactionCount } from '@/pages/mypage/lib/myPageHelpers';
import type { ReactionSectionDefinition } from '@/pages/mypage/lib/myPageTypes';

interface ReactionPostCardListProps {
  section: ReactionSectionDefinition;
  posts: BoardPostItem[];
}

export default function ReactionPostCardList({ section, posts }: ReactionPostCardListProps) {
  const Icon = section.icon;

  return (
    <div className="grid gap-3">
      {posts.map((post) => (
        <article
          key={post.id}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <a
                href={createBoardPostUrl(post.id)}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-base font-semibold text-slate-900 transition hover:text-blue-600 hover:underline"
                title={post.title}
              >
                {post.title}
              </a>
              <p className="mt-1 text-sm text-slate-500">
                Posted by {post.createUser} · {formatRelativeTime(post.createDate)}
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${section.accentClassName}`}
            >
              <Icon size="12px" />
              <span>{getReactionCount(post, section.key)}</span>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
