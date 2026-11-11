import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import type { Review } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import { cn } from '@supporters/ui-native/lib/utils';
import { TEXT_LIMITS } from '@supporters/shared';
import { useApp } from '../../../context/AppContext';
import { messageForError } from '../../../lib/api';
import { FormField } from '../../hub/components/FormField';
import { useBusinessReviews, useMyReview, useReviewMutations } from '../hooks';
import {
  REVIEW_TEXT,
  eligibilityText,
  ratingText,
  reviewErrorMessage,
  toReviewInput,
} from '../review-form';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View
      className="flex-row gap-0.5"
      accessible
      accessibilityLabel={`${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          as={Star}
          size={size}
          className={value >= star - 0.25 ? 'fill-warning text-warning' : 'text-muted-foreground'}
        />
      ))}
    </View>
  );
}

interface ReviewsTabProps {
  businessId: string;
  mode: 'guest' | 'owner' | 'viewer';
}

/** The Reviews tab of a business page (product spec, Reviews and ratings). */
export function ReviewsTab({ businessId, mode }: ReviewsTabProps) {
  const reviews = useBusinessReviews(businessId);
  const first = reviews.data?.pages[0];
  const items = reviews.data?.pages.flatMap((page) => page.data) ?? [];
  const text = ratingText(first?.rating);

  if (reviews.isPending) return <ActivityIndicator className="my-8" />;
  if (reviews.isError) {
    return (
      <View className="items-center gap-3 p-8">
        <Text className="text-center">{messageForError(reviews.error)}</Text>
        <Button onPress={() => reviews.refetch()}>
          <Text>Try again</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="gap-4 p-4">
      <View className="bg-card border-border flex-row items-center gap-4 rounded-2xl border p-4">
        <Text className="text-3xl font-black">{text.value}</Text>
        <View className="gap-1">
          {first?.rating.average != null ? <Stars value={first.rating.average} /> : null}
          <Text variant="muted" className="text-sm">
            {first?.rating.average == null && (first?.rating.count ?? 0) > 0
              ? `${text.count}. An average shows from 3 reviews.`
              : text.count}
          </Text>
        </View>
      </View>

      {mode === 'viewer' ? <MyReviewPanel businessId={businessId} /> : null}
      {mode === 'guest' ? (
        <Button variant="outline" onPress={() => router.push('/sign-in')}>
          <Text>Sign in to review a business you have traded with</Text>
        </Button>
      ) : null}

      {items.length === 0 ? (
        <Text variant="muted" className="py-6 text-center text-sm">
          No reviews yet. Reviews from buyers who have traded with this business will show here.
        </Text>
      ) : (
        items.map((review) => (
          <ReviewItem
            key={review.id}
            review={review}
            businessId={businessId}
            isOwner={mode === 'owner'}
          />
        ))
      )}
      {reviews.hasNextPage ? (
        <Button
          variant="outline"
          disabled={reviews.isFetchingNextPage}
          onPress={() => reviews.fetchNextPage()}
        >
          <Text>More reviews</Text>
        </Button>
      ) : null}
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View className="flex-row gap-1" accessibilityRole="radiogroup" accessibilityLabel="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === star }}
          accessibilityLabel={`${star} ${star === 1 ? 'star' : 'stars'}`}
          className="size-11 items-center justify-center"
        >
          <Icon
            as={Star}
            size={28}
            className={star <= value ? 'fill-warning text-warning' : 'text-muted-foreground'}
          />
        </Pressable>
      ))}
    </View>
  );
}

function MyReviewPanel({ businessId }: { businessId: string }) {
  const mine = useMyReview(businessId, true);
  const [isEditing, setIsEditing] = useState(false);
  const { remove } = useReviewMutations(businessId);
  const { showToast } = useApp();
  if (mine.isPending || mine.isError) return null;
  const { review, eligibility, eligibleAt } = mine.data;

  if (review && !isEditing) {
    return (
      <View className="bg-card border-primary/30 gap-2 rounded-2xl border p-4">
        <Text className="text-primary text-xs font-semibold">Your review</Text>
        <Stars value={review.rating} />
        <Text className="text-sm">{review.body}</Text>
        {review.isHidden ? (
          <Text className="text-warning text-xs">Hidden by moderation. Only you can see it.</Text>
        ) : null}
        <View className="flex-row gap-2">
          <Button size="sm" variant="outline" onPress={() => setIsEditing(true)}>
            <Text>Edit</Text>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={remove.isPending}
            onPress={() =>
              Alert.alert('Delete your review?', 'It is removed from the business page.', [
                { text: 'Keep it', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () =>
                    remove.mutate(review.id, {
                      onSuccess: () => showToast('Review deleted', 'success'),
                      onError: (error) => showToast(messageForError(error), 'error'),
                    }),
                },
              ])
            }
          >
            <Text>Delete</Text>
          </Button>
        </View>
      </View>
    );
  }
  if (review || eligibility === 'eligible') {
    return (
      <ReviewForm businessId={businessId} existing={review} onDone={() => setIsEditing(false)} />
    );
  }
  const reason = eligibilityText(eligibility, eligibleAt);
  return reason ? (
    <Text variant="muted" className="text-sm">
      {reason}
    </Text>
  ) : null;
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
  const { showToast } = useApp();
  const { save } = useReviewMutations(businessId);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? '');
  const [errors, setErrors] = useState<Partial<Record<'rating' | 'body', string>>>({});

  const submit = () => {
    const result = toReviewInput({ rating, body });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    save.mutate(
      { reviewId: existing?.id ?? null, input: result.input },
      {
        onSuccess: () => {
          showToast(existing ? 'Review updated' : 'Thanks for your review', 'success');
          onDone();
        },
      },
    );
  };

  return (
    <View className="bg-card border-border gap-3 rounded-2xl border p-4">
      <Text className="text-base font-semibold">
        {existing ? 'Edit your review' : 'Write a review'}
      </Text>
      <FormField label="Rating" error={errors.rating}>
        <StarPicker value={rating} onChange={setRating} />
      </FormField>
      <FormField
        label="Your experience"
        hint={`${body.trim().length} / ${REVIEW_TEXT.max} (at least ${REVIEW_TEXT.min})`}
        error={errors.body}
      >
        <Textarea
          value={body}
          onChangeText={setBody}
          maxLength={REVIEW_TEXT.max}
          numberOfLines={4}
          accessibilityLabel="Your experience"
        />
      </FormField>
      {save.isError ? (
        <Text className="text-destructive text-sm" role="alert">
          {reviewErrorMessage(save.error)}
        </Text>
      ) : null}
      <View className="flex-row justify-end gap-2">
        {existing ? (
          <Button variant="outline" onPress={onDone}>
            <Text>Cancel</Text>
          </Button>
        ) : null}
        <Button onPress={submit} disabled={save.isPending}>
          <Text>{existing ? 'Save' : 'Post review'}</Text>
        </Button>
      </View>
    </View>
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
  const { showToast } = useApp();
  const { reply, removeReply } = useReviewMutations(businessId);
  const [isReplying, setIsReplying] = useState(false);
  const [draft, setDraft] = useState(review.ownerReply?.body ?? '');
  const isEdited = review.updatedAt !== review.createdAt;

  return (
    <View className="bg-card border-border gap-2 rounded-2xl border p-4">
      <View className="flex-row flex-wrap items-center gap-2">
        <Stars value={review.rating} />
        <Text className="text-sm font-semibold">{review.author.name}</Text>
        {review.isMine ? (
          <Badge variant="secondary">
            <Text>You</Text>
          </Badge>
        ) : null}
        <Text variant="muted" className="text-xs">
          {dateFormat.format(new Date(review.createdAt))}
          {isEdited ? ' · edited' : ''}
        </Text>
      </View>
      <Text className="text-sm">{review.body}</Text>

      {review.ownerReply && !isReplying ? (
        <View className="bg-muted border-primary gap-1 rounded-xl border-l-4 p-3">
          <Text className="text-xs font-semibold">Reply from the business</Text>
          <Text className="text-sm">{review.ownerReply.body}</Text>
        </View>
      ) : null}

      {isOwner && isReplying ? (
        <View className="gap-2">
          <Textarea
            value={draft}
            onChangeText={setDraft}
            maxLength={TEXT_LIMITS.reviewReply.max}
            numberOfLines={3}
            accessibilityLabel="Your public reply"
          />
          <View className="flex-row justify-end gap-2">
            <Button size="sm" variant="outline" onPress={() => setIsReplying(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              size="sm"
              disabled={reply.isPending || draft.trim().length === 0}
              onPress={() =>
                reply.mutate(
                  { id: review.id, body: draft.trim() },
                  {
                    onSuccess: () => setIsReplying(false),
                    onError: (error) => showToast(messageForError(error), 'error'),
                  },
                )
              }
            >
              <Text>Post reply</Text>
            </Button>
          </View>
        </View>
      ) : null}
      {isOwner && !isReplying ? (
        <View className={cn('flex-row gap-2')}>
          <Button size="sm" variant="outline" onPress={() => setIsReplying(true)}>
            <Text>{review.ownerReply ? 'Edit reply' : 'Reply'}</Text>
          </Button>
          {review.ownerReply ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={removeReply.isPending}
              onPress={() => removeReply.mutate(review.id)}
            >
              <Text>Remove reply</Text>
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
