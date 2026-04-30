import { TextField } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import {
  createImageDownloadUrl,
  isB2ImageReference,
  type ImageUploadScope,
  uploadImageFileToB2,
} from '@/common/lib/images/b2ImageStorage';

type PreviewShape = 'square' | 'circle';

interface GlobalImageUploadProps {
  value: string[];
  onChange: (nextValue: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
  label?: string;
  helperText?: string;
  previewShape?: PreviewShape;
  uploadScope?: ImageUploadScope;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('이미지 파일을 읽지 못했습니다.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('이미지 파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });

const normalizeUrlsFromText = (rawValue: string) =>
  rawValue
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const isSupportedImageSource = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();
  return (
    normalizedValue.startsWith('http://') ||
    normalizedValue.startsWith('https://') ||
    normalizedValue.startsWith('data:image/') ||
    normalizedValue.startsWith('b2://')
  );
};

const mergeImages = (existingImages: string[], incomingImages: string[], maxImages: number) => {
  if (maxImages <= 1) {
    return incomingImages.length > 0 ? [incomingImages[0]] : existingImages.slice(0, 1);
  }

  const nextImages = [...existingImages];

  incomingImages.forEach((image) => {
    if (!nextImages.includes(image)) {
      nextImages.push(image);
    }
  });

  return nextImages.slice(0, maxImages);
};

const getUploadCandidates = (existingImages: string[], incomingFiles: File[], maxImages: number) => {
  if (maxImages <= 1) {
    return incomingFiles.slice(0, 1);
  }

  const availableSlots = Math.max(maxImages - existingImages.length, 0);
  return incomingFiles.slice(0, availableSlots);
};

const reorderImages = (images: string[], fromIndex: number, toIndex: number) => {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= images.length ||
    toIndex >= images.length
  ) {
    return images;
  }

  const nextImages = [...images];
  const [selectedImage] = nextImages.splice(fromIndex, 1);
  nextImages.splice(toIndex, 0, selectedImage);
  return nextImages;
};

export default function GlobalImageUpload({
  value,
  onChange,
  disabled = false,
  maxImages = 10,
  label = 'IMAGES',
  helperText,
  previewShape = 'square',
  uploadScope,
}: GlobalImageUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isUploadingImagesRef = useRef(false);
  const valueRef = useRef(value);
  const [isDragActive, setIsDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [previewUrlByValue, setPreviewUrlByValue] = useState<Record<string, string>>({});
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const activeUploadScope = import.meta.env.PROD ? uploadScope : undefined;
  const isUploadDisabled = disabled || isUploadingImages;
  const canReorderImages = !isUploadDisabled && value.length > 1;

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const b2ImageRefs = value.filter((imageRef) => isB2ImageReference(imageRef));
    const unresolvedRefs = b2ImageRefs.filter((imageRef) => !previewUrlByValue[imageRef]);
    if (unresolvedRefs.length === 0) {
      return;
    }

    let isCancelled = false;

    const resolvePreviewUrls = async () => {
      const resolvedEntries: Array<readonly [string, string | null]> = [];

      for (const imageRef of unresolvedRefs) {
        if (isCancelled) {
          return;
        }

        try {
          resolvedEntries.push([imageRef, await createImageDownloadUrl(imageRef)] as const);
        } catch (error) {
          console.error('Image preview URL creation failed:', error);
          resolvedEntries.push([imageRef, null] as const);
        }
      }

      if (isCancelled) {
        return;
      }

      setPreviewUrlByValue((previous) => {
        const nextPreviewUrls = { ...previous };
        resolvedEntries.forEach(([imageRef, imageUrl]) => {
          if (imageUrl) {
            nextPreviewUrls[imageRef] = imageUrl;
          }
        });
        return nextPreviewUrls;
      });
    };

    void resolvePreviewUrls();

    return () => {
      isCancelled = true;
    };
  }, [previewUrlByValue, value]);

  const applyIncomingImages = async (incomingFiles: File[]) => {
    if (disabled || isUploadingImagesRef.current || incomingFiles.length === 0) {
      return;
    }

    const imageFiles = incomingFiles.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }

    const uploadCandidates = getUploadCandidates(valueRef.current, imageFiles, maxImages);
    if (uploadCandidates.length === 0) {
      enqueueSnackbar(`이미지는 최대 ${maxImages}개까지 등록할 수 있습니다.`, { variant: 'info' });
      return;
    }

    if (uploadCandidates.length < imageFiles.length) {
      enqueueSnackbar(`최대 ${maxImages}개까지만 등록할 수 있어 일부 이미지만 처리합니다.`, {
        variant: 'info',
      });
    }

    let failedUploadCount = 0;
    isUploadingImagesRef.current = true;
    setIsUploadingImages(true);

    try {
      let nextImages = valueRef.current;

      for (const file of uploadCandidates) {
        try {
          let convertedImage: string;

          if (activeUploadScope) {
            const uploadedImage = await uploadImageFileToB2(file, activeUploadScope);
            const previewUrl = uploadedImage.imageUrl;
            if (previewUrl) {
              setPreviewUrlByValue((previous) => ({
                ...previous,
                [uploadedImage.imageRef]: previewUrl,
              }));
            }

            convertedImage = uploadedImage.imageRef;
          } else {
            convertedImage = await readFileAsDataUrl(file);
          }

          nextImages = mergeImages(nextImages, [convertedImage], maxImages);
          valueRef.current = nextImages;
          onChange(nextImages);
        } catch (error) {
          failedUploadCount += 1;
          console.error(`Image upload failed: ${file.name}`, error);
        }
      }
    } finally {
      isUploadingImagesRef.current = false;
      setIsUploadingImages(false);
    }

    if (failedUploadCount === uploadCandidates.length) {
      enqueueSnackbar('이미지 업로드 중 오류가 발생했습니다.', { variant: 'error' });
      return;
    }

    if (failedUploadCount > 0) {
      enqueueSnackbar(`${failedUploadCount}개 이미지를 업로드하지 못했습니다.`, {
        variant: 'warning',
      });
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? [...event.target.files] : [];
    await applyIncomingImages(files);
    event.target.value = '';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);

    await applyIncomingImages([...event.dataTransfer.files]);
  };

  const handleAddUrls = () => {
    if (isUploadDisabled) {
      return;
    }

    const parsedUrls = normalizeUrlsFromText(urlInput).filter(isSupportedImageSource);
    if (parsedUrls.length === 0) {
      return;
    }

    onChange(mergeImages(valueRef.current, parsedUrls, maxImages));
    setUrlInput('');
  };

  const handleUrlInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    handleAddUrls();
  };

  const handlePaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    if (isUploadDisabled) {
      return;
    }

    const clipboardFiles = [...event.clipboardData.files].filter((file) =>
      file.type.startsWith('image/'),
    );
    if (clipboardFiles.length > 0) {
      event.preventDefault();
      await applyIncomingImages(clipboardFiles);
      return;
    }

    const pastedText = event.clipboardData.getData('text');
    const parsedUrls = normalizeUrlsFromText(pastedText).filter(isSupportedImageSource);
    if (parsedUrls.length === 0) {
      return;
    }

    event.preventDefault();
    onChange(mergeImages(valueRef.current, parsedUrls, maxImages));
  };

  const handleRemoveImage = (index: number) => {
    onChange(value.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleMakeMainImage = (index: number) => {
    if (index <= 0 || index >= value.length) {
      return;
    }

    const nextImages = [...value];
    const [selectedImage] = nextImages.splice(index, 1);
    nextImages.unshift(selectedImage);
    onChange(nextImages);
  };

  const resetImageDragState = () => {
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  };

  const handleImageDragStart = (event: DragEvent<HTMLDivElement>, index: number) => {
    if (!canReorderImages) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-twisters-image-index', String(index));
    event.dataTransfer.setData('text/plain', String(index));
    setDraggedImageIndex(index);
    setDragOverImageIndex(index);
  };

  const handleImageDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    if (!canReorderImages || draggedImageIndex === null) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverImageIndex(index);
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>, index: number) => {
    if (!canReorderImages) {
      return;
    }

    event.preventDefault();
    const fallbackIndex = Number.parseInt(
      event.dataTransfer.getData('application/x-twisters-image-index') ||
        event.dataTransfer.getData('text/plain'),
      10,
    );
    const fromIndex = draggedImageIndex ?? fallbackIndex;
    resetImageDragState();

    if (!Number.isInteger(fromIndex)) {
      return;
    }

    const nextImages = reorderImages(valueRef.current, fromIndex, index);
    if (nextImages === valueRef.current) {
      return;
    }

    valueRef.current = nextImages;
    onChange(nextImages);
  };

  const previewShapeClassName = previewShape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const previewCardShapeClassName = previewShape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const removeButtonPositionClassName =
    previewShape === 'circle' ? 'right-[12%] top-[12%]' : 'right-2 top-2';

  return (
    <div className="relative space-y-3" aria-busy={isUploadingImages}>
      {isUploadingImages ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          onClick={(event) => event.preventDefault()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => event.preventDefault()}
        >
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-lg">
            <span
              className="inline-block size-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
              aria-hidden="true"
            />
            이미지 업로드 중...
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-bold tracking-wide text-slate-700">
          {label}
        </label>
        <span className="text-xs font-medium text-slate-400">
          {value.length}/{maxImages}
        </span>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple={maxImages > 1}
        className="hidden"
        onChange={(event) => {
          void handleFileInputChange(event);
        }}
        disabled={isUploadDisabled}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!isUploadDisabled) {
            setIsDragActive(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragActive(false);
        }}
        onDrop={(event) => {
          void handleDrop(event);
        }}
        onPaste={(event) => {
          void handlePaste(event);
        }}
        aria-disabled={isUploadDisabled}
        className={`relative rounded-2xl border-2 border-dashed p-5 transition ${
          isDragActive
            ? 'border-blue-500 bg-blue-50/70'
            : isUploadDisabled
              ? 'border-slate-300 bg-slate-50/70'
              : 'border-slate-300 bg-slate-50/70 hover:border-slate-400'
        } ${isUploadDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-3xl" aria-hidden="true">
            🖼
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              이미지 파일을 여기에 드래그 & 드롭 해주세요
            </p>
            <p className="mt-1 text-xs text-slate-500">
              또는 이미지 선택하기 버튼을 누르거나 이미지 주소를 복사하고 등록해주세요
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadDisabled}
            className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed"
          >
            {isUploadingImages ? (
              <span
                className="inline-block size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            ) : null}
            {isUploadingImages ? '이미지 업로드 중...' : '이미지 선택하기'}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <div className="flex-[3]">
          <TextField
            fullWidth
            size="small"
            label="Paste image URL"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            onKeyDown={handleUrlInputKeyDown}
            disabled={isUploadDisabled}
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <button
          type="button"
          onClick={handleAddUrls}
          disabled={isUploadDisabled}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
        >
          URL 첨부
        </button>
      </div>

      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      {canReorderImages ? (
        <p className="text-xs font-medium text-slate-500">
          사진을 드래그해서 순서를 변경할 수 있습니다.
        </p>
      ) : null}

      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((imageUrl, index) => {
            const previewSrc =
              previewUrlByValue[imageUrl] ?? (isB2ImageReference(imageUrl) ? null : imageUrl);
            const isDraggedImage = draggedImageIndex === index;
            const isDragTargetImage =
              dragOverImageIndex === index &&
              draggedImageIndex !== null &&
              draggedImageIndex !== index;

            return (
              <div
                key={`${imageUrl}-${index}`}
                draggable={canReorderImages}
                onDragStart={(event) => handleImageDragStart(event, index)}
                onDragOver={(event) => handleImageDragOver(event, index)}
                onDrop={(event) => handleImageDrop(event, index)}
                onDragEnd={resetImageDragState}
                aria-label={`Upload preview ${index + 1}`}
                className={`relative overflow-hidden bg-white shadow-sm transition ${
                  index === 0 ? 'border-[6px] border-yellow-400' : 'border border-slate-200'
                } ${previewCardShapeClassName} ${
                  canReorderImages ? 'cursor-grab active:cursor-grabbing' : ''
                } ${isDraggedImage ? 'scale-[0.98] opacity-50' : ''} ${
                  isDragTargetImage ? 'ring-4 ring-blue-300 ring-offset-2' : ''
                }`}
              >
                <div className="relative aspect-square bg-slate-100">
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt={`Upload preview ${index + 1}`}
                      draggable={false}
                      className={`h-full w-full object-cover ${previewShapeClassName}`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                      Loading...
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    disabled={isUploadDisabled}
                    draggable={false}
                    aria-label={`Remove upload preview ${index + 1}`}
                    className={`absolute flex size-7 items-center justify-center rounded-full bg-slate-950/80 text-sm font-bold leading-none text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 ${removeButtonPositionClassName}`}
                  >
                    ×
                  </button>
                </div>
                {index > 0 ? (
                  <div className="flex gap-2 p-2">
                    <button
                      type="button"
                      onClick={() => handleMakeMainImage(index)}
                      disabled={isUploadDisabled}
                      draggable={false}
                      className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Make Main
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
