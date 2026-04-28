import { FormModal } from '@/common/components';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import type { BoardPostItem } from '@/pages/board/lib/boardTypes';
import ReactionPostCardList from '@/pages/mypage/components/ReactionPostCardList';
import type { ReactionSectionDefinition } from '@/pages/mypage/lib/myPageTypes';

interface ReactionPostsModalProps {
  open: boolean;
  section: ReactionSectionDefinition | null;
  posts: BoardPostItem[];
  onClose: (event: object, reason: ModalCloseReason) => void;
}

export default function ReactionPostsModal({ open, section, posts, onClose }: ReactionPostsModalProps) {
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
