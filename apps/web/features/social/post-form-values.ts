import {
  type CreatePostInput,
  type Media,
  type Post,
  type PostStatus,
  type PostType,
  type UpdatePostInput,
  PLAN_LIMITS,
  createPostSchema,
  postShapeIssues,
  updatePostSchema,
} from '@supporters/shared';

/** What the Hub post form edits. Plain strings, so inputs stay controlled. */
export interface PostFormValues {
  type: PostType;
  body: string;
  offerTag: string;
  /** `datetime-local` value (`2026-11-10T18:00`), read as India time. */
  offerEndsAt: string;
  /** `product:<id>`, `service:<id>` or empty. */
  attachment: string;
  media: (Media & { kind: 'image' | 'video' })[];
  status: PostStatus;
}

export const EMPTY_POST_FORM: PostFormValues = {
  type: 'update',
  body: '',
  offerTag: '',
  offerEndsAt: '',
  attachment: '',
  media: [],
  status: 'published',
};

export interface FormIssue {
  path: string;
  message: string;
}

export type FormResult<T> = { ok: true; data: T } | { ok: false; issues: FormIssue[] };

const IST_OFFSET = '+05:30';

/** `2026-11-10T18:00` typed in the form to an ISO instant, or null when empty or invalid. */
export function localToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00${IST_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** An ISO instant back to the form's India-time `datetime-local` value. */
export function isoToLocal(iso: string | null): string {
  if (!iso) return '';
  const shifted = new Date(new Date(iso).getTime() + 5.5 * 3_600_000);
  return shifted.toISOString().slice(0, 16);
}

export function parseAttachment(value: string): { productId?: string; serviceId?: string } {
  const [kind, id] = value.split(':');
  if (!id) return {};
  return kind === 'product' ? { productId: id } : kind === 'service' ? { serviceId: id } : {};
}

export function postToFormValues(post: Post): PostFormValues {
  return {
    type: post.type,
    body: post.body,
    offerTag: post.offerTag ?? '',
    offerEndsAt: isoToLocal(post.offerEndsAt),
    attachment: post.attachment ? `${post.attachment.type}:${post.attachment.id}` : '',
    media: post.media.map(({ id, url, kind }) => ({ id, url, kind })),
    status: post.status,
  };
}

function issuesFrom(error: { issues: readonly { path: PropertyKey[]; message: string }[] }) {
  return error.issues.map((issue) => ({
    path: String(issue.path[0] ?? ''),
    message: issue.message,
  }));
}

/** Rules the schema leaves to the form: a published post needs media and a valid end date. */
function extraIssues(values: PostFormValues, mediaIds: string[]): FormIssue[] {
  const issues: FormIssue[] = [];
  if (values.status === 'published' && mediaIds.length === 0) {
    issues.push({ path: 'mediaIds', message: 'Add at least one image or a video to publish' });
  }
  if (values.offerEndsAt && localToIso(values.offerEndsAt) === null) {
    issues.push({ path: 'offerEndsAt', message: 'Enter a valid end date' });
  }
  const media = new Set(values.media.map((item) => item.kind));
  if (media.size > 1) {
    issues.push({ path: 'mediaIds', message: 'Use images or one video, not both' });
  }
  return issues;
}

/** The body for `POST /v1/me/business/posts`, checked with the shared schema. */
export function toCreateInput(values: PostFormValues): FormResult<CreatePostInput> {
  const mediaIds = values.media.map((item) => item.id);
  const parsed = createPostSchema.safeParse({
    type: values.type,
    body: values.body,
    offerTag: values.type === 'offer' && values.offerTag.trim() ? values.offerTag : undefined,
    offerEndsAt:
      values.type === 'offer' ? (localToIso(values.offerEndsAt) ?? undefined) : undefined,
    ...parseAttachment(values.attachment),
    mediaIds,
    status: values.status,
  });
  const issues = [
    ...extraIssues(values, mediaIds),
    ...(parsed.success ? [] : issuesFrom(parsed.error)),
  ];
  return issues.length === 0 && parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, issues };
}

/** The body for `PATCH`: every editable field, with `null` clearing the optional ones. */
export function toUpdateInput(values: PostFormValues): FormResult<UpdatePostInput> {
  const mediaIds = values.media.map((item) => item.id);
  const attachment = parseAttachment(values.attachment);
  const isOffer = values.type === 'offer';
  const input = {
    body: values.body,
    offerTag: isOffer && values.offerTag.trim() ? values.offerTag : null,
    offerEndsAt: isOffer ? localToIso(values.offerEndsAt) : null,
    productId: attachment.productId ?? null,
    serviceId: attachment.serviceId ?? null,
    mediaIds,
    status: values.status,
  };
  const parsed = updatePostSchema.safeParse(input);
  const issues = [
    ...extraIssues(values, mediaIds),
    ...postShapeIssues({ type: values.type, ...input }),
    ...(parsed.success ? [] : issuesFrom(parsed.error)),
  ];
  return issues.length === 0 && parsed.success
    ? { ok: true, data: parsed.data }
    : { ok: false, issues };
}

const WEEK_MS = 7 * 24 * 3_600_000;

/**
 * Posts first published in the last 7 days, as the owner's list shows them.
 * The API counts deleted posts too, so this can under-count; the API still
 * decides (409 `POST_LIMIT_REACHED`).
 */
export function publishedThisWeek(posts: Pick<Post, 'publishedAt'>[], now = new Date()): number {
  return posts.filter(
    (post) =>
      post.publishedAt !== null && now.getTime() - new Date(post.publishedAt).getTime() < WEEK_MS,
  ).length;
}

export interface PostLimit {
  used: number;
  /** Null on Premium. */
  limit: number | null;
}

export function toPostLimit(posts: Pick<Post, 'publishedAt'>[], isPremium: boolean, now?: Date) {
  return {
    used: publishedThisWeek(posts, now),
    limit: isPremium ? null : PLAN_LIMITS.free.postsPer7Days,
  } satisfies PostLimit;
}

export const isPostLimitReached = ({ used, limit }: PostLimit) => limit !== null && used >= limit;
