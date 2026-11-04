import React, { useState } from 'react';
import { View } from 'react-native';
import { Send, X } from 'lucide-react-native';
import { TEXT_LIMITS, createCommentSchema } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';

interface CommentComposerProps {
  replyingTo: string | null;
  isSending: boolean;
  onCancelReply: () => void;
  /** Resolves true when the comment was posted, so the field can clear. */
  onSubmit: (body: string) => Promise<boolean>;
}

export function CommentComposer({
  replyingTo,
  isSending,
  onCancelReply,
  onSubmit,
}: CommentComposerProps) {
  const [body, setBody] = useState('');
  const canSend = createCommentSchema.shape.body.safeParse(body).success && !isSending;

  const handleSend = async () => {
    if (!canSend) return;
    if (await onSubmit(body.trim())) setBody('');
  };

  return (
    <View className="border-border bg-background border-t px-4 py-2">
      {replyingTo ? (
        <View className="mb-1 flex-row items-center justify-between">
          <Text variant="muted" className="text-xs">
            Replying to {replyingTo}
          </Text>
          <Button
            variant="ghost"
            size="icon"
            onPress={onCancelReply}
            accessibilityLabel="Cancel reply"
          >
            <X size={16} className="text-muted-foreground" />
          </Button>
        </View>
      ) : null}
      <View className="flex-row items-center gap-2">
        <Input
          className="flex-1"
          placeholder="Add a comment"
          accessibilityLabel="Add a comment"
          value={body}
          onChangeText={setBody}
          maxLength={TEXT_LIMITS.comment.max}
          multiline
          editable={!isSending}
        />
        <Button
          size="icon"
          onPress={handleSend}
          disabled={!canSend}
          accessibilityLabel="Post comment"
        >
          <Send size={18} className="text-primary-foreground" />
        </Button>
      </View>
    </View>
  );
}
