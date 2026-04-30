export type ImageUploadScope = 'profile' | 'notice' | 'board';

export interface CreateImageUploadUrlDTO {
  filename?: unknown;
  contentType?: unknown;
  size?: unknown;
  scope?: unknown;
}

export interface CreateImageDownloadUrlDTO {
  imageRef?: unknown;
}
