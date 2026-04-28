import { memo } from 'react';
import { FormModal, GlobalImageUpload } from '@/common/components';
import type { ModalCloseReason, TAction } from '@/common/components/GlobalModal';

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

export default memo(ProfileImageEditorModal);
