import { apiFetch } from '@/common/lib/api/apiClient';
import { parseApiResponse } from '@/common/lib/api/apiHelpers';

export type ImageUploadScope = 'profile' | 'notice' | 'board';

export const B2_IMAGE_REF_PREFIX = 'b2://';
const DOWNLOAD_URL_CACHE_TTL_MS = 14 * 60 * 1000;

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

  return {
    imageRef,
    imageUrl,
  };
};

export const createImageDownloadUrl = async (imageRef: string) => {
  if (!isB2ImageReference(imageRef)) {
    return imageRef;
  }

  const cachedUrl = downloadUrlCache.get(imageRef);
  if (cachedUrl && cachedUrl.expiresAtMs > Date.now()) {
    return cachedUrl.imageUrl;
  }

  const pendingUrl = downloadUrlPromiseCache.get(imageRef);
  if (pendingUrl) {
    return pendingUrl;
  }

  const requestPromise = (async () => {
    const response = await apiFetch('/uploads/image-download-url', {
      method: 'POST',
      body: JSON.stringify({ imageRef }),
    });
    const payload = await parseApiResponse(response);

    if (!response.ok) {
      throw new Error(getPayloadString(payload, 'error') ?? '이미지 조회 URL 생성 실패');
    }

    const imageUrl = getPayloadString(payload, 'imageUrl');
    downloadUrlCache.set(imageRef, {
      imageUrl,
      expiresAtMs: Date.now() + DOWNLOAD_URL_CACHE_TTL_MS,
    });
    return imageUrl;
  })().finally(() => {
    downloadUrlPromiseCache.delete(imageRef);
  });

  downloadUrlPromiseCache.set(imageRef, requestPromise);
  return requestPromise;
};
