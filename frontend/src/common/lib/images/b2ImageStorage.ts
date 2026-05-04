import { apiFetch } from '@/common/lib/api/apiClient';
import { parseApiResponse } from '@/common/lib/api/apiHelpers';

export type ImageUploadScope = 'profile' | 'notice' | 'board';
export type ImageDownloadVariant = 'thumbnail' | 'large' | 'avatar';

export const B2_IMAGE_REF_PREFIX = 'b2://';
const DOWNLOAD_URL_CACHE_TTL_MS = 14 * 60 * 1000;
const THUMBNAIL_CONTENT_TYPE = 'image/webp';
const THUMBNAIL_QUALITY = 0.78;

const downloadUrlCache = new Map<string, { imageUrl: string | null; expiresAtMs: number }>();
const downloadUrlPromiseCache = new Map<string, Promise<string | null>>();

export const isB2ImageReference = (value: string | null | undefined) => {
  return typeof value === 'string' && value.startsWith(B2_IMAGE_REF_PREFIX);
};

const getPayloadString = (payload: unknown, key: string) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const getThumbnailSizeForScope = (scope: ImageUploadScope) => {
  if (scope === 'profile') {
    return {
      width: 256,
      height: 256,
      cover: true,
    };
  }

  return {
    width: 640,
    height: 640,
    cover: false,
  };
};

const canCreateThumbnail = (file: File) => {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
};

const loadImageElement = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('썸네일 이미지를 읽지 못했습니다.'));
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const createImageThumbnailBlob = async (file: File, scope: ImageUploadScope) => {
  if (!canCreateThumbnail(file)) {
    return null;
  }

  const image = await loadImageElement(file);
  const target = getThumbnailSizeForScope(scope);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return null;
  }

  const scale = target.cover
    ? Math.max(target.width / sourceWidth, target.height / sourceHeight)
    : Math.min(target.width / sourceWidth, target.height / sourceHeight, 1);
  const canvasWidth = Math.max(1, Math.round(target.cover ? target.width : sourceWidth * scale));
  const canvasHeight = Math.max(
    1,
    Math.round(target.cover ? target.height : sourceHeight * scale),
  );
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = target.cover ? (canvasWidth - drawWidth) / 2 : 0;
  const dy = target.cover ? (canvasHeight - drawHeight) / 2 : 0;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.drawImage(image, dx, dy, drawWidth, drawHeight);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, THUMBNAIL_CONTENT_TYPE, THUMBNAIL_QUALITY);
  });
};

export const uploadImageFileToB2 = async (file: File, scope: ImageUploadScope) => {
  const presignResponse = await apiFetch('/uploads/image-upload-url', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
      scope,
    }),
  });
  const presignPayload = await parseApiResponse(presignResponse);

  if (!presignResponse.ok) {
    throw new Error(getPayloadString(presignPayload, 'error') ?? '이미지 업로드 URL 생성 실패');
  }

  const uploadUrl = getPayloadString(presignPayload, 'uploadUrl');
  const imageRef = getPayloadString(presignPayload, 'imageRef');
  const imageRefWithThumbnail = getPayloadString(presignPayload, 'imageRefWithThumbnail');
  const thumbnailUploadUrl = getPayloadString(presignPayload, 'thumbnailUploadUrl');
  const imageUrl = getPayloadString(presignPayload, 'imageUrl');

  if (!uploadUrl || !imageRef) {
    throw new Error('이미지 업로드 응답이 올바르지 않습니다.');
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('이미지를 B2에 업로드하지 못했습니다.');
  }

  let finalImageRef = imageRef;
  if (thumbnailUploadUrl && imageRefWithThumbnail) {
    try {
      const thumbnailBlob = await createImageThumbnailBlob(file, scope);
      if (thumbnailBlob) {
        const thumbnailUploadResponse = await fetch(thumbnailUploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': THUMBNAIL_CONTENT_TYPE,
          },
          body: thumbnailBlob,
        });

        if (thumbnailUploadResponse.ok) {
          finalImageRef = imageRefWithThumbnail;
        }
      }
    } catch (error) {
      console.warn('Image thumbnail upload failed; using original image only.', error);
    }
  }

  return {
    imageRef: finalImageRef,
    imageUrl,
  };
};

const createDownloadUrlCacheKey = (imageRef: string, variant?: ImageDownloadVariant) => {
  return `${imageRef}::${variant ?? 'default'}`;
};

export const createImageDownloadUrl = async (
  imageRef: string,
  options: { variant?: ImageDownloadVariant } = {},
) => {
  if (!isB2ImageReference(imageRef)) {
    return imageRef;
  }

  const cacheKey = createDownloadUrlCacheKey(imageRef, options.variant);
  const cachedUrl = downloadUrlCache.get(cacheKey);
  if (cachedUrl && cachedUrl.expiresAtMs > Date.now()) {
    return cachedUrl.imageUrl;
  }

  const pendingUrl = downloadUrlPromiseCache.get(cacheKey);
  if (pendingUrl) {
    return pendingUrl;
  }

  const requestPromise = (async () => {
    const response = await apiFetch('/uploads/image-download-url', {
      method: 'POST',
      body: JSON.stringify({ imageRef, variant: options.variant }),
    });
    const payload = await parseApiResponse(response);

    if (!response.ok) {
      throw new Error(getPayloadString(payload, 'error') ?? '이미지 조회 URL 생성 실패');
    }

    const imageUrl = getPayloadString(payload, 'imageUrl');
    downloadUrlCache.set(cacheKey, {
      imageUrl,
      expiresAtMs: Date.now() + DOWNLOAD_URL_CACHE_TTL_MS,
    });
    return imageUrl;
  })().finally(() => {
    downloadUrlPromiseCache.delete(cacheKey);
  });

  downloadUrlPromiseCache.set(cacheKey, requestPromise);
  return requestPromise;
};
