'use client';

import {
  MEDIA_LIMITS,
  PostType,
  TEXT_LIMITS,
  type PostStatus,
  type PostType as PostTypeValue,
} from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useMutation } from '@tanstack/react-query';
import { Film, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { FormError } from '@/features/auth/form-field';
import { Field, FormSection } from '@/features/business/field';
import { ImageUploader } from '@/features/business/image-uploader';
import { UploadError, uploadImage } from '@/features/business/upload';
import { useHydrated } from '@/features/business/use-hydrated';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api/errors';
import { createPost, updatePost } from './hub-posts-api';
import { PostLimitNotice } from './post-limit-notice';
import {
  type FormIssue,
  type PostFormValues,
  type PostLimit,
  isPostLimitReached,
  toCreateInput,
  toUpdateInput,
} from './post-form-values';
import { POST_TYPE_LABELS } from './post-mappers';

export interface AttachableListing {
  kind: 'product' | 'service';
  id: string;
  title: string;
}

interface PostFormProps {
  /** Null when creating. */
  postId: string | null;
  initialValues: PostFormValues;
  /** The owner's published products and services, for the attached card. */
  listings: AttachableListing[];
  limit: PostLimit;
}

const POST_TYPES = Object.values(PostType) as PostTypeValue[];

export function PostForm({ postId, initialValues, listings, limit }: PostFormProps) {
  const router = useRouter();
  const isHydrated = useHydrated();
  const { showToast } = useApp();
  const [values, setValues] = useState(initialValues);
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const wasPublished = initialValues.status !== 'draft';
  const set = <K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const issue = (path: string) => issues.find((item) => item.path === path)?.message;
  const isEditing = postId !== null;

  const save = useMutation({
    mutationFn: async () => {
      if (!postId) {
        const input = toCreateInput(values);
        if (!input.ok) return input;
        await createPost(input.data);
      } else {
        const input = toUpdateInput(values);
        if (!input.ok) return input;
        await updatePost(postId, input.data);
      }
      return null;
    },
    onSuccess: (invalid) => {
      if (invalid) {
        setIssues(invalid.issues);
        return;
      }
      showToast(isEditing ? 'Your post is saved.' : 'Your post is created.', 'success');
      router.push('/business/posts');
      router.refresh();
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const blockedByLimit =
    values.status === 'published' && !wasPublished && isPostLimitReached(limit);
  const isOffer = values.type === 'offer';
  const hasVideo = values.media.some((item) => item.kind === 'video');
  const attachable = listings.filter(
    (listing) =>
      (values.type !== 'product' || listing.kind === 'product') &&
      (values.type !== 'service' || listing.kind === 'service'),
  );

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setIssues([]);
        setFormError(null);
        save.mutate();
      }}
    >
      <FormSection title="Post">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" error={issue('type')}>
            {(control) => (
              <NativeSelect
                {...control}
                value={values.type}
                disabled={isEditing}
                onChange={(event) => set('type', event.target.value as PostTypeValue)}
              >
                {POST_TYPES.map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {POST_TYPE_LABELS[type]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field
            label="Attached product or service (optional)"
            error={issue('productId') ?? issue('serviceId')}
          >
            {(control) => (
              <NativeSelect
                {...control}
                value={values.attachment}
                onChange={(event) => set('attachment', event.target.value)}
              >
                <NativeSelectOption value="">None</NativeSelectOption>
                {attachable.map((listing) => (
                  <NativeSelectOption key={listing.id} value={`${listing.kind}:${listing.id}`}>
                    {listing.title} ({listing.kind})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field
            label="Text"
            hint={`Up to ${TEXT_LIMITS.postBody.max.toLocaleString('en-IN')} characters`}
            error={issue('body')}
            className="space-y-1.5 sm:col-span-2"
          >
            {(control) => (
              <Textarea
                {...control}
                rows={6}
                value={values.body}
                maxLength={TEXT_LIMITS.postBody.max}
                onChange={(event) => set('body', event.target.value)}
              />
            )}
          </Field>
          {isOffer && (
            <>
              <Field label="Offer tag" hint='For example "20% off"' error={issue('offerTag')}>
                {(control) => (
                  <Input
                    {...control}
                    value={values.offerTag}
                    maxLength={TEXT_LIMITS.offerTag.max}
                    onChange={(event) => set('offerTag', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Offer ends (optional, India time)" error={issue('offerEndsAt')}>
                {(control) => (
                  <Input
                    {...control}
                    type="datetime-local"
                    value={values.offerEndsAt}
                    onChange={(event) => set('offerEndsAt', event.target.value)}
                  />
                )}
              </Field>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Media">
        {hasVideo ? (
          <VideoPicker
            value={values.media[0]!.url}
            onRemove={() => set('media', [])}
            error={issue('mediaIds')}
          />
        ) : (
          <>
            <ImageUploader
              label="Images"
              hint={`Up to ${MEDIA_LIMITS.imagesPerPost.max}. A published post needs at least one image or a video.`}
              purpose="post"
              max={MEDIA_LIMITS.imagesPerPost.max}
              value={values.media}
              onChange={(images) =>
                set(
                  'media',
                  images.map((image) => ({ ...image, kind: 'image' as const })),
                )
              }
              error={issue('mediaIds')}
            />
            {values.media.length === 0 && (
              <VideoPicker
                value={null}
                onUploaded={(media) => set('media', [{ ...media, kind: 'video' }])}
              />
            )}
          </>
        )}
      </FormSection>

      <FormSection title="Visibility">
        <Field
          label="Status"
          hint="Only published posts show in feeds and on your page."
          error={issue('status')}
        >
          {(control) => (
            <NativeSelect
              {...control}
              value={values.status}
              onChange={(event) => set('status', event.target.value as PostStatus)}
            >
              <NativeSelectOption value="draft">Draft</NativeSelectOption>
              <NativeSelectOption value="published">Published</NativeSelectOption>
              {isEditing && <NativeSelectOption value="archived">Archived</NativeSelectOption>}
            </NativeSelect>
          )}
        </Field>
        {blockedByLimit && <PostLimitNotice limit={limit} />}
      </FormSection>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <FormError message={formError} />
        <Button type="button" variant="outline" onClick={() => router.push('/business/posts')}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isHydrated || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save post'}
        </Button>
      </div>
    </form>
  );
}

interface VideoPickerProps {
  value: string | null;
  onUploaded?: (media: { id: string; url: string }) => void;
  onRemove?: () => void;
  error?: string | undefined;
}

/** One MP4 (up to 100 MB): presign, PUT, complete, like images. */
function VideoPicker({ value, onUploaded, onRemove, error }: VideoPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [isUploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (!(MEDIA_LIMITS.videoTypes as readonly string[]).includes(file.type)) {
      setUploadError('Use an MP4 video.');
      return;
    }
    setUploading(true);
    try {
      onUploaded?.(await uploadImage(file, 'post'));
    } catch (cause) {
      setUploadError(cause instanceof UploadError ? cause.message : errorMessage(cause));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  if (value) {
    return (
      <div className="space-y-2">
        <video src={value} controls className="max-h-64 rounded-xl border border-border" />
        <Button type="button" variant="outline" size="sm" onClick={onRemove}>
          <X aria-hidden />
          Remove video
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => input.current?.click()}
      >
        {isUploading ? <Loader2 className="animate-spin" aria-hidden /> : <Film aria-hidden />}
        Or add one video (MP4, up to {MEDIA_LIMITS.videoMaxBytes / 1024 / 1024} MB)
      </Button>
      <input
        ref={input}
        type="file"
        accept={MEDIA_LIMITS.videoTypes.join(',')}
        className="sr-only"
        aria-label="Video file"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {(uploadError ?? error) && <p className="text-xs text-destructive">{uploadError ?? error}</p>}
    </div>
  );
}
