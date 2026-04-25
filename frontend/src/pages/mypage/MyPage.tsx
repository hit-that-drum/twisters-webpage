import { useEffect, useMemo, useState } from 'react';
import { FaHeart, FaRegStar, FaThumbsDown, FaThumbsUp } from 'react-icons/fa';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse, formatRelativeTime } from '@/common/lib/api/apiHelpers';
import useExpiredSession from '@/common/hooks/useExpiredSession';
import { GlobalButton, GlobalImageUpload } from '@/common/components';
import { useAuth } from '@/features';
import { parseBoardPosts } from '@/pages/board/lib/boardParsers';
import type { BoardPostItem, BoardReactionType } from '@/pages/board/lib/boardTypes';

type ReactionSectionDefinition = {
  key: BoardReactionType;
  title: string;
  emptyMessage: string;
  accentClassName: string;
  icon: typeof FaThumbsUp;
};

const REACTION_SECTIONS: ReactionSectionDefinition[] = [
  {
    key: 'thumbsUp',
    title: 'Thumbs Up Posts',
    emptyMessage: 'You have not given a thumbs up to any posts yet.',
    accentClassName: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    icon: FaThumbsUp,
  },
  {
    key: 'thumbsDown',
    title: 'Thumbs Down Posts',
    emptyMessage: 'You have not given a thumbs down to any posts yet.',
    accentClassName: 'text-rose-600 bg-rose-50 border-rose-200',
    icon: FaThumbsDown,
  },
  {
    key: 'favorite',
    title: 'Favorite Posts',
    emptyMessage: 'You have not favorited any posts yet.',
    accentClassName: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: FaRegStar,
  },
  {
    key: 'heart',
    title: 'Heart Posts',
    emptyMessage: 'You have not hearted any posts yet.',
    accentClassName: 'text-pink-600 bg-pink-50 border-pink-200',
    icon: FaHeart,
  },
];

interface ReactionSectionProps {
  section: ReactionSectionDefinition;
  posts: BoardPostItem[];
}

function ReactionSection({ section, posts }: ReactionSectionProps) {
  const Icon = section.icon;

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
          {posts.map((post) => (
            <article
              key={`${section.key}:${post.id}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-slate-900">{post.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Posted by {post.createUser} · {formatRelativeTime(post.createDate)}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${section.accentClassName}`}
                >
                  <Icon size="12px" />
                  <span>
                    {section.key === 'thumbsUp' && post.reactions.thumbsUpCount}
                    {section.key === 'thumbsDown' && post.reactions.thumbsDownCount}
                    {section.key === 'favorite' && post.reactions.favoriteCount}
                    {section.key === 'heart' && post.reactions.heartCount}
                  </span>
                </span>
              </div>

              <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                {post.content.trim() || '내용이 없습니다.'}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Mypage() {
  const { meInfo, refreshMeInfo } = useAuth();
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reactionPosts, setReactionPosts] = useState<BoardPostItem[]>([]);
  const [isLoadingReactionPosts, setIsLoadingReactionPosts] = useState(false);

  const handleExpiredSession = useExpiredSession();

  useEffect(() => {
    setProfileImages(meInfo?.profileImage ? [meInfo.profileImage] : []);
  }, [meInfo?.profileImage]);

  useEffect(() => {
    if (!meInfo) {
      setReactionPosts([]);
      setIsLoadingReactionPosts(false);
      return;
    }

    const loadReactionPosts = async () => {
      setIsLoadingReactionPosts(true);

      try {
        const response = await apiFetch('/board');
        const payload = await parseApiResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredSession();
            return;
          }

          enqueueSnackbar(`게시글 반응 목록 조회 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
            variant: 'error',
          });
          return;
        }

        setReactionPosts(parseBoardPosts(payload));
      } catch (error) {
        console.error('My page reaction posts fetch error:', error);
        enqueueSnackbar('반응한 게시글을 불러오는 중 오류가 발생했습니다.', { variant: 'error' });
      } finally {
        setIsLoadingReactionPosts(false);
      }
    };

    void loadReactionPosts();
  }, [handleExpiredSession, meInfo]);

  const hasChanges = useMemo(() => {
    const currentProfileImage = meInfo?.profileImage ?? '';
    return currentProfileImage !== (profileImages[0] ?? '');
  }, [meInfo?.profileImage, profileImages]);

  const reactionPostsByType = useMemo(() => {
    return Object.fromEntries(
      REACTION_SECTIONS.map((section) => [
        section.key,
        reactionPosts.filter((post) => post.reactions.userReactions.includes(section.key)),
      ]),
    ) as Record<BoardReactionType, BoardPostItem[]>;
  }, [reactionPosts]);

  const handleSaveProfileImage = async () => {
    if (!meInfo) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/authentication/me/profile-image', {
        method: 'PATCH',
        body: JSON.stringify({
          profileImage: profileImages[0] ?? null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

      if (!response.ok) {
        enqueueSnackbar(payload?.error ?? '프로필 이미지를 저장하지 못했습니다.', {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(payload?.message ?? '프로필 이미지가 저장되었습니다.', {
        variant: 'success',
      });
      await refreshMeInfo();
    } catch (error) {
      console.error('Profile image update error:', error);
      enqueueSnackbar('프로필 이미지 저장 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">My Page</h1>
      {meInfo && (
        <div className="mt-6 grid gap-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mt-2 text-sm text-gray-600">Name: {meInfo.name}</p>
              <p className="text-sm text-gray-600">Email: {meInfo.email}</p>
              <p className="text-sm text-gray-600">Admin: {meInfo.isAdmin ? 'Yes' : 'No'}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <GlobalImageUpload
                value={profileImages}
                onChange={setProfileImages}
                disabled={isSubmitting}
                maxImages={1}
                label="PROFILE IMAGE"
                helperText="Choose one profile image from local files, drag and drop it, or paste an image URL."
                previewShape="circle"
              />

              <div className="mt-4 flex justify-end">
                <GlobalButton
                  onClick={handleSaveProfileImage}
                  label={isSubmitting ? 'Saving...' : 'Save Profile Image'}
                  disabled={isSubmitting || !hasChanges}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">My Reactions</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review the posts you reacted to across thumbs up, thumbs down, favorites, and hearts.
                </p>
              </div>
            </div>

            {isLoadingReactionPosts ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Loading your reacted posts...
              </div>
            ) : (
              <div className="mt-5 grid gap-6 xl:grid-cols-2">
                {REACTION_SECTIONS.map((section) => (
                  <ReactionSection
                    key={section.key}
                    section={section}
                    posts={reactionPostsByType[section.key] ?? []}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
