import { apiFetch } from '@/common/lib/api/apiClient';
import { GlobalButton, GlobalImageUpload } from '@/common/components';
import { useAuth } from '@/features';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';

export default function Mypage() {
  const { meInfo, refreshMeInfo } = useAuth();
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setProfileImages(meInfo?.profileImage ? [meInfo.profileImage] : []);
  }, [meInfo?.profileImage]);

  const hasChanges = useMemo(() => {
    const currentProfileImage = meInfo?.profileImage ?? '';
    return currentProfileImage !== (profileImages[0] ?? '');
  }, [meInfo?.profileImage, profileImages]);

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
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
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
      )}
    </div>
  );
}
