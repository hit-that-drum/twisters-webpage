import { useEffect, useMemo, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import { apiFetch } from '@/common/lib/api/apiClient';
import { getApiMessage, parseApiResponse } from '@/common/lib/api/apiHelpers';
import {
  isValidOptionalPhoneNumber,
  normalizePhoneNumber,
  PHONE_FORMAT_ERROR_MESSAGE,
} from '@/common/lib/phoneNumber';
import type { MeInfo } from '@/entities/user/types';

interface ProfileForm {
  phone: string;
  birthDate: string;
}

interface UseMyPageProfileOptions {
  meInfo: MeInfo | null;
  refreshMeInfo: () => Promise<MeInfo | null>;
  onExpiredSession: () => void;
}

interface UseMyPageProfileResult {
  profileImages: string[];
  setProfileImages: (value: string[]) => void;
  profileForm: ProfileForm;
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
  hasImageChanges: boolean;
  hasProfileDetailChanges: boolean;
  isSavingProfileImage: boolean;
  isSavingProfileDetails: boolean;
  openProfileImageModal: boolean;
  handleOpenProfileImageModal: () => void;
  handleCloseProfileImageModal: (event: object, reason: ModalCloseReason) => void;
  handleSaveProfileImage: () => Promise<void>;
  handleSaveProfileDetails: () => Promise<void>;
}

const useMyPageProfile = ({
  meInfo,
  refreshMeInfo,
  onExpiredSession,
}: UseMyPageProfileOptions): UseMyPageProfileResult => {
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    phone: '',
    birthDate: '',
  });
  const [isSavingProfileImage, setIsSavingProfileImage] = useState(false);
  const [isSavingProfileDetails, setIsSavingProfileDetails] = useState(false);
  const [openProfileImageModal, setOpenProfileImageModal] = useState(false);

  useEffect(() => {
    const currentProfileImageRef = meInfo?.profileImageRef ?? meInfo?.profileImage ?? null;
    setProfileImages(currentProfileImageRef ? [currentProfileImageRef] : []);
  }, [meInfo?.profileImage, meInfo?.profileImageRef]);

  useEffect(() => {
    setProfileForm({
      phone: meInfo?.phone ? normalizePhoneNumber(meInfo.phone) : '',
      birthDate: meInfo?.birthDate ?? '',
    });
  }, [meInfo?.birthDate, meInfo?.phone]);

  const hasImageChanges = useMemo(() => {
    const currentProfileImage = meInfo?.profileImageRef ?? meInfo?.profileImage ?? '';
    return currentProfileImage !== (profileImages[0] ?? '');
  }, [meInfo?.profileImage, meInfo?.profileImageRef, profileImages]);

  const hasProfileDetailChanges = useMemo(() => {
    return (
      (meInfo?.phone ? normalizePhoneNumber(meInfo.phone) : '') !== profileForm.phone ||
      (meInfo?.birthDate ?? '') !== profileForm.birthDate
    );
  }, [meInfo?.birthDate, meInfo?.phone, profileForm.birthDate, profileForm.phone]);

  const handleOpenProfileImageModal = () => {
    const currentProfileImageRef = meInfo?.profileImageRef ?? meInfo?.profileImage ?? null;
    setProfileImages(currentProfileImageRef ? [currentProfileImageRef] : []);
    setOpenProfileImageModal(true);
  };

  const handleCloseProfileImageModal = (event: object, reason: ModalCloseReason) => {
    void event;
    void reason;

    if (isSavingProfileImage) {
      return;
    }

    const currentProfileImageRef = meInfo?.profileImageRef ?? meInfo?.profileImage ?? null;
    setProfileImages(currentProfileImageRef ? [currentProfileImageRef] : []);
    setOpenProfileImageModal(false);
  };

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

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

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
          onExpiredSession();
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

  return {
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
  };
};

export default useMyPageProfile;
