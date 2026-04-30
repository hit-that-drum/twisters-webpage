import { useState } from 'react';
import { getAvatarToneClassName, getInitials } from '@/pages/adminpage/lib/adminFormatters';

interface AdminUserAvatarProps {
  userId: number;
  name: string;
  profileImage: string | null;
}

export default function AdminUserAvatar({ userId, name, profileImage }: AdminUserAvatarProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  const shouldShowProfileImage = Boolean(profileImage && profileImage !== failedImageSrc);

  return (
    <div
      className={`flex size-10 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${getAvatarToneClassName(
        userId,
      )}`}
    >
      {shouldShowProfileImage ? (
        <img
          src={profileImage ?? undefined}
          alt={`${name} profile`}
          className="h-full w-full object-cover"
          onError={() => setFailedImageSrc(profileImage)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
