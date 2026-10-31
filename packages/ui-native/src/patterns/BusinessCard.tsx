import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-native/components/avatar';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Card } from '@supporters/ui-native/components/card';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';
import { CheckCircle2, MapPin, Star } from 'lucide-react-native';

export interface BusinessCardData {
  id: string;
  name: string;
  slug?: string;
  category?: string;
  city?: string;
  isVerified?: boolean;
  isPremium?: boolean;
  logoUrl?: string;
  rating?: number;
  followersCount?: number;
}

export interface BusinessCardProps {
  business: BusinessCardData;
  onPress?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
  onEnquiry?: () => void;
  className?: string;
}

export function BusinessCard({
  business,
  onPress,
  onFollow,
  isFollowing,
  onEnquiry,
  className,
}: BusinessCardProps) {
  const initials = business.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card className={cn('p-4', className)}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={business.name}>
        <View className="flex flex-row items-center gap-3">
          <Avatar alt={business.name} className="size-12 rounded-xl">
            {business.logoUrl ? <AvatarImage source={{ uri: business.logoUrl }} /> : null}
            <AvatarFallback className="bg-primary/10 rounded-xl">
              <Text className="text-primary font-bold text-sm">{initials}</Text>
            </AvatarFallback>
          </Avatar>

          <View className="flex-1">
            <View className="flex flex-row items-center gap-1.5">
              <Text variant="large" className="font-bold text-base" numberOfLines={1}>
                {business.name}
              </Text>
              {business.isVerified ? <CheckCircle2 size={15} color="#16A34A" /> : null}
              {business.isPremium ? (
                <Badge variant="secondary" className="px-1.5 py-0">
                  <Text className="text-[10px] font-bold text-amber-700">PRO</Text>
                </Badge>
              ) : null}
            </View>

            <View className="mt-1 flex flex-row items-center gap-2">
              {business.category ? (
                <Text variant="muted" className="text-xs" numberOfLines={1}>
                  {business.category}
                </Text>
              ) : null}
              {business.city ? (
                <View className="flex flex-row items-center gap-0.5">
                  <MapPin size={11} color="#6B7280" />
                  <Text variant="muted" className="text-xs">
                    {business.city}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {business.rating || business.followersCount ? (
          <View className="mt-3 flex flex-row items-center gap-3 border-t border-border pt-2.5">
            {business.rating ? (
              <View className="flex flex-row items-center gap-1">
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-xs font-semibold">{business.rating.toFixed(1)}</Text>
              </View>
            ) : null}
            {business.followersCount !== undefined ? (
              <Text variant="muted" className="text-xs">
                {business.followersCount.toLocaleString('en-IN')} followers
              </Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {onFollow || onEnquiry ? (
        <View className="mt-3 flex flex-row items-center gap-2 border-t border-border pt-3">
          {onFollow ? (
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              size="sm"
              className="flex-1"
              onPress={onFollow}
            >
              <Text>{isFollowing ? 'Following' : 'Follow'}</Text>
            </Button>
          ) : null}
          {onEnquiry ? (
            <Button variant="secondary" size="sm" className="flex-1" onPress={onEnquiry}>
              <Text>Send Enquiry</Text>
            </Button>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
