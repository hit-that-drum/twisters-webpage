import { createHmac, randomUUID } from 'crypto';
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
import { profileSegment } from '../../utils/requestProfiler.js';

const SIGNED_UPLOAD_EXPIRES_SECONDS = 5 * 60;
const SIGNED_DOWNLOAD_EXPIRES_SECONDS = 15 * 60;
const SIGNED_DOWNLOAD_CACHE_TTL_MS = (SIGNED_DOWNLOAD_EXPIRES_SECONDS - 60) * 1000;
const CDN_DOWNLOAD_EXPIRES_SECONDS = 24 * 60 * 60;
const CDN_DOWNLOAD_CACHE_TTL_MS = (CDN_DOWNLOAD_EXPIRES_SECONDS - 60) * 1000;
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const SIGNED_CDN_IMAGE_PARAMS = ['w', 'h', 'q', 'fit'] as const;

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

type ImageDownloadVariant = 'thumbnail' | 'large' | 'avatar';

type ImageDownloadTransformOptions = {
  w?: number;
  h?: number;
  q?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop';
};

type ImageDownloadOptions = {
  variant?: ImageDownloadVariant;
};

let s3Client: S3Client | null = null;
const signedDownloadUrlCache = new Map<string, { imageUrl: string; expiresAtMs: number }>();
const cdnDownloadUrlCache = new Map<string, { imageUrl: string; expiresAtMs: number }>();

const IMAGE_TRANSFORM_BY_VARIANT: Record<ImageDownloadVariant, ImageDownloadTransformOptions> = {
  thumbnail: {
    w: 640,
    q: 75,
    fit: 'scale-down',
  },
  large: {
    w: 1440,
    q: 85,
    fit: 'scale-down',
  },
  avatar: {
    w: 256,
    h: 256,
    q: 80,
    fit: 'cover',
  },
};

const normalizeImageDownloadVariant = (rawVariant: unknown): ImageDownloadVariant | undefined => {
  if (typeof rawVariant === 'undefined' || rawVariant === null || rawVariant === '') {
    return undefined;
  }

  if (rawVariant === 'thumbnail' || rawVariant === 'large' || rawVariant === 'avatar') {
    return rawVariant;
  }

  throw new HttpError(400, '유효한 이미지 변환 옵션이 필요합니다.');
};

const getImageTransformOptions = (
  options?: ImageDownloadOptions,
): ImageDownloadTransformOptions => {
  if (!options?.variant) {
    return {};
  }

  return IMAGE_TRANSFORM_BY_VARIANT[options.variant];
};

const createTransformCacheKey = (transformOptions: ImageDownloadTransformOptions) => {
  return SIGNED_CDN_IMAGE_PARAMS.map((key) => `${key}:${transformOptions[key] ?? ''}`).join('|');
};

const readPublicImageBaseUrl = () => {
  const publicBaseUrl = (
    process.env.IMAGE_CDN_BASE_URL ??
    process.env.B2_PUBLIC_BASE_URL ??
    process.env.B2_CDN_BASE_URL ??
    ''
  ).trim();

  if (!publicBaseUrl) {
    return null;
  }

  const normalizedBaseUrl = /^https?:\/\//i.test(publicBaseUrl)
    ? publicBaseUrl
    : `https://${publicBaseUrl}`;

  return normalizedBaseUrl.replace(/\/+$/, '');
};

const readImageCdnSigningSecret = () => process.env.IMAGE_CDN_SIGNING_SECRET?.trim() || null;

const createCdnSignatureMessage = (
  signedPath: string,
  expiresAtSeconds: number,
  transformOptions: ImageDownloadTransformOptions,
) => {
  const signedValues = SIGNED_CDN_IMAGE_PARAMS.map((key) =>
    typeof transformOptions[key] === 'undefined' ? '' : String(transformOptions[key]),
  );

  return [signedPath, String(expiresAtSeconds), ...signedValues].join('\n');
};

const createCdnSignature = (
  secret: string,
  signedPath: string,
  expiresAtSeconds: number,
  transformOptions: ImageDownloadTransformOptions,
) => {
  return createHmac('sha256', secret)
    .update(createCdnSignatureMessage(signedPath, expiresAtSeconds, transformOptions))
    .digest('hex');
};

const createCdnExpiresAtSeconds = () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const currentBucketStart =
    Math.floor(nowSeconds / CDN_DOWNLOAD_EXPIRES_SECONDS) * CDN_DOWNLOAD_EXPIRES_SECONDS;

  return currentBucketStart + CDN_DOWNLOAD_EXPIRES_SECONDS * 2;
};

const createPublicImageUrl = (
  objectKey: string,
  transformOptions: ImageDownloadTransformOptions = {},
) => {
  const publicBaseUrl = readPublicImageBaseUrl();
  if (!publicBaseUrl) {
    return null;
  }

  const encodedObjectKey = objectKey.split('/').map(encodeURIComponent).join('/');
  const imageUrl = new URL(`${publicBaseUrl}/${encodedObjectKey}`);
  const signingSecret = readImageCdnSigningSecret();

  SIGNED_CDN_IMAGE_PARAMS.forEach((key) => {
    const value = transformOptions[key];
    if (typeof value !== 'undefined') {
      imageUrl.searchParams.set(key, String(value));
    }
  });

  if (!signingSecret) {
    return imageUrl.toString();
  }

  const expiresAtSeconds = createCdnExpiresAtSeconds();
  const signedPath = `/${objectKey}`;
  const signature = createCdnSignature(
    signingSecret,
    signedPath,
    expiresAtSeconds,
    transformOptions,
  );

  imageUrl.searchParams.set('exp', String(expiresAtSeconds));
  imageUrl.searchParams.set('sig', signature);

  return imageUrl.toString();
};

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

    const uploadUrl = await profileSegment(
      'b2.signUploadUrl',
      () =>
        getSignedUrl(getS3Client(), command, {
          expiresIn: SIGNED_UPLOAD_EXPIRES_SECONDS,
        }),
      {
        scope,
        contentType,
      },
    );
    const imageRef = toB2ImageReference(objectKey);

    return {
      uploadUrl,
      imageRef,
      imageUrl: await this.createImageDownloadUrlFromRef(imageRef, { variant: 'large' }),
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
    const variant = normalizeImageDownloadVariant(payload.variant);
    const imageDownloadOptions: ImageDownloadOptions | undefined = variant
      ? { variant }
      : undefined;
    const hasPublicImageBaseUrl = readPublicImageBaseUrl() !== null;
    const hasCdnSigningSecret = readImageCdnSigningSecret() !== null;
    const expiresInSeconds = isB2ImageReference(imageRef)
      ? hasCdnSigningSecret
        ? CDN_DOWNLOAD_EXPIRES_SECONDS
        : hasPublicImageBaseUrl
          ? null
          : SIGNED_DOWNLOAD_EXPIRES_SECONDS
      : null;

    return {
      imageUrl: await this.createImageDownloadUrlFromRef(imageRef, imageDownloadOptions),
      expiresInSeconds,
    };
  }

  async createImageDownloadUrlFromRef(
    imageRef: string | null,
    options?: ImageDownloadOptions,
  ): Promise<string | null> {
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

    const transformOptions = getImageTransformOptions(options);
    const cdnCacheKey = `${imageRef}:${createTransformCacheKey(transformOptions)}`;
    const cachedCdnUrl = cdnDownloadUrlCache.get(cdnCacheKey);
    if (cachedCdnUrl && cachedCdnUrl.expiresAtMs > Date.now()) {
      return cachedCdnUrl.imageUrl;
    }

    const publicImageUrl = createPublicImageUrl(objectKey, transformOptions);
    if (publicImageUrl) {
      if (readImageCdnSigningSecret()) {
        cdnDownloadUrlCache.set(cdnCacheKey, {
          imageUrl: publicImageUrl,
          expiresAtMs: Date.now() + CDN_DOWNLOAD_CACHE_TTL_MS,
        });
      }

      return publicImageUrl;
    }

    const cachedSignedUrl = signedDownloadUrlCache.get(imageRef);
    if (cachedSignedUrl && cachedSignedUrl.expiresAtMs > Date.now()) {
      return cachedSignedUrl.imageUrl;
    }

    const config = requireB2Config();
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
    });

    const imageUrl = await profileSegment(
      'b2.signDownloadUrl',
      () =>
        getSignedUrl(getS3Client(), command, {
          expiresIn: SIGNED_DOWNLOAD_EXPIRES_SECONDS,
        }),
      {
        isB2ImageReference: true,
      },
    );

    signedDownloadUrlCache.set(imageRef, {
      imageUrl,
      expiresAtMs: Date.now() + SIGNED_DOWNLOAD_CACHE_TTL_MS,
    });

    return imageUrl;
  }

  async resolveImageResponse(
    imageRef: string | null,
    options?: ImageDownloadOptions,
  ): Promise<{ imageRef: string | null; imageUrl: string | null }> {
    return {
      imageRef,
      imageUrl: await this.createImageDownloadUrlFromRef(imageRef, options),
    };
  }

  async resolveImageListResponse(
    imageRefs: string[],
    options?: ImageDownloadOptions,
  ): Promise<{ imageRefs: string[]; imageUrl: string[] }> {
    const imageUrls = await profileSegment(
      'b2.resolveImageListResponse',
      () =>
        Promise.all(
          imageRefs.map((imageRef) => this.createImageDownloadUrlFromRef(imageRef, options)),
        ),
      {
        imageRefCount: imageRefs.length,
        variant: options?.variant ?? null,
      },
    );

    return {
      imageRefs,
      imageUrl: imageUrls.filter((imageUrl): imageUrl is string => typeof imageUrl === 'string'),
    };
  }
}

export const b2StorageService = new B2StorageService();
