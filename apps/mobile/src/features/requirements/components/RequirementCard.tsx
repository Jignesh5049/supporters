import React from 'react';
import { Pressable, View } from 'react-native';
import { CheckCircle2, Pin } from 'lucide-react-native';
import type { Requirement } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';
import {
  REQUIREMENT_STATUS_LABEL,
  requirementBudget,
  requirementQuantity,
  requirementTimeLeft,
  requirementTitle,
} from '../requirement-form';

interface RequirementCardProps {
  requirement: Requirement;
  onPress: () => void;
  /** The pinned card at the top of a seller's feed. */
  isPinned?: boolean;
  /** Buttons under the card (Send quote, Close, ...). */
  actions?: React.ReactNode;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 py-1">
      <Text variant="muted" className="text-xs">
        {label}
      </Text>
      <Text className="text-sm font-semibold" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** A buyer requirement. Shows the buyer's name and city only, never phone or email. */
export function RequirementCard({
  requirement,
  onPress,
  isPinned = false,
  actions,
}: RequirementCardProps) {
  const title = requirementTitle(requirement);
  return (
    <View
      className={cn(
        'bg-card gap-2 rounded-2xl border p-4',
        isPinned ? 'border-highlight' : 'border-border',
      )}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${isPinned ? 'Buyer requirement: ' : ''}${title}. ${requirementQuantity(requirement)} to ${requirement.deliveryCity.name}`}
        accessibilityHint="Opens the requirement"
        className="gap-2"
      >
        <View className="flex-row flex-wrap items-center gap-1.5">
          {isPinned ? (
            <Badge className="bg-highlight">
              <Icon as={Pin} size={12} className="text-highlight-foreground" />
              <Text className="text-highlight-foreground">Buyer requirement</Text>
            </Badge>
          ) : null}
          <Badge variant="secondary">
            <Text>{requirement.category.name}</Text>
          </Badge>
          <Badge variant={requirement.status === 'open' ? 'default' : 'outline'}>
            <Text>{REQUIREMENT_STATUS_LABEL[requirement.status]}</Text>
          </Badge>
          {requirement.hasQuoted ? (
            <Badge variant="outline">
              <Icon as={CheckCircle2} size={12} className="text-success" />
              <Text>Quoted</Text>
            </Badge>
          ) : null}
        </View>
        <Text className="text-base font-bold" numberOfLines={2}>
          {title}
        </Text>
        {requirement.description.trim() !== title ? (
          <Text variant="muted" className="text-sm" numberOfLines={3}>
            {requirement.description}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap">
          <Fact label="Quantity" value={requirementQuantity(requirement)} />
          <Fact label="Budget" value={requirementBudget(requirement)} />
          <Fact label="Deliver to" value={requirement.deliveryCity.name} />
          <Fact label="Status" value={requirementTimeLeft(requirement)} />
        </View>
        <Text variant="muted" className="text-xs">
          {requirement.isMine
            ? `Posted by you · ${requirement.quoteCount} ${requirement.quoteCount === 1 ? 'quote' : 'quotes'}`
            : `${requirement.buyer.name}${requirement.buyer.city ? ` · ${requirement.buyer.city.name}` : ''}`}
        </Text>
      </Pressable>
      {actions ? (
        <View className="border-border flex-row flex-wrap gap-2 border-t pt-3">{actions}</View>
      ) : null}
    </View>
  );
}
