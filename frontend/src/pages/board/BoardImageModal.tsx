import { useCallback, useEffect, useMemo } from 'react';
import { GlobalModal } from '@/common/components';
import type { ModalCloseReason } from '@/common/components/GlobalModal';
import useResolvedBoardImages from '@/pages/board/hooks/useResolvedBoardImages';

interface BoardImageModalProps {
  open: boolean;
  handleClose: (event: object, reason: ModalCloseReason) => void;
  title: string;
  images: string[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onSelectImage: (index: number) => void;
}

export default function BoardImageModal({
  open,
  handleClose,
  title,
  images,
  currentIndex,
  onPrevious,
  onNext,
  onSelectImage,
}: BoardImageModalProps) {
  const safeIndex = images.length > 0 ? currentIndex % images.length : 0;
  const activeImageRef = images[safeIndex] ?? null;
  const imageRefsToResolve = useMemo(() => {
    if (!open) {
      return [];
    }

    return images;
  }, [images, open]);
  const resolvedImageUrlByRef = useResolvedBoardImages(imageRefsToResolve, open);
  const activeImage = activeImageRef ? resolvedImageUrlByRef[activeImageRef] : null;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open || images.length <= 1) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    },
    [images.length, onNext, onPrevious, open],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, open]);

  return (
    <GlobalModal
      open={open}
      handleClose={handleClose}
      title={`${title} ${images.length > 0 ? `(${safeIndex + 1}/${images.length})` : ''}`}
      actions={[]}
      keepOnBackdropClick={false}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div
          role="group"
          aria-roledescription="carousel"
          className="relative overflow-hidden rounded-2xl bg-slate-950"
        >
          {activeImage ? (
            <img
              src={activeImage}
              alt={`${title} image ${safeIndex + 1}`}
              loading="lazy"
              className="h-auto max-h-[70vh] w-full object-contain"
            />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center text-sm font-medium text-slate-300">
              등록된 이미지가 없습니다.
            </div>
          )}

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={onPrevious}
                className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-2xl font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-2xl font-bold text-white backdrop-blur-sm transition hover:bg-black/60"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6" aria-label={`${title} image thumbnails`}>
            {images.map((imageUrl, imageIndex) => (
              <button
                key={`${imageUrl}-${imageIndex}`}
                type="button"
                onClick={() => onSelectImage(imageIndex)}
                className={`overflow-hidden rounded-xl border-2 transition ${
                  safeIndex === imageIndex
                    ? 'border-blue-500 shadow-md shadow-blue-200/60'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                aria-label={`Show image ${imageIndex + 1} for ${title}`}
                aria-pressed={safeIndex === imageIndex}
              >
                {resolvedImageUrlByRef[imageUrl] ? (
                  <img
                    src={resolvedImageUrlByRef[imageUrl]}
                    alt={`${title} thumbnail ${imageIndex + 1}`}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <span className="flex aspect-square w-full items-center justify-center bg-slate-100 text-[10px] font-semibold text-slate-400">
                    Loading
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </GlobalModal>
  );
}
