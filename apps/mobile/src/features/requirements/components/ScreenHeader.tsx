import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';

/** Back button, title and an optional action, for the requirement screens. */
export function ScreenHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View className="border-border bg-background h-13 flex-row items-center gap-2 border-b px-2">
      <Button
        variant="ghost"
        size="icon"
        onPress={() => router.back()}
        accessibilityLabel="Go back"
      >
        <Icon as={ArrowLeft} size={20} />
      </Button>
      <Text className="flex-1 text-base font-bold" numberOfLines={1} role="heading">
        {title}
      </Text>
      {action}
    </View>
  );
}
