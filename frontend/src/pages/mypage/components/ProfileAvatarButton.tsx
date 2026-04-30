import { memo, useState } from 'react';
import { getMemberInitial } from '@/pages/member/lib/memberFormatters';

interface ProfileAvatarButtonProps {
  name: string;
  profileImage: string | null;
  onClick: () => void;
}

function ProfileAvatarButton({
  name,
  profileImage,
  onClick,
}: ProfileAvatarButtonProps) {
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

export default memo(ProfileAvatarButton);
