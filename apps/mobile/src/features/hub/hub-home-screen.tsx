import type { MyBusiness } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@supporters/ui-native/components/card';
import { Text } from '@supporters/ui-native/components/text';
import { type Href, router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { ListingLimitNotice } from './listing-form-shell';
import { useMyBusiness } from './queries';

const VERIFICATION_LABELS: Record<MyBusiness['verificationStatus'], string> = {
  none: 'Not verified',
  pending: 'Verification pending',
  verified: 'Verified',
  rejected: 'Verification rejected',
};

const HUB_LINKS: { label: string; href: Href }[] = [
  { label: 'Edit business', href: '/hub/edit' },
  { label: 'Products', href: '/hub/products' },
  { label: 'Services', href: '/hub/services' },
  { label: 'Posts', href: '/hub/posts' },
  { label: 'Premium', href: '/hub/premium' },
  { label: 'Settings', href: '/hub/settings' },
];

/** `hub/index`: the owner's dashboard. `hub/_layout` has already checked a business exists. */
export function HubHomeScreen() {
  const business = useMyBusiness().data;
  if (!business) return null;

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="gap-4 p-4 pb-10">
      <View className="gap-1">
        <Text variant="h4">{business.name}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Badge variant={business.isVerified ? 'default' : 'secondary'}>
            <Text>{VERIFICATION_LABELS[business.verificationStatus]}</Text>
          </Badge>
          {business.isPremium && (
            <Badge>
              <Text>Premium</Text>
            </Badge>
          )}
        </View>
      </View>

      <Card>
        <CardHeader>
          <CardTitle>Profile {business.profileCompletion}% complete</CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <View
              className="bg-primary h-2"
              style={{ width: `${business.profileCompletion}%` }}
              accessibilityLabel={`Profile ${business.profileCompletion}% complete`}
            />
          </View>
          <Text variant="muted">
            {business.publishedListings} published{' '}
            {business.publishedListings === 1 ? 'listing' : 'listings'}
          </Text>
        </CardContent>
      </Card>

      <ListingLimitNotice business={business} />

      <Button
        variant="outline"
        onPress={() =>
          router.push({ pathname: '/business/[slug]', params: { slug: business.slug } })
        }
      >
        <Text>View public page</Text>
      </Button>

      <View className="gap-2">
        {HUB_LINKS.map((link) => (
          <Button key={link.label} variant="secondary" onPress={() => router.push(link.href)}>
            <Text>{link.label}</Text>
          </Button>
        ))}
      </View>
    </ScrollView>
  );
}
