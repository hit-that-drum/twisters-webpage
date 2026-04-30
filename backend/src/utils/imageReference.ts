export const B2_IMAGE_REF_PREFIX = 'b2://';

export const isB2ImageReference = (value: string | null | undefined) => {
  return typeof value === 'string' && value.startsWith(B2_IMAGE_REF_PREFIX);
};

export const toB2ImageReference = (objectKey: string) => {
  return `${B2_IMAGE_REF_PREFIX}${objectKey}`;
};

export const getB2ObjectKeyFromReference = (value: string) => {
  if (!isB2ImageReference(value)) {
    return null;
  }

  const objectKey = value.slice(B2_IMAGE_REF_PREFIX.length).trim();
  return objectKey || null;
};

export const normalizeStoredImageReference = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};
