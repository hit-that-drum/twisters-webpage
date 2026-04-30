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
  const valueRef = useRef(value);
  const [isDragActive, setIsDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [previewUrlByValue, setPreviewUrlByValue] = useState<Record<string, string>>({});
  const activeUploadScope = import.meta.env.PROD ? uploadScope : undefined;

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
      const resolvedEntries = await Promise.all(
        unresolvedRefs.map(async (imageRef) => {
          try {
            return [imageRef, await createImageDownloadUrl(imageRef)] as const;
          } catch (error) {
            console.error('Image preview URL creation failed:', error);
            return [imageRef, null] as const;
          }
        }),
      );

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
    if (disabled || incomingFiles.length === 0) {
      return;
    }

    const imageFiles = incomingFiles.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }

    try {
      const convertedImages = activeUploadScope
        ? await Promise.all(
            imageFiles.map(async (file) => {
              const uploadedImage = await uploadImageFileToB2(file, activeUploadScope);
              const previewUrl = uploadedImage.imageUrl;
              if (previewUrl) {
                setPreviewUrlByValue((previous) => ({
                  ...previous,
                  [uploadedImage.imageRef]: previewUrl,
                }));
              }
              return uploadedImage.imageRef;
            }),
          )
        : await Promise.all(imageFiles.map((file) => readFileAsDataUrl(file)));
      onChange(mergeImages(valueRef.current, convertedImages, maxImages));
    } catch (error) {
      console.error('Image upload failed:', error);
      enqueueSnackbar('이미지 업로드 중 오류가 발생했습니다.', { variant: 'error' });
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
    if (disabled) {
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
    if (disabled) {
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

  const previewShapeClassName = previewShape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const previewCardShapeClassName = previewShape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const removeButtonPositionClassName =
    previewShape === 'circle' ? 'right-[12%] top-[12%]' : 'right-2 top-2';

  return (
    <div className="space-y-3">
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
        disabled={disabled}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
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
        className={`rounded-2xl border-2 border-dashed p-5 transition ${
          isDragActive
            ? 'border-blue-500 bg-blue-50/70'
            : 'border-slate-300 bg-slate-50/70 hover:border-slate-400'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
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
            disabled={disabled}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed"
          >
            이미지 선택하기
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
            disabled={disabled}
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <button
          type="button"
          onClick={handleAddUrls}
          disabled={disabled}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
        >
          URL 첨부
        </button>
      </div>

      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}

      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((imageUrl, index) => {
            const previewSrc = previewUrlByValue[imageUrl] ?? (isB2ImageReference(imageUrl) ? null : imageUrl);

            return (
            <div
              key={`${imageUrl}-${index}`}
              className={`relative overflow-hidden bg-white shadow-sm ${
                index === 0 ? 'border-[6px] border-yellow-400' : 'border border-slate-200'
              } ${previewCardShapeClassName}`}
            >
              <div className="relative aspect-square bg-slate-100">
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt={`Upload preview ${index + 1}`}
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
                  disabled={disabled}
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
                    disabled={disabled}
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
