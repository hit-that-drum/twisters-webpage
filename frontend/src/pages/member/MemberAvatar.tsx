import { useState } from 'react';
import { getMemberInitial } from '@/pages/member/lib/memberFormatters';

interface MemberAvatarProps {
  name: string;
  profileImage: string | null;
  containerClassName: string;
  fallbackClassName: string;
}

export default function MemberAvatar({
  name,
  profileImage,
  containerClassName,
  fallbackClassName,
}: MemberAvatarProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const shouldShowProfileImage = Boolean(profileImage && profileImage !== failedImageSrc);

  return (
    <div aria-hidden="true" className={containerClassName}>
      {shouldShowProfileImage ? (
        <img
          src={profileImage ?? undefined}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedImageSrc(profileImage)}
        />
      ) : (
        <span className={fallbackClassName}>{getMemberInitial(name)}</span>
      )}
    </div>
  );
}
