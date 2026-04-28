import { useMemo, useState } from 'react';
import { GlobalButton } from '@/common/components';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import useExpiredSession from '@/common/hooks/useExpiredSession';
import {
  formatPhoneInput,
  PHONE_FORMATTED_LENGTH,
} from '@/common/lib/phoneNumber';
import { useAuth } from '@/features';
import type { BoardReactionType } from '@/pages/board/lib/boardTypes';
import ProfileAvatarButton from '@/pages/mypage/components/ProfileAvatarButton';
import ProfileImageEditorModal from '@/pages/mypage/components/ProfileImageEditorModal';
import ReactionPostsModal from '@/pages/mypage/components/ReactionPostsModal';
import ReactionSection from '@/pages/mypage/components/ReactionSection';
import useMyPageProfile from '@/pages/mypage/hooks/useMyPageProfile';
import useReactionPosts from '@/pages/mypage/hooks/useReactionPosts';
import { REACTION_SECTIONS } from '@/pages/mypage/lib/myPageConstants';

export default function Mypage() {
  const { meInfo, refreshMeInfo } = useAuth();
  const handleExpiredSession = useExpiredSession();

  const {
    profileImages,
    setProfileImages,
    profileForm,
    setProfileForm,
    hasImageChanges,
    hasProfileDetailChanges,
    isSavingProfileImage,
    isSavingProfileDetails,
    openProfileImageModal,
    handleOpenProfileImageModal,
    handleCloseProfileImageModal,
    handleSaveProfileImage,
    handleSaveProfileDetails,
  } = useMyPageProfile({
    meInfo,
    refreshMeInfo,
    onExpiredSession: handleExpiredSession,
  });

  const { reactionPostsByType, isLoadingReactionPosts } = useReactionPosts({
    isAuthenticated: Boolean(meInfo),
    onExpiredSession: handleExpiredSession,
  });

  const [activeReactionModalKey, setActiveReactionModalKey] = useState<BoardReactionType | null>(
    null,
  );

  const activeReactionModalSection = useMemo(
    () => REACTION_SECTIONS.find((section) => section.key === activeReactionModalKey) ?? null,
    [activeReactionModalKey],
  );

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
          hasChanges={hasImageChanges}
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
