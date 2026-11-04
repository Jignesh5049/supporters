import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Camera, Upload } from 'lucide-react-native';
import { BUSINESS_LIMITS, BusinessType } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import { businessTypeLabel } from '../../business/labels';
import type { BusinessFormValues } from '../../business/business-form';
import { useCategoriesQuery } from '../../categories/hooks';
import { FormField } from './FormField';
import { OptionPicker } from './OptionPicker';

export interface EditTabProps {
  values: BusinessFormValues;
  onChange: (patch: Partial<BusinessFormValues>) => void;
}

interface EditBusinessBasicTabProps extends EditTabProps {
  coverUri?: string;
  logoUri?: string;
  isUploadingCover: boolean;
  isUploadingLogo: boolean;
  onPickCover: () => void;
  onPickLogo: () => void;
}

const TYPE_OPTIONS = Object.values(BusinessType).map((type) => ({
  id: type,
  label: businessTypeLabel(type),
}));

export function EditBusinessBasicTab({
  values,
  onChange,
  coverUri,
  logoUri,
  isUploadingCover,
  isUploadingLogo,
  onPickCover,
  onPickLogo,
}: EditBusinessBasicTabProps) {
  const categories = useCategoriesQuery();
  const categoryOptions = (categories.data?.data ?? []).map(({ id, name }) => ({
    id,
    label: name,
  }));

  return (
    <View className="gap-4 p-4">
      <View className="border-border bg-card gap-3 rounded-xl border p-3">
        <View className="bg-muted h-32 overflow-hidden rounded-lg">
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
              accessibilityLabel="Cover photo"
            />
          ) : null}
          {isUploadingCover ? (
            <View className="bg-background/70 absolute inset-0 items-center justify-center">
              <ActivityIndicator />
            </View>
          ) : null}
          <TouchableOpacity
            onPress={onPickCover}
            disabled={isUploadingCover}
            activeOpacity={0.8}
            accessibilityLabel="Change cover photo"
            className="absolute bottom-2 right-2 flex-row items-center gap-1 rounded-md bg-black/65 px-2 py-1.5"
          >
            <Camera size={13} color="#FFFFFF" />
            <Text className="text-xs font-semibold text-white">Change Cover</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="bg-muted size-14 overflow-hidden rounded-lg">
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
                accessibilityLabel="Logo"
              />
            ) : null}
            {isUploadingLogo ? (
              <View className="bg-background/70 absolute inset-0 items-center justify-center">
                <ActivityIndicator />
              </View>
            ) : null}
          </View>
          <Button
            variant="outline"
            size="sm"
            disabled={isUploadingLogo}
            onPress={onPickLogo}
            accessibilityLabel="Upload a new logo"
          >
            <Icon as={Upload} size={13} />
            <Text>Upload New Logo</Text>
          </Button>
        </View>
      </View>

      <FormField label="Registered Business Name *">
        <Input
          value={values.name}
          onChangeText={(name) => onChange({ name })}
          maxLength={BUSINESS_LIMITS.name.max}
          placeholder="e.g. Shree Electronics & Systems"
        />
      </FormField>

      <FormField label="Business Type *">
        <OptionPicker
          title="Business type"
          placeholder="Choose a type"
          options={TYPE_OPTIONS}
          value={values.type || null}
          onChange={(type) => onChange({ type: type as BusinessFormValues['type'] })}
        />
      </FormField>

      <FormField label="Industry / Primary Category *">
        <OptionPicker
          title="Category"
          placeholder="Choose a category"
          options={categoryOptions}
          value={values.categoryId || null}
          onChange={(categoryId) => onChange({ categoryId })}
          isLoading={categories.isPending}
          searchable
        />
      </FormField>

      <FormField label="About / Business Overview">
        <Textarea
          value={values.about}
          onChangeText={(about) => onChange({ about })}
          maxLength={BUSINESS_LIMITS.about.max}
          numberOfLines={4}
          placeholder="Describe your manufacturing capacity, products, and commercial specialties..."
        />
      </FormField>

      <FormField label="Contact Person">
        <Input
          value={values.contactPerson}
          onChangeText={(contactPerson) => onChange({ contactPerson })}
          placeholder="e.g. Aarav Mehta"
        />
      </FormField>

      <FormField label="Contact Phone" hint="A 10-digit Indian number. +91 is added for you.">
        <Input
          value={values.contactPhone}
          onChangeText={(contactPhone) => onChange({ contactPhone })}
          placeholder="98765 43210"
          keyboardType="phone-pad"
          maxLength={16}
        />
      </FormField>

      <FormField label="Official Email Address">
        <Input
          value={values.contactEmail}
          onChangeText={(contactEmail) => onChange({ contactEmail })}
          placeholder="sales@shreeelectronics.in"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </FormField>
    </View>
  );
}
