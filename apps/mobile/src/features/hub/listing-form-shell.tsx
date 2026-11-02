import { ListingStatus, type MyBusiness } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Card } from '@supporters/ui-native/components/card';
import { Text } from '@supporters/ui-native/components/text';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { listingLimitStatus } from '../catalog/format';
import { FieldError } from './form-controls';

/** The free-plan message, shown on the Hub and above listing forms. */
export function ListingLimitNotice({ business }: { business: MyBusiness | null | undefined }) {
  const status = business ? listingLimitStatus(business) : null;
  if (!status) return null;
  return (
    <Card className={status.isAtLimit ? 'bg-warning-soft p-3' : 'bg-muted p-3'}>
      <Text className="text-sm">{status.message}</Text>
    </Card>
  );
}

/** Title, scrollable fields and the Save draft / Publish buttons shared by both listing forms. */
export function ListingFormShell({
  title,
  business,
  formError,
  isSaving,
  onSave,
  children,
}: {
  title: string;
  business: MyBusiness | null | undefined;
  formError: string | null;
  isSaving: boolean;
  onSave: (status: ListingStatus) => void;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-background flex-1"
    >
      <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <Text variant="h4">{title}</Text>
        <ListingLimitNotice business={business} />
        {children}
        <FieldError message={formError ?? undefined} />
        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={isSaving}
            onPress={() => onSave(ListingStatus.Draft)}
          >
            <Text>Save draft</Text>
          </Button>
          <Button
            className="flex-1"
            disabled={isSaving}
            onPress={() => onSave(ListingStatus.Published)}
          >
            <Text>{isSaving ? 'Saving…' : 'Publish'}</Text>
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
