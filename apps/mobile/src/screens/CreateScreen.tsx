import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostStatus, PostType, TEXT_LIMITS } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Tabs, TabsList, TabsTrigger } from '@supporters/ui-native/components/tabs';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import { useApp } from '../context/AppContext';
import { ApiError, ApiErrorCode, messageForError } from '../lib/api';
import { useMyBusiness } from '../features/business/hooks';
import { ListingPicker } from '../features/hub/components/ListingPicker';
import { PostMediaPicker } from '../features/hub/components/PostMediaPicker';
import { useCreatePost } from '../features/hub/hooks/use-my-posts';
import { usePostMediaUploads } from '../features/hub/hooks/use-post-media-uploads';
import { buildPostInput, EMPTY_POST_FORM, type PostFormValues } from '../features/hub/post-form';
import { MEDIA_PROBLEM_MESSAGES, pickPostMedia } from '../features/hub/post-media';

const TYPES: { value: PostType; label: string }[] = [
  { value: PostType.Update, label: 'Update' },
  { value: PostType.Product, label: 'Product' },
  { value: PostType.Service, label: 'Service' },
  { value: PostType.Offer, label: 'Offer' },
  { value: PostType.Testimonial, label: 'Testimonial' },
];

/** Only business pages post (product spec, Decisions 1): this is the Hub composer. */
export function CreateScreen() {
  const { showToast } = useApp();
  const myBusiness = useMyBusiness();
  const createPost = useCreatePost();
  const media = usePostMediaUploads();
  const [values, setValues] = useState<PostFormValues>(EMPTY_POST_FORM);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handlePick = async (kind: 'image' | 'video') => {
    setError(null);
    const result = await pickPostMedia(
      kind,
      media.uploads.map((u) => u.media),
    );
    if (!result.ok) {
      setError(
        result.problem === 'permission'
          ? 'Allow photo access in Settings to attach media.'
          : MEDIA_PROBLEM_MESSAGES[result.problem],
      );
      return;
    }
    media.add(result.media);
  };

  const handleSave = (status: PostStatus) => {
    setError(null);
    if (media.isUploading) {
      setError('Wait for the uploads to finish.');
      return;
    }
    if (media.hasFailed) {
      setError('Retry or remove the files that failed to upload.');
      return;
    }
    const built = buildPostInput({ ...values, mediaIds: media.mediaIds }, status);
    if (!built.ok) {
      setError(built.message);
      return;
    }
    createPost.mutate(built.input, {
      onSuccess: () => {
        showToast(status === PostStatus.Published ? 'Post published' : 'Draft saved', 'success');
        media.reset();
        setValues(EMPTY_POST_FORM);
        router.replace('/hub/posts');
      },
      onError: (e) => setError(messageForError(e)),
    });
  };

  if (myBusiness.isPending) return <SafeAreaView className="bg-background flex-1" />;
  if (myBusiness.error instanceof ApiError && myBusiness.error.code === ApiErrorCode.NotFound) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center gap-3 p-8">
        <Text className="text-center text-base font-semibold">Only business pages can post</Text>
        <Text variant="muted" className="text-center">
          Create your business page to share updates, products and offers.
        </Text>
        <Button onPress={() => router.replace('/hub')}>
          <Text>Create your business</Text>
        </Button>
      </SafeAreaView>
    );
  }

  const isBusy = createPost.isPending || media.isUploading;
  const isOffer = values.type === PostType.Offer;

  return (
    <SafeAreaView className="bg-background flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="border-border flex-row items-center gap-2 border-b px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Icon as={ArrowLeft} size={20} />
          </Button>
          <Text className="text-base font-semibold">New post</Text>
        </View>

        <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
          <Tabs value={values.type} onValueChange={(v) => set('type', v as PostType)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TabsList>
                {TYPES.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    <Text>{t.label}</Text>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollView>
          </Tabs>

          {isOffer ? (
            <View className="gap-1">
              <Text className="text-sm font-medium">Offer tag</Text>
              <Input
                value={values.offerTag}
                onChangeText={(text) => set('offerTag', text)}
                placeholder="20% off"
                maxLength={TEXT_LIMITS.offerTag.max}
                accessibilityLabel="Offer tag"
              />
            </View>
          ) : null}

          <View className="gap-1">
            <Text className="text-sm font-medium">Message</Text>
            <Textarea
              value={values.body}
              onChangeText={(text) => set('body', text)}
              placeholder="Share an update with your followers"
              maxLength={TEXT_LIMITS.postBody.max}
              numberOfLines={5}
              accessibilityLabel="Post message"
            />
            <Text variant="muted" className="text-right text-xs">
              {values.body.length}/{TEXT_LIMITS.postBody.max}
            </Text>
          </View>

          {values.type === PostType.Product ? (
            <ListingPicker
              kind="product"
              selectedId={values.productId}
              onSelect={(id) => set('productId', id)}
            />
          ) : null}
          {values.type === PostType.Service ? (
            <ListingPicker
              kind="service"
              selectedId={values.serviceId}
              onSelect={(id) => set('serviceId', id)}
            />
          ) : null}

          <PostMediaPicker
            uploads={media.uploads}
            onAddPhotos={() => handlePick('image')}
            onAddVideo={() => handlePick('video')}
            onRemove={media.remove}
            onRetry={media.retry}
          />

          {error ? (
            <Text className="text-destructive text-sm" role="alert">
              {error}
            </Text>
          ) : null}

          <View className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={isBusy}
              onPress={() => handleSave(PostStatus.Draft)}
            >
              <Text>Save draft</Text>
            </Button>
            <Button
              className="flex-1"
              disabled={isBusy}
              onPress={() => handleSave(PostStatus.Published)}
            >
              <Text>{createPost.isPending ? 'Publishing' : 'Publish'}</Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
