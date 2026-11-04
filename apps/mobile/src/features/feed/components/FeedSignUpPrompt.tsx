import React from 'react';
import { View } from 'react-native';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';

export function FeedSignUpPrompt({ onSignUp }: { onSignUp: () => void }) {
  return (
    <View className="bg-primary/10 mx-4 mb-3 items-center gap-2 rounded-xl p-4">
      <Text className="text-center text-base font-bold">Don't miss a supplier</Text>
      <Text variant="muted" className="text-center text-sm">
        Create a free account to follow businesses, save posts and send enquiries.
      </Text>
      <Button size="sm" onPress={onSignUp} accessibilityLabel="Create a free account">
        <Text>Sign up free</Text>
      </Button>
    </View>
  );
}
