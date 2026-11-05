import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { Paperclip, SendHorizontal } from 'lucide-react-native';
import { CHAT_LIMITS, TEXT_LIMITS } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';

interface ChatComposerProps {
  disabled?: boolean;
  /** Shown instead of the input when sending is not possible (blocked). */
  disabledReason?: string;
  isUploading?: boolean;
  onSend: (body: string) => void;
  onAttach: () => void;
  onTyping: (isTyping: boolean) => void;
}

/** Text box, attach and send. Typing goes out at most once per throttle window. */
export function ChatComposer({
  disabled,
  disabledReason,
  isUploading,
  onSend,
  onAttach,
  onTyping,
}: ChatComposerProps) {
  const [text, setText] = useState('');
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(idleTimer.current);
    },
    [],
  );

  const handleChange = (value: string) => {
    setText(value);
    clearTimeout(idleTimer.current);
    if (value.trim().length === 0) {
      onTyping(false);
      return;
    }
    // The client throttles the "true" events; stopping is sent once the user pauses.
    onTyping(true);
    idleTimer.current = setTimeout(() => onTyping(false), CHAT_LIMITS.typingThrottleMs);
  };

  const handleSend = () => {
    const body = text.trim();
    if (!body) return;
    clearTimeout(idleTimer.current);
    onTyping(false);
    onSend(body);
    setText('');
  };

  if (disabledReason) {
    return (
      <View className="border-border bg-card border-t px-4 py-3">
        <Text variant="muted" className="text-center text-sm">
          {disabledReason}
        </Text>
      </View>
    );
  }

  const canSend = !disabled && text.trim().length > 0;
  return (
    <View className="border-border bg-card flex-row items-end gap-2 border-t px-2 py-2">
      <Button
        variant="ghost"
        size="icon"
        onPress={onAttach}
        disabled={disabled || isUploading}
        accessibilityLabel="Attach photos, a PDF or a listing"
      >
        {isUploading ? <ActivityIndicator /> : <Icon as={Paperclip} size={20} />}
      </Button>
      <TextInput
        value={text}
        onChangeText={handleChange}
        placeholder="Write a message"
        multiline
        maxLength={TEXT_LIMITS.message.max}
        editable={!disabled}
        className="bg-muted text-foreground placeholder:text-muted-foreground max-h-32 min-h-11 flex-1 rounded-2xl px-4 py-2.5 text-sm"
        accessibilityLabel="Message"
      />
      <Button
        size="icon"
        onPress={handleSend}
        disabled={!canSend}
        accessibilityLabel="Send message"
      >
        <Icon as={SendHorizontal} size={18} className="text-primary-foreground" />
      </Button>
    </View>
  );
}
