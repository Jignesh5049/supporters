import { createPostSchema, PostStatus, PostType, type CreatePostInput } from '@supporters/shared';

export interface PostFormValues {
  type: PostType;
  body: string;
  offerTag: string;
  productId: string | null;
  serviceId: string | null;
  mediaIds: string[];
}

export const EMPTY_POST_FORM: PostFormValues = {
  type: PostType.Update,
  body: '',
  offerTag: '',
  productId: null,
  serviceId: null,
  mediaIds: [],
};

export type PostFormResult = { ok: true; input: CreatePostInput } | { ok: false; message: string };

/**
 * Builds the API body with the shared schema, so the app and the API apply the
 * same rules. Publishing needs at least one photo or a video; drafts do not.
 */
export function buildPostInput(values: PostFormValues, status: PostStatus): PostFormResult {
  if (status === PostStatus.Published && values.mediaIds.length === 0) {
    return { ok: false, message: 'Add at least one photo or a video to publish.' };
  }
  const result = createPostSchema.safeParse({
    type: values.type,
    body: values.body,
    offerTag: values.type === PostType.Offer ? values.offerTag || undefined : undefined,
    productId: values.type === PostType.Product ? (values.productId ?? undefined) : undefined,
    serviceId: values.type === PostType.Service ? (values.serviceId ?? undefined) : undefined,
    mediaIds: values.mediaIds,
    status,
  });
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message ?? 'Check the post.' };
  }
  return { ok: true, input: result.data };
}
