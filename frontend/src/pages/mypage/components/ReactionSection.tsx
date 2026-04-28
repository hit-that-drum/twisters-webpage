import { memo } from 'react';
import type { BoardPostItem, BoardReactionType } from '@/pages/board/lib/boardTypes';
import ReactionPostCardList from '@/pages/mypage/components/ReactionPostCardList';
import {
  REACTION_INLINE_LIMIT,
  REACTION_MODAL_THRESHOLD,
} from '@/pages/mypage/lib/myPageConstants';
import type { ReactionSectionDefinition } from '@/pages/mypage/lib/myPageTypes';

interface ReactionSectionProps {
  section: ReactionSectionDefinition;
  posts: BoardPostItem[];
  onOpenAll: (sectionKey: BoardReactionType) => void;
}

function ReactionSection({ section, posts, onOpenAll }: ReactionSectionProps) {
  const Icon = section.icon;
  const shouldShowModalEntry = posts.length >= REACTION_MODAL_THRESHOLD;
  const displayedPosts = shouldShowModalEntry ? posts.slice(0, REACTION_INLINE_LIMIT) : posts;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex size-10 items-center justify-center rounded-full border ${section.accentClassName}`}
          >
            <Icon size="16px" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            <p className="text-sm text-slate-500">{posts.length} posts</p>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          {section.emptyMessage}
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <ReactionPostCardList section={section} posts={displayedPosts} />
          {shouldShowModalEntry ? (
            <button
              type="button"
              onClick={() => onOpenAll(section.key)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              View all {posts.length}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default memo(ReactionSection);
