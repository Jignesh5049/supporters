import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { PostType, TEXT_LIMITS, type Post } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';

interface EditPostModalProps {
  post: Post | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (changes: { body: string; offerTag?: string }) => void;
}

function EditForm({
  post,
  isSaving,
  error,
  onClose,
  onSave,
}: Omit<EditPostModalProps, 'post'> & { post: Post }) {
  const [body, setBody] = useState(post.body);
  const [offerTag, setOfferTag] = useState(post.offerTag ?? '');
  const isOffer = post.type === PostType.Offer;

  return (
    <View className="bg-background flex-1 justify-end bg-black/40">
      <View className="bg-background gap-3 rounded-t-2xl p-4">
        <Text className="text-base font-semibold">Edit post</Text>
        {isOffer ? (
          <Input
            value={offerTag}
            onChangeText={setOfferTag}
            maxLength={TEXT_LIMITS.offerTag.max}
            accessibilityLabel="Offer tag"
          />
        ) : null}
        <Textarea
          value={body}
          onChangeText={setBody}
          maxLength={TEXT_LIMITS.postBody.max}
          numberOfLines={6}
          accessibilityLabel="Post message"
        />
        {error ? (
          <Text className="text-destructive text-sm" role="alert">
            {error}
          </Text>
        ) : null}
        <View className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onPress={onClose} disabled={isSaving}>
            <Text>Cancel</Text>
          </Button>
          <Button
            className="flex-1"
            disabled={isSaving || (isOffer && offerTag.trim().length === 0)}
            onPress={() => onSave({ body, ...(isOffer ? { offerTag: offerTag.trim() } : {}) })}
          >
            <Text>{isSaving ? 'Saving' : 'Save'}</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

/** Edits the text of a post. Its photos, video and type are fixed once created. */
export function EditPostModal(props: EditPostModalProps) {
  return (
    <Modal
      visible={props.post !== null}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      {props.post ? <EditForm {...props} post={props.post} /> : null}
    </Modal>
  );
}
