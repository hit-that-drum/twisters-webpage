import { TextField } from '@mui/material';
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

type PreviewShape = 'square' | 'circle';

interface GlobalImageUploadProps {
  value: string[];
  onChange: (nextValue: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
  label?: string;
  helperText?: string;
  previewShape?: PreviewShape;
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
  return normalizedValue.startsWith('http://') || normalizedValue.startsWith('https://') || normalizedValue.startsWith('data:image/');
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
}: GlobalImageUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);
  const [isDragActive, setIsDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const applyIncomingImages = async (incomingFiles: File[]) => {
    if (disabled || incomingFiles.length === 0) {
      return;
    }

    const imageFiles = incomingFiles.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      return;
    }

    const convertedImages = await Promise.all(imageFiles.map((file) => readFileAsDataUrl(file)));
    onChange(mergeImages(valueRef.current, convertedImages, maxImages));
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
              Drag and drop image files here
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Click the button below or paste image URLs/files into this area.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed"
          >
            Select Images
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2">
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
        <button
          type="button"
          onClick={handleAddUrls}
          disabled={disabled}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
        >
          Add URL
        </button>
      </div>

      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}

      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((imageUrl, index) => (
            <div
              key={`${imageUrl}-${index}`}
              className={`overflow-hidden border border-slate-200 bg-white shadow-sm ${previewShapeClassName}`}
            >
              <div className="relative aspect-square bg-slate-100">
                <img
                  src={imageUrl}
                  alt={`Upload preview ${index + 1}`}
                  className={`h-full w-full object-cover ${previewShapeClassName}`}
                />
                <div className="absolute left-2 top-2 rounded-full bg-slate-900/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  {index === 0 ? 'Main' : `Image ${index + 1}`}
                </div>
              </div>
              <div className="flex gap-2 p-2">
                {index > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleMakeMainImage(index)}
                    className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Make Main
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
