import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import {
  CheckCircle2,
  MapPin,
  Share2,
  Star,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react-native';
import type { Business } from '@supporters/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-native/components/avatar';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { businessTypeLabel } from '../labels';
import { formatCount } from '../../social/mappers';
import { ratingText } from '../../reviews/review-form';

interface BusinessHeroProps {
  business: Business;
  isFollowing: boolean;
  isFollowBusy: boolean;
  /** Owners do not follow their own page. */
  canFollow: boolean;
  onToggleFollow: () => void;
  onOpenFollowers: () => void;
  onShare: () => void;
  onEnquiry: () => void;
}

export function BusinessHero({
  business,
  isFollowing,
  isFollowBusy,
  canFollow,
  onToggleFollow,
  onOpenFollowers,
  onShare,
  onEnquiry,
}: BusinessHeroProps) {
  const initials = business.name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View className="bg-card border-border border-b">
      {business.cover ? (
        <Image
          source={{ uri: business.cover.url }}
          style={{ width: '100%', height: 140 }}
          contentFit="cover"
          cachePolicy="disk"
          accessibilityLabel="Cover photo"
        />
      ) : (
        <View className="bg-muted h-24 w-full" />
      )}

      <View className="-mt-9 px-4 pb-4">
        <View className="flex-row items-end justify-between">
          <Avatar alt={business.name} className="border-card size-20 border-4">
            {business.logo ? <AvatarImage source={{ uri: business.logo.url }} /> : null}
            <AvatarFallback className="bg-primary/10">
              <Text className="text-primary text-xl font-bold">{initials}</Text>
            </AvatarFallback>
          </Avatar>
          <View className="flex-row items-center gap-2">
            {canFollow ? (
              <Button
                variant={isFollowing ? 'outline' : 'default'}
                size="sm"
                disabled={isFollowBusy}
                onPress={onToggleFollow}
                accessibilityLabel={
                  isFollowing ? `Unfollow ${business.name}` : `Follow ${business.name}`
                }
                accessibilityState={{ selected: isFollowing }}
              >
                <Icon
                  as={isFollowing ? UserCheck : UserPlus}
                  size={15}
                  className={isFollowing ? 'text-primary' : 'text-primary-foreground'}
                />
                <Text>{isFollowing ? 'Following' : 'Follow'}</Text>
              </Button>
            ) : null}
            <Button variant="outline" size="icon" onPress={onShare} accessibilityLabel="Share">
              <Icon as={Share2} size={16} />
            </Button>
          </View>
        </View>

        <View className="mt-2 flex-row items-center gap-1.5">
          <Text variant="h4" className="flex-shrink" numberOfLines={2}>
            {business.name}
          </Text>
          {business.isVerified ? (
            <Icon
              as={CheckCircle2}
              size={18}
              className="text-primary"
              accessibilityLabel="Verified"
            />
          ) : null}
        </View>
        <Text variant="muted" className="text-sm">
          {business.category.name} · {businessTypeLabel(business.type)}
        </Text>

        <View className="mt-2 flex-row items-center gap-4">
          <View className="flex-row items-center gap-1">
            <Icon as={MapPin} size={13} className="text-muted-foreground" />
            <Text variant="muted" className="text-xs">
              {business.city.name}, {business.state.name}
            </Text>
          </View>
          <View
            className="flex-row items-center gap-1"
            accessible
            accessibilityLabel={`Rating ${ratingText(business.rating).value}, ${ratingText(business.rating).count}`}
          >
            <Icon as={Star} size={13} className="fill-warning text-warning" />
            <Text className="text-xs font-semibold">{ratingText(business.rating).value}</Text>
            <Text variant="muted" className="text-xs">
              ({ratingText(business.rating).count})
            </Text>
          </View>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 gap-1 px-1"
            onPress={onOpenFollowers}
            accessibilityLabel={`${formatCount(business.followerCount, 'follower')}, view list`}
          >
            <Icon as={Users} size={13} className="text-primary" />
            <Text className="text-primary text-xs font-bold">
              {formatCount(business.followerCount, 'follower')}
            </Text>
          </Button>
        </View>

        <Button className="mt-3" onPress={onEnquiry} accessibilityLabel="Send enquiry">
          <Text>Send enquiry</Text>
        </Button>
      </View>
    </View>
  );
}
