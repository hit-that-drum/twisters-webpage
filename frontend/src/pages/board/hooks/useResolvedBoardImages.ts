import { useEffect, useMemo, useState } from 'react';
import { createImageDownloadUrl } from '@/common/lib/images/b2ImageStorage';

const getUniqueImageRefs = (imageRefs: string[]) => {
  return [...new Set(imageRefs.map((imageRef) => imageRef.trim()).filter(Boolean))];
};

export default function useResolvedBoardImages(imageRefs: string[], enabled = true) {
  const [resolvedImageUrlByRef, setResolvedImageUrlByRef] = useState<Record<string, string | null>>(
    {},
  );
  const stableImageRefs = useMemo(() => getUniqueImageRefs(imageRefs), [imageRefs]);

  useEffect(() => {
    if (!enabled || stableImageRefs.length === 0) {
      return;
    }

    const unresolvedImageRefs = stableImageRefs.filter(
      (imageRef) => typeof resolvedImageUrlByRef[imageRef] === 'undefined',
    );
    if (unresolvedImageRefs.length === 0) {
      return;
    }

    let isCancelled = false;

    const resolveImageRefs = async () => {
      const resolvedEntries: Array<readonly [string, string | null]> = [];

      for (const imageRef of unresolvedImageRefs) {
        if (isCancelled) {
          return;
        }

        try {
          resolvedEntries.push([imageRef, await createImageDownloadUrl(imageRef)] as const);
        } catch (error) {
          console.error('Board image URL resolve failed:', error);
          resolvedEntries.push([imageRef, null] as const);
        }
      }

      if (isCancelled) {
        return;
      }

      setResolvedImageUrlByRef((previous) => {
        const nextResolvedImageUrlByRef = { ...previous };
        resolvedEntries.forEach(([imageRef, imageUrl]) => {
          nextResolvedImageUrlByRef[imageRef] = imageUrl;
        });
        return nextResolvedImageUrlByRef;
      });
    };

    void resolveImageRefs();

    return () => {
      isCancelled = true;
    };
  }, [enabled, resolvedImageUrlByRef, stableImageRefs]);

  return resolvedImageUrlByRef;
}
