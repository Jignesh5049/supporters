import React from 'react';
import { View } from 'react-native';
import { FilePlus } from 'lucide-react-native';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';

interface FeedHeaderProps {
  onPostRequirement: () => void;
}

export function FeedHeader({ onPostRequirement }: FeedHeaderProps) {
  return (
    <View className="bg-card border-border mx-4 mb-3 mt-3 flex-row items-center justify-between rounded-xl border p-3">
      <View className="flex-row items-center gap-2">
        <FilePlus size={16} className="text-primary" />
        <Text className="text-sm font-semibold">Looking to buy?</Text>
      </View>
      <Button size="sm" onPress={onPostRequirement} accessibilityLabel="Post a requirement">
        <Text>Post requirement</Text>
      </Button>
    </View>
  );
}
