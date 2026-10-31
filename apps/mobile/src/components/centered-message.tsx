import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { View } from 'react-native';

interface CenteredMessageProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** A full-screen title, explanation and optional action, for empty and fallback screens. */
export function CenteredMessage({
  title,
  description,
  actionLabel,
  onAction,
}: CenteredMessageProps) {
  return (
    <View className="bg-background w-full max-w-md flex-1 justify-center gap-4 self-center px-6">
      <Text variant="h3" className="text-center">
        {title}
      </Text>
      <Text variant="muted" className="text-center">
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button size="lg" onPress={onAction}>
          <Text>{actionLabel}</Text>
        </Button>
      )}
    </View>
  );
}
