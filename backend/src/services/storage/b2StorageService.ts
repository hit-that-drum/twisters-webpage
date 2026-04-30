import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpError } from '../../errors/httpError.js';
import { type AuthenticatedUser } from '../../types/common.types.js';
import {
  type CreateImageDownloadUrlDTO,
  type CreateImageUploadUrlDTO,
  type ImageUploadScope,
} from '../../types/upload.types.js';
import {
  getB2ObjectKeyFromReference,
  isB2ImageReference,
  toB2ImageReference,
} from '../../utils/imageReference.js';

const SIGNED_UPLOAD_EXPIRES_SECONDS = 5 * 60;
const SIGNED_DOWNLOAD_EXPIRES_SECONDS = 15 * 60;
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const IMAGE_EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const OBJECT_KEY_PREFIX_BY_SCOPE: Record<ImageUploadScope, string> = {
  profile: 'profiles',
  notice: 'notices',
  board: 'boards',
};

type B2Config = {
  endpoint: string;
  region: string;
  bucketName: string;
  keyId: string;
  applicationKey: string;
};

let s3Client: S3Client | null = null;

const readB2Config = (): B2Config | null => {
  const endpoint = process.env.B2_ENDPOINT?.trim();
  const region = process.env.B2_REGION?.trim();
  const bucketName = process.env.B2_BUCKET_NAME?.trim();
  const keyId = process.env.B2_KEY_ID?.trim();
  const applicationKey = process.env.B2_APPLICATION_KEY?.trim();

  if (!endpoint || !region || !bucketName || !keyId || !applicationKey) {
    return null;
  }

  return {
    endpoint,
    region,
    bucketName,
    keyId,
    applicationKey,
  };
};

const requireB2Config = () => {
  const config = readB2Config();
  if (!config) {
    throw new HttpError(500, 'B2 storage configuration is missing.');
  }

  return config;
};

const getS3Client = () => {
  const config = requireB2Config();

  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: config.keyId,
        secretAccessKey: config.applicationKey,
      },
    });
  }

  return s3Client;
};

const normalizeUploadScope = (rawScope: unknown): ImageUploadScope => {
  if (rawScope === 'profile' || rawScope === 'notice' || rawScope === 'board') {
    return rawScope;
  }

  throw new HttpError(400, '유효한 이미지 업로드 범위가 필요합니다.');
};

const normalizeContentType = (rawContentType: unknown) => {
  if (typeof rawContentType !== 'string') {
    throw new HttpError(400, '이미지 content type이 필요합니다.');
  }

  const contentType = rawContentType.trim().toLowerCase();
  if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new HttpError(400, '지원하지 않는 이미지 형식입니다.');
  }

  return contentType;
};

const normalizeImageSize = (rawSize: unknown) => {
  if (typeof rawSize === 'undefined' || rawSize === null) {
    return null;
  }

  const size = Number(rawSize);
  if (!Number.isFinite(size) || size <= 0) {
    throw new HttpError(400, '이미지 파일 크기가 올바르지 않습니다.');
  }

  if (size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new HttpError(400, '이미지는 10MB 이하 파일만 업로드할 수 있습니다.');
  }

  return Math.round(size);
};

const createObjectKey = (
  scope: ImageUploadScope,
  authenticatedUser: AuthenticatedUser,
  contentType: string,
) => {
  const extension = IMAGE_EXTENSION_BY_CONTENT_TYPE[contentType] ?? 'bin';
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${OBJECT_KEY_PREFIX_BY_SCOPE[scope]}/${authenticatedUser.id}/${month}/${randomUUID()}.${extension}`;
};

class B2StorageService {
  isConfigured() {
    return readB2Config() !== null;
  }

  async createImageUploadUrl(
    authenticatedUser: AuthenticatedUser,
    payload: CreateImageUploadUrlDTO,
  ) {
    const config = requireB2Config();
    const scope = normalizeUploadScope(payload.scope);
    const contentType = normalizeContentType(payload.contentType);
    normalizeImageSize(payload.size);

    const objectKey = createObjectKey(scope, authenticatedUser, contentType);
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(getS3Client(), command, {
      expiresIn: SIGNED_UPLOAD_EXPIRES_SECONDS,
    });
    const imageRef = toB2ImageReference(objectKey);

    return {
      uploadUrl,
      imageRef,
      imageUrl: await this.createImageDownloadUrlFromRef(imageRef),
      objectKey,
      expiresInSeconds: SIGNED_UPLOAD_EXPIRES_SECONDS,
      headers: {
        'Content-Type': contentType,
      },
    };
  }

  async createImageDownloadUrl(payload: CreateImageDownloadUrlDTO) {
    if (typeof payload.imageRef !== 'string' || !payload.imageRef.trim()) {
      throw new HttpError(400, '이미지 참조값이 필요합니다.');
    }

    const imageRef = payload.imageRef.trim();
    return {
      imageUrl: await this.createImageDownloadUrlFromRef(imageRef),
      expiresInSeconds: isB2ImageReference(imageRef) ? SIGNED_DOWNLOAD_EXPIRES_SECONDS : null,
    };
  }

  async createImageDownloadUrlFromRef(imageRef: string | null) {
    if (!imageRef) {
      return null;
    }

    if (!isB2ImageReference(imageRef)) {
      return imageRef;
    }

    const objectKey = getB2ObjectKeyFromReference(imageRef);
    if (!objectKey) {
      return null;
    }

    const config = requireB2Config();
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
    });

    return getSignedUrl(getS3Client(), command, {
      expiresIn: SIGNED_DOWNLOAD_EXPIRES_SECONDS,
    });
  }

  async resolveImageResponse(imageRef: string | null) {
    return {
      imageRef,
      imageUrl: await this.createImageDownloadUrlFromRef(imageRef),
    };
  }

  async resolveImageListResponse(imageRefs: string[]) {
    const imageUrls = await Promise.all(
      imageRefs.map((imageRef) => this.createImageDownloadUrlFromRef(imageRef)),
    );

    return {
      imageRefs,
      imageUrl: imageUrls.filter((imageUrl): imageUrl is string => typeof imageUrl === 'string'),
    };
  }
}

export const b2StorageService = new B2StorageService();
