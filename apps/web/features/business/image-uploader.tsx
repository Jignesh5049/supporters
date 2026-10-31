'use client';

import { type Media, MEDIA_LIMITS, type UploadPurpose } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { cn } from '@supporters/ui-web/lib/utils';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import { errorMessage } from '@/lib/api/errors';
import { UploadError, uploadImage } from './upload';

interface ImageUploaderProps {
  label: string;
  hint?: string;
  purpose: UploadPurpose;
  value: Media[];
  onChange: (images: Media[]) => void;
  max: number;
  /** A validation error from the form. */
  error?: string;
  /** Wide previews for covers, square for the rest. */
  aspect?: 'square' | 'wide';
}

const ACCEPT = MEDIA_LIMITS.imageTypes.join(',');

/** Pick, upload (presign, PUT, complete), reorder and remove images. */
export function ImageUploader({
  label,
  hint,
  purpose,
  value,
  onChange,
  max,
  error,
  aspect = 'square',
}: ImageUploaderProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const message = uploadError ?? error;
  const remaining = max - value.length;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const picked = Array.from(files).slice(0, Math.max(remaining, 0));
    if (files.length > picked.length) {
      setUploadError(`You can add up to ${max} image${max === 1 ? '' : 's'}.`);
    }
    setUploading(picked.length);
    let images = value;
    for (const file of picked) {
      try {
        const media = await uploadImage(file, purpose);
        images = max === 1 ? [media] : [...images, media];
        onChange(images);
      } catch (cause) {
        setUploadError(cause instanceof UploadError ? cause.message : errorMessage(cause));
      } finally {
        setUploading((count) => count - 1);
      }
    }
    if (input.current) input.current.value = '';
  }

  function move(index: number, by: -1 | 1) {
    const next = [...value];
    const [image] = next.splice(index, 1);
    if (!image) return;
    next.splice(index + by, 0, image);
    onChange(next);
  }

  return (
    <fieldset className="space-y-2" aria-describedby={message ? errorId : undefined}>
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}

      <ul className="flex flex-wrap gap-3">
        {value.map((image, index) => (
          <li
            key={image.id}
            className={cn(
              'relative overflow-hidden rounded-xl border border-border bg-muted',
              aspect === 'wide' ? 'h-24 w-48' : 'size-24',
            )}
          >
            <Image
              src={image.url}
              alt={`${label} ${index + 1}`}
              fill
              sizes="192px"
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-foreground/60 p-1">
              {max > 1 ? (
                <span className="flex gap-1">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="secondary"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move image ${index + 1} earlier`}
                  >
                    <ArrowLeft />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="secondary"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move image ${index + 1} later`}
                  >
                    <ArrowRight />
                  </Button>
                </span>
              ) : (
                <span />
              )}
              <Button
                type="button"
                size="icon-xs"
                variant="destructive"
                onClick={() => onChange(value.filter((other) => other.id !== image.id))}
                aria-label={`Remove image ${index + 1}`}
              >
                <X />
              </Button>
            </div>
          </li>
        ))}

        {(remaining > 0 || max === 1) && (
          <li>
            <label
              htmlFor={inputId}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-subtle text-caption font-semibold text-muted-foreground hover:border-primary hover:text-primary focus-within:ring-[3px] focus-within:ring-ring/50',
                aspect === 'wide' ? 'h-24 w-48' : 'size-24',
              )}
            >
              {uploading > 0 ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-5" aria-hidden />
              )}
              <span>
                {uploading > 0 ? 'Uploading…' : max === 1 && value.length ? 'Replace' : 'Add image'}
              </span>
              <input
                ref={input}
                id={inputId}
                type="file"
                accept={ACCEPT}
                multiple={max > 1}
                className="sr-only"
                disabled={uploading > 0}
                onChange={(event) => void handleFiles(event.target.files)}
              />
            </label>
          </li>
        )}
      </ul>

      <p id={errorId} role="alert" className="text-xs text-destructive empty:hidden">
        {message}
      </p>
    </fieldset>
  );
}
