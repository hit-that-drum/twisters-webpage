export const B2_IMAGE_REF_PREFIX = 'b2://';
const B2_THUMBNAIL_REF_SEPARATOR = '#thumb=';

export const isB2ImageReference = (value: string | null | undefined) => {
  return typeof value === 'string' && value.startsWith(B2_IMAGE_REF_PREFIX);
};

export const toB2ImageReference = (
  objectKey: string,
  options: { thumbnailObjectKey?: string | null } = {},
) => {
  const imageRef = `${B2_IMAGE_REF_PREFIX}${objectKey}`;
  if (!options.thumbnailObjectKey) {
    return imageRef;
  }

  return `${imageRef}${B2_THUMBNAIL_REF_SEPARATOR}${encodeURIComponent(
    options.thumbnailObjectKey,
  )}`;
};

export const getB2ObjectKeyFromReference = (value: string) => {
  if (!isB2ImageReference(value)) {
    return null;
  }

  const objectKey = value
    .slice(B2_IMAGE_REF_PREFIX.length)
    .split(B2_THUMBNAIL_REF_SEPARATOR)[0]
    ?.trim();
  return objectKey || null;
};

export const getB2ThumbnailObjectKeyFromReference = (value: string) => {
  if (!isB2ImageReference(value)) {
    return null;
  }

  const separatorIndex = value.indexOf(B2_THUMBNAIL_REF_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }

  const rawThumbnailObjectKey = value
    .slice(separatorIndex + B2_THUMBNAIL_REF_SEPARATOR.length)
    .trim();
  if (!rawThumbnailObjectKey) {
    return null;
  }

  try {
    const thumbnailObjectKey = decodeURIComponent(rawThumbnailObjectKey).trim();
    return thumbnailObjectKey || null;
  } catch (_error) {
    return null;
  }
};

export const normalizeStoredImageReference = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};
