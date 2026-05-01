import { useCallback, useMemo, useState } from 'react';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import type { BoardPostItem } from '@/pages/board/lib/boardTypes';

interface UseBoardImageModalOptions {
  boardPosts: BoardPostItem[];
}

interface UseBoardImageModalResult {
  imageModalPost: BoardPostItem | null;
  imageModalCurrentIndex: number;
  currentImageIndexByPost: Record<number, number>;
  handleOpenImageModal: (postId: number) => void;
  handleCloseImageModal: (event: object, reason: ModalCloseReason) => void;
  handleMovePostImage: (postId: number, totalImages: number, direction: 'next' | 'prev') => void;
  handleSelectPostImage: (postId: number, imageIndex: number) => void;
}

/**
 * Owns the per-post image carousel index and the fullscreen image modal
 * target. The active modal post is derived from the current board rows, so a
 * deleted or refetched-away post naturally closes by resolving to `null`.
 */
export default function useBoardImageModal({
  boardPosts,
}: UseBoardImageModalOptions): UseBoardImageModalResult {
  const [currentImageIndexByPost, setCurrentImageIndexByPost] = useState<
    Record<number, number>
  >({});
  const [imageModalPostId, setImageModalPostId] = useState<number | null>(null);

  const handleOpenImageModal = useCallback((postId: number) => {
    setImageModalPostId(postId);
  }, []);

  const handleCloseImageModal = useCallback((event: object, reason: ModalCloseReason) => {
    void event;
    void reason;
    setImageModalPostId(null);
  }, []);

  const handleMovePostImage = useCallback(
    (postId: number, totalImages: number, direction: 'next' | 'prev') => {
      if (totalImages <= 1) {
        return;
      }

      setCurrentImageIndexByPost((previous) => {
        const currentIndex = previous[postId] ?? 0;
        const nextIndex =
          direction === 'next'
            ? (currentIndex + 1) % totalImages
            : (currentIndex - 1 + totalImages) % totalImages;

        return {
          ...previous,
          [postId]: nextIndex,
        };
      });
    },
    [],
  );

  const handleSelectPostImage = useCallback((postId: number, imageIndex: number) => {
    setCurrentImageIndexByPost((previous) => ({
      ...previous,
      [postId]: imageIndex,
    }));
  }, []);

  const imageModalPost = useMemo(
    () => boardPosts.find((post) => post.id === imageModalPostId) ?? null,
    [boardPosts, imageModalPostId],
  );

  const imageModalCurrentIndex = imageModalPost
    ? (currentImageIndexByPost[imageModalPost.id] ?? 0) %
      Math.max(
        imageModalPost.imageRefs.length > 0
          ? imageModalPost.imageRefs.length
          : imageModalPost.imageUrl.length,
        1,
      )
    : 0;

  return {
    imageModalPost,
    imageModalCurrentIndex,
    currentImageIndexByPost,
    handleOpenImageModal,
    handleCloseImageModal,
    handleMovePostImage,
    handleSelectPostImage,
  };
}
