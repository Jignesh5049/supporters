import React from 'react';
import { Pressable, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import type { BusinessSummary } from '@supporters/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-native/components/avatar';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';

interface BusinessRowProps {
  business: BusinessSummary;
  onPress: (business: BusinessSummary) => void;
  /** Shows a trailing button, e.g. Following on the following list. */
  action?: { label: string; onPress: (business: BusinessSummary) => void; isBusy?: boolean };
}

export function BusinessRow({ business, onPress, action }: BusinessRowProps) {
  const initials = business.name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View className="border-border flex-row items-center gap-3 border-b px-4 py-3">
      <Pressable
        onPress={() => onPress(business)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${business.name}`}
        className="min-h-11 flex-1 flex-row items-center gap-3"
      >
        <Avatar alt={business.name} className="size-11">
          {business.logo ? <AvatarImage source={{ uri: business.logo.url }} /> : null}
          <AvatarFallback className="bg-primary/10">
            <Text className="text-primary text-sm font-bold">{initials}</Text>
          </AvatarFallback>
        </Avatar>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="flex-shrink text-sm font-semibold" numberOfLines={1}>
              {business.name}
            </Text>
            {business.isVerified ? (
              <Icon as={CheckCircle2} size={13} className="text-primary" />
            ) : null}
          </View>
          <Text variant="muted" className="text-xs">
            {business.city.name}
          </Text>
        </View>
      </Pressable>
      {action ? (
        <Button
          variant="outline"
          size="sm"
          disabled={action.isBusy}
          onPress={() => action.onPress(business)}
          accessibilityLabel={`${action.label} ${business.name}`}
        >
          <Text>{action.label}</Text>
        </Button>
      ) : null}
    </View>
  );
}
