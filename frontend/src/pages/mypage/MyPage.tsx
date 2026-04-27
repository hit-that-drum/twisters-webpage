import { useEffect, useMemo, useState } from 'react';
import { FaHeart, FaRegStar, FaThumbsDown, FaThumbsUp } from 'react-icons/fa';
import { enqueueSnackbar } from 'notistack';
import { apiFetch } from '@/common/lib/api/apiClient';
import {
  getApiMessage,
  isEmptyListResponse,
  parseApiResponse,
  formatRelativeTime,
} from '@/common/lib/api/apiHelpers';
import useExpiredSession from '@/common/hooks/useExpiredSession';
import { FormModal, GlobalButton, GlobalImageUpload } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';
import {
  formatPhoneInput,
  isValidOptionalPhoneNumber,
  normalizePhoneNumber,
  PHONE_FORMAT_ERROR_MESSAGE,
  PHONE_FORMATTED_LENGTH,
} from '@/common/lib/phoneNumber';
import { useAuth } from '@/features';
import { parseBoardPosts } from '@/pages/board/lib/boardParsers';
import type { BoardPostItem, BoardReactionType } from '@/pages/board/lib/boardTypes';
import { getMemberInitial } from '@/pages/member/lib/memberFormatters';

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

const REACTION_INLINE_LIMIT = 4;
const REACTION_MODAL_THRESHOLD = 5;

interface ReactionSectionProps {
  section: ReactionSectionDefinition;
  posts: BoardPostItem[];
  onOpenAll: (sectionKey: BoardReactionType) => void;
}

interface ProfileAvatarButtonProps {
  name: string;
  profileImage: string | null;
  onClick: () => void;
}

function ProfileAvatarButton({ name, profileImage, onClick }: ProfileAvatarButtonProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const shouldShowProfileImage = Boolean(profileImage && profileImage !== failedImageSrc);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="프로필 이미지 변경"
    >
      {shouldShowProfileImage ? (
        <img
          src={profileImage ?? undefined}
          alt={`${name} profile`}
          className="h-full w-full object-cover"
          onError={() => setFailedImageSrc(profileImage)}
        />
      ) : (
        <span className="text-4xl font-bold text-slate-600">{getMemberInitial(name)}</span>
      )}
    </button>
  );
}

interface ProfileImageEditorModalProps {
  open: boolean;
  profileImages: string[];
  isSubmitting: boolean;
  hasChanges: boolean;
  onClose: (event: object, reason: ModalCloseReason) => void;
  onImagesChange: (value: string[]) => void;
  onSave: () => void;
}

function ProfileImageEditorModal({
  open,
  profileImages,
  isSubmitting,
  hasChanges,
  onClose,
  onImagesChange,
  onSave,
}: ProfileImageEditorModalProps) {
  const actions: TAction[] = [
    {
      label: isSubmitting ? 'Saving...' : 'Save Profile Image',
      onClick: onSave,
      buttonStyle: 'confirm',
      disabled: isSubmitting || !hasChanges,
    },
  ];

  return (
    <FormModal
      open={open}
      handleClose={onClose}
      title="프로필 이미지 변경"
      actions={actions}
      formKey="profile-image"
      maxWidth="sm"
    >
      <div className="pt-1">
        <GlobalImageUpload
          value={profileImages}
          onChange={onImagesChange}
          disabled={isSubmitting}
          maxImages={1}
          label="PROFILE IMAGE"
          helperText="프로필 이미지를 하나 선택하거나, 드래그 앤 드롭 또는 이미지 URL로 등록할 수 있습니다."
          previewShape="circle"
        />
      </div>
    </FormModal>
  );
}

const createBoardPostUrl = (postId: number) => `/board?postId=${postId}`;

function getReactionCount(post: BoardPostItem, reactionType: BoardReactionType) {
  if (reactionType === 'thumbsUp') {
    return post.reactions.thumbsUpCount;
  }

  if (reactionType === 'thumbsDown') {
    return post.reactions.thumbsDownCount;
  }

  if (reactionType === 'favorite') {
    return post.reactions.favoriteCount;
  }

  return post.reactions.heartCount;
}

interface ReactionPostCardListProps {
  section: ReactionSectionDefinition;
  posts: BoardPostItem[];
}

function ReactionPostCardList({ section, posts }: ReactionPostCardListProps) {
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

interface ReactionPostsModalProps {
  open: boolean;
  section: ReactionSectionDefinition | null;
  posts: BoardPostItem[];
  onClose: (event: object, reason: ModalCloseReason) => void;
}

function ReactionPostsModal({ open, section, posts, onClose }: ReactionPostsModalProps) {
  if (!section) {
    return null;
  }

  return (
    <FormModal
      open={open}
      handleClose={onClose}
      title={section.title}
      actions={[]}
      maxWidth="md"
    >
      <div className="py-1">
        <ReactionPostCardList section={section} posts={posts} />
      </div>
    </FormModal>
  );
}

export default function Mypage() {
  const { meInfo, refreshMeInfo } = useAuth();
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [profileForm, setProfileForm] = useState({
    phone: '',
    birthDate: '',
  });
  const [isSavingProfileImage, setIsSavingProfileImage] = useState(false);
  const [isSavingProfileDetails, setIsSavingProfileDetails] = useState(false);
  const [openProfileImageModal, setOpenProfileImageModal] = useState(false);
  const [activeReactionModalKey, setActiveReactionModalKey] = useState<BoardReactionType | null>(
    null,
  );
  const [reactionPosts, setReactionPosts] = useState<BoardPostItem[]>([]);
  const [isLoadingReactionPosts, setIsLoadingReactionPosts] = useState(false);

  const handleExpiredSession = useExpiredSession();

  useEffect(() => {
    setProfileImages(meInfo?.profileImage ? [meInfo.profileImage] : []);
  }, [meInfo?.profileImage]);

  useEffect(() => {
    setProfileForm({
      phone: meInfo?.phone ? normalizePhoneNumber(meInfo.phone) : '',
      birthDate: meInfo?.birthDate ?? '',
    });
  }, [meInfo?.birthDate, meInfo?.phone]);

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

          if (isEmptyListResponse(response, payload, ['게시글', 'board', 'post', 'data'])) {
            setReactionPosts([]);
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

  const hasProfileDetailChanges = useMemo(() => {
    return (
      (meInfo?.phone ? normalizePhoneNumber(meInfo.phone) : '') !== profileForm.phone ||
      (meInfo?.birthDate ?? '') !== profileForm.birthDate
    );
  }, [meInfo?.birthDate, meInfo?.phone, profileForm.birthDate, profileForm.phone]);

  const reactionPostsByType = useMemo(() => {
    return Object.fromEntries(
      REACTION_SECTIONS.map((section) => [
        section.key,
        reactionPosts.filter((post) => post.reactions.userReactions.includes(section.key)),
      ]),
    ) as Record<BoardReactionType, BoardPostItem[]>;
  }, [reactionPosts]);

  const activeReactionModalSection = useMemo(
    () => REACTION_SECTIONS.find((section) => section.key === activeReactionModalKey) ?? null,
    [activeReactionModalKey],
  );

  const handleSaveProfileImage = async () => {
    if (!meInfo) {
      return;
    }

    setIsSavingProfileImage(true);

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
      setOpenProfileImageModal(false);
    } catch (error) {
      console.error('Profile image update error:', error);
      enqueueSnackbar('프로필 이미지 저장 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSavingProfileImage(false);
    }
  };

  const handleSaveProfileDetails = async () => {
    if (!meInfo) {
      return;
    }

    if (!isValidOptionalPhoneNumber(profileForm.phone)) {
      enqueueSnackbar(PHONE_FORMAT_ERROR_MESSAGE, { variant: 'error' });
      return;
    }

    setIsSavingProfileDetails(true);

    try {
      const response = await apiFetch('/authentication/me', {
        method: 'PATCH',
        body: JSON.stringify({
          phone: normalizePhoneNumber(profileForm.phone),
          birthDate: profileForm.birthDate,
        }),
      });
      const payload = await parseApiResponse(response);

      if (!response.ok) {
        if (response.status === 401) {
          handleExpiredSession();
          return;
        }

        enqueueSnackbar(`프로필 정보 저장 실패: ${getApiMessage(payload, '알 수 없는 에러')}`, {
          variant: 'error',
        });
        return;
      }

      enqueueSnackbar(getApiMessage(payload, '프로필 정보가 저장되었습니다.'), {
        variant: 'success',
      });
      await refreshMeInfo();
    } catch (error) {
      console.error('Profile details update error:', error);
      enqueueSnackbar('프로필 정보 저장 중 오류가 발생했습니다.', { variant: 'error' });
    } finally {
      setIsSavingProfileDetails(false);
    }
  };

  const handleOpenProfileImageModal = () => {
    setProfileImages(meInfo?.profileImage ? [meInfo.profileImage] : []);
    setOpenProfileImageModal(true);
  };

  const handleCloseProfileImageModal = (_event: object, _reason: ModalCloseReason) => {
    if (isSavingProfileImage) {
      return;
    }

    setProfileImages(meInfo?.profileImage ? [meInfo.profileImage] : []);
    setOpenProfileImageModal(false);
  };

  const handleCloseReactionModal = (_event: object, _reason: ModalCloseReason) => {
    setActiveReactionModalKey(null);
  };

  return (
    <main className="flex flex-1 flex-col items-center px-3 py-6 sm:px-4 sm:py-8 lg:px-20">
      <div className="layout-content-container flex w-full flex-col gap-5 sm:gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">
            MY PAGE
          </h1>
        </div>

        {meInfo && (
          <div className="grid gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ProfileAvatarButton
                  name={meInfo.name}
                  profileImage={meInfo.profileImage}
                  onClick={handleOpenProfileImageModal}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">{meInfo.name}</h2>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Email
                      </span>
                      <input
                        type="text"
                        value={meInfo.email}
                        readOnly
                        className="border-none bg-transparent p-0 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Joined At
                      </span>
                      <input
                        type="text"
                        value={meInfo.joinedAt ?? '-'}
                        readOnly
                        className="border-none bg-transparent p-0 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Birthdate
                      </span>
                      <input
                        type="date"
                        value={profileForm.birthDate}
                        onChange={(event) =>
                          setProfileForm((previous) => ({
                            ...previous,
                            birthDate: event.target.value,
                          }))
                        }
                        className="border-none bg-transparent p-0 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Phone
                      </span>
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={(event) =>
                          setProfileForm((previous) => ({
                            ...previous,
                            phone: formatPhoneInput(event.target.value),
                          }))
                        }
                        placeholder="전화번호를 입력해주세요"
                        inputMode="numeric"
                        maxLength={PHONE_FORMATTED_LENGTH}
                        className="border-none bg-transparent p-0 text-sm font-medium text-slate-700 outline-none"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleOpenProfileImageModal}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      프로필 이미지 변경
                    </button>
                    <GlobalButton
                      onClick={() => {
                        void handleSaveProfileDetails();
                      }}
                      label={isSavingProfileDetails ? 'Saving...' : 'Save Profile'}
                      disabled={isSavingProfileDetails || !hasProfileDetailChanges}
                      variant="min-w-[140px] h-11 border-2 text-white text-sm bg-slate-900 hover:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">My Reactions</h2>
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
                      onOpenAll={setActiveReactionModalKey}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <ProfileImageEditorModal
          open={openProfileImageModal}
          profileImages={profileImages}
          isSubmitting={isSavingProfileImage}
          hasChanges={hasChanges}
          onClose={handleCloseProfileImageModal}
          onImagesChange={setProfileImages}
          onSave={() => {
            void handleSaveProfileImage();
          }}
        />

        <ReactionPostsModal
          open={activeReactionModalSection !== null}
          section={activeReactionModalSection}
          posts={
            activeReactionModalKey ? reactionPostsByType[activeReactionModalKey] ?? [] : []
          }
          onClose={handleCloseReactionModal}
        />
      </div>
    </main>
  );
}
