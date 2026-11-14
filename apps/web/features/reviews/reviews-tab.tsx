'use client';

import { type Review, type ReviewsPage, TEXT_LIMITS } from '@supporters/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@supporters/ui-web/components/alert-dialog';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { cn } from '@supporters/ui-web/lib/utils';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquareReply, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { useApp } from '@/context/AppContext';
import { Field } from '@/features/business/field';
import { flattenPages } from '@/features/social/use-feed';
import { errorMessage } from '@/lib/api/errors';
import {
  type ReviewErrors,
  type ReviewFormValues,
  eligibilityText,
  ratingText,
  reviewErrorMessage,
  toReviewBody,
} from './review-form-values';
import { myReviewQueryOptions, reviewKeys, reviewsApi, reviewsQueryOptions } from './reviews-api';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

interface ReviewsTabProps {
  businessId: string;
  initialPage: ReviewsPage;
  mode: 'guest' | 'owner' | 'viewer';
  /** Where a guest returns after signing in. */
  returnTo: string;
}

/** The Reviews tab of a business page (product spec, Reviews and ratings). */
export function ReviewsTab({ businessId, initialPage, mode, returnTo }: ReviewsTabProps) {
  const query = useInfiniteQuery(reviewsQueryOptions(businessId, initialPage));
  const reviews = flattenPages(query.data);
  const rating = query.data?.pages[0]?.rating ?? initialPage.rating;
  const text = ratingText(rating);

  return (
    <div className="space-y-5">
      <section
        aria-label="Rating"
        className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs"
      >
        <p className="text-display font-black text-foreground">{text.value}</p>
        <div>
          {rating.average !== null && <Stars value={rating.average} />}
          <p className="text-body-sm text-muted-foreground">
            {rating.average === null && rating.count > 0
              ? `${text.count}. An average shows from 3 reviews.`
              : text.count}
          </p>
        </div>
      </section>

      {mode === 'viewer' && <MyReviewPanel businessId={businessId} />}
      {mode === 'guest' && (
        <p className="text-body-sm text-muted-foreground">
          <Link
            href={`/login?next=${encodeURIComponent(returnTo)}`}
            className="font-semibold text-primary underline"
          >
            Sign in
          </Link>{' '}
          to review a business you have traded with.
        </p>
      )}

      {reviews.length === 0 ? (
        <EmptyPanel
          icon={Star}
          title="No reviews yet"
          description="Reviews from buyers who have traded with this business will show here."
        />
      ) : (
        <ul className="space-y-3" aria-label="Reviews">
          {reviews.map((review) => (
            <li key={review.id}>
              <ReviewItem review={review} businessId={businessId} isOwner={mode === 'owner'} />
            </li>
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            More reviews
          </Button>
        </div>
      )}
    </div>
  );
}

/** Read-only stars, rounded to the nearest half for display. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
      className={cn('flex gap-0.5', className)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn(
            'size-4',
            value >= star - 0.25 ? 'fill-warning text-warning' : 'text-muted-foreground',
          )}
        />
      ))}
    </span>
  );
}

/** A 1 to 5 star picker: a radio group, so it works with the keyboard and screen readers. */
function StarPicker({
  value,
  onChange,
  describedBy,
}: {
  value: number;
  onChange: (value: number) => void;
  describedBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      aria-describedby={describedBy}
      className="flex gap-1"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
          onClick={() => onChange(star)}
          className="rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Star
            aria-hidden
            className={cn(
              'size-7',
              star <= value ? 'fill-warning text-warning' : 'text-muted-foreground',
            )}
          />
        </button>
      ))}
    </div>
  );
}

function MyReviewPanel({ businessId }: { businessId: string }) {
  const query = useQuery(myReviewQueryOptions(businessId));
  const [isEditing, setIsEditing] = useState(false);
  if (query.isPending) return <Skeleton className="h-24 w-full rounded-2xl" />;
  if (query.isError) return null;
  const { review, eligibility, eligibleAt } = query.data;
  if (review && !isEditing) {
    return (
      <div className="space-y-2 rounded-2xl border border-primary/30 bg-card p-4">
        <p className="text-caption font-semibold text-primary">Your review</p>
        <Stars value={review.rating} />
        <p className="text-body-sm whitespace-pre-line text-foreground">{review.body}</p>
        {review.isHidden && (
          <p className="text-caption text-warning">Hidden by moderation. Only you can see it.</p>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
          <DeleteReview businessId={businessId} reviewId={review.id} />
        </div>
      </div>
    );
  }
  if (review || eligibility === 'eligible') {
    return (
      <ReviewForm businessId={businessId} existing={review} onDone={() => setIsEditing(false)} />
    );
  }
  const reason = eligibilityText(eligibility, eligibleAt);
  return reason ? <p className="text-body-sm text-muted-foreground">{reason}</p> : null;
}

function ReviewForm({
  businessId,
  existing,
  onDone,
}: {
  businessId: string;
  existing: Review | null;
  onDone: () => void;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const { showToast } = useApp();
  const [values, setValues] = useState<ReviewFormValues>({
    rating: existing?.rating ?? 0,
    body: existing?.body ?? '',
  });
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: ReviewFormValues) =>
      existing ? reviewsApi.update(existing.id, body) : reviewsApi.create(businessId, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: reviewKeys.list(businessId) });
      void client.invalidateQueries({ queryKey: reviewKeys.mine(businessId) });
      showToast(existing ? 'Review updated.' : 'Thanks for your review.', 'success');
      // The header's rating and tab count are server-rendered.
      router.refresh();
      onDone();
    },
    onError: (error) => setFormError(reviewErrorMessage(error)),
  });

  return (
    <form
      noValidate
      className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs"
      onSubmit={(event) => {
        event.preventDefault();
        setFormError(null);
        const result = toReviewBody(values);
        if (!result.ok) {
          setErrors(result.errors);
          return;
        }
        save.mutate(result.body);
      }}
    >
      <p className="text-body font-semibold text-foreground">
        {existing ? 'Edit your review' : 'Write a review'}
      </p>
      <div className="space-y-1">
        <StarPicker
          value={values.rating}
          onChange={(rating) => {
            setValues((current) => ({ ...current, rating }));
            setErrors((current) => ({ ...current, rating: undefined }));
          }}
          {...(errors.rating ? { describedBy: 'review-rating-error' } : {})}
        />
        {errors.rating && (
          <p id="review-rating-error" className="text-caption text-destructive">
            {errors.rating}
          </p>
        )}
      </div>
      <Field
        label="Your experience"
        error={errors.body}
        hint={`${values.body.trim().length}/${TEXT_LIMITS.review.max}`}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={4}
            maxLength={TEXT_LIMITS.review.max}
            value={values.body}
            onChange={(event) => {
              setValues((current) => ({ ...current, body: event.target.value }));
              setErrors((current) => ({ ...current, body: undefined }));
            }}
          />
        )}
      </Field>
      {formError && (
        <p role="alert" className="text-body-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {existing && (
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {existing ? 'Save' : 'Post review'}
        </Button>
      </div>
    </form>
  );
}

function DeleteReview({ businessId, reviewId }: { businessId: string; reviewId: string }) {
  const client = useQueryClient();
  const router = useRouter();
  const { showToast } = useApp();
  const remove = useMutation({
    mutationFn: () => reviewsApi.remove(reviewId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: reviewKeys.list(businessId) });
      void client.invalidateQueries({ queryKey: reviewKeys.mine(businessId) });
      showToast('Review deleted.', 'success');
      router.refresh();
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" disabled={remove.isPending}>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your review?</AlertDialogTitle>
          <AlertDialogDescription>It is removed from the business page.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReviewItem({
  review,
  businessId,
  isOwner,
}: {
  review: Review;
  businessId: string;
  isOwner: boolean;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const isEdited = review.updatedAt !== review.createdAt;
  return (
    <article className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.rating} />
        <span className="font-semibold text-foreground">{review.author.name}</span>
        {review.isMine && <Badge variant="secondary">You</Badge>}
        <span className="text-caption text-muted-foreground">
          {dateFormat.format(new Date(review.createdAt))}
          {isEdited && ' · edited'}
        </span>
      </div>
      <p className="text-body-sm whitespace-pre-line text-foreground">{review.body}</p>

      {review.ownerReply && !isReplying && (
        <div className="space-y-1 rounded-xl border-l-4 border-primary bg-muted p-3">
          <p className="text-caption font-semibold text-foreground">Reply from the business</p>
          <p className="text-body-sm whitespace-pre-line text-foreground">
            {review.ownerReply.body}
          </p>
        </div>
      )}

      {isOwner &&
        (isReplying ? (
          <ReplyForm review={review} businessId={businessId} onDone={() => setIsReplying(false)} />
        ) : (
          <OwnerReplyActions
            review={review}
            businessId={businessId}
            onEdit={() => setIsReplying(true)}
          />
        ))}
    </article>
  );
}

function OwnerReplyActions({
  review,
  businessId,
  onEdit,
}: {
  review: Review;
  businessId: string;
  onEdit: () => void;
}) {
  const client = useQueryClient();
  const { showToast } = useApp();
  const remove = useMutation({
    mutationFn: () => reviewsApi.removeReply(review.id),
    onSuccess: () => void client.invalidateQueries({ queryKey: reviewKeys.list(businessId) }),
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={onEdit}>
        <MessageSquareReply aria-hidden />
        {review.ownerReply ? 'Edit reply' : 'Reply'}
      </Button>
      {review.ownerReply && (
        <Button
          size="sm"
          variant="ghost"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          Remove reply
        </Button>
      )}
    </div>
  );
}

function ReplyForm({
  review,
  businessId,
  onDone,
}: {
  review: Review;
  businessId: string;
  onDone: () => void;
}) {
  const client = useQueryClient();
  const [body, setBody] = useState(review.ownerReply?.body ?? '');
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => reviewsApi.reply(review.id, body.trim()),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: reviewKeys.list(businessId) });
      onDone();
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  return (
    <form
      noValidate
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (body.trim().length === 0) {
          setError('Write a reply.');
          return;
        }
        save.mutate();
      }}
    >
      <Field label="Your public reply" {...(error ? { error } : {})}>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            maxLength={TEXT_LIMITS.reviewReply.max}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setError(null);
            }}
          />
        )}
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={save.isPending}>
          Post reply
        </Button>
      </div>
    </form>
  );
}
