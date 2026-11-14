import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LISTING_LIMITS, MEDIA_LIMITS, PRODUCT_UNITS } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import { useApp } from '../context/AppContext';
import { unitOptionLabel } from '../features/catalog/labels';
import { useCategoryOptions } from '../features/categories/hooks';
import { FormField } from '../features/hub/components/FormField';
import { ListingImagesPicker } from '../features/hub/components/ListingImagesPicker';
import { OptionPicker } from '../features/hub/components/OptionPicker';
import { usePostMediaUploads } from '../features/hub/hooks/use-post-media-uploads';
import { pickListingImages, remainingSlots } from '../features/hub/image-picker';
import { useCities, useStates } from '../features/places/hooks';
import { ScreenHeader } from '../features/requirements/components/ScreenHeader';
import { useCreateRequirement } from '../features/requirements/hooks';
import {
  REQUIREMENT_TEXT,
  emptyRequirementForm,
  requirementErrorMessage,
  toRequirementInput,
  type RequirementField,
  type RequirementFormValues,
} from '../features/requirements/requirement-form';

const UNIT_OPTIONS = PRODUCT_UNITS.map((unit) => ({ id: unit, label: unitOptionLabel(unit) }));
const MAX_IMAGES = MEDIA_LIMITS.imagesPerRequirement.max;

/** Post a buyer requirement (product spec, Buyer requirements: Who posts). */
export function CreateRequirementScreen() {
  const router = useRouter();
  const { showToast } = useApp();
  const create = useCreateRequirement();
  const categories = useCategoryOptions();
  const states = useStates();
  const [stateCode, setStateCode] = useState<string | null>(null);
  const cities = useCities(stateCode);
  const photos = usePostMediaUploads('requirement');
  const [values, setValues] = useState<RequirementFormValues>(emptyRequirementForm);
  const [errors, setErrors] = useState<Partial<Record<RequirementField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof RequirementFormValues>(key: K, value: RequirementFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    create.reset();
  };

  const addPhotos = async () => {
    if (remainingSlots(photos.uploads.length, MAX_IMAGES) === 0) {
      setFormError(`A requirement can have up to ${MAX_IMAGES} images.`);
      return;
    }
    const picked = await pickListingImages(photos.uploads.length);
    if (!picked.ok) {
      setFormError(
        picked.problem === 'permission'
          ? 'Allow photo access in Settings to add images.'
          : `A requirement can have up to ${MAX_IMAGES} images.`,
      );
      return;
    }
    photos.add(picked.media.slice(0, remainingSlots(photos.uploads.length, MAX_IMAGES)));
  };

  const handleSubmit = () => {
    setFormError(null);
    if (photos.hasFailed) return setFormError('Remove or retry the images that did not upload.');
    if (photos.uploads.some((upload) => upload.status === 'uploading')) {
      return setFormError('Wait for the images to finish uploading.');
    }
    const result = toRequirementInput(values, photos.mediaIds);
    if (!result.ok) return setErrors(result.errors);
    create.mutate(result.input, {
      onSuccess: (requirement) => {
        showToast('Requirement posted. Matching suppliers will be told.', 'success');
        router.replace(`/requirements/${requirement.id}`);
      },
      onError: (error) => setFormError(requirementErrorMessage(error)),
    });
  };

  const length = values.description.trim().length;
  return (
    <SafeAreaView className="bg-background flex-1" edges={['top', 'bottom']}>
      <ScreenHeader title="Post a requirement" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
          <FormField
            label="What do you need?"
            hint={`${length} / ${REQUIREMENT_TEXT.max} (at least ${REQUIREMENT_TEXT.min})`}
            error={errors.description}
          >
            <Textarea
              value={values.description}
              onChangeText={(text) => set('description', text)}
              maxLength={REQUIREMENT_TEXT.max}
              numberOfLines={5}
              placeholder="Specs, quality, packaging, timing"
              accessibilityLabel="What do you need"
            />
          </FormField>
          <FormField label="Category" error={errors.categoryId}>
            <OptionPicker
              title="Category"
              placeholder="Choose a category"
              options={categories.options}
              value={values.categoryId}
              isLoading={categories.isLoading}
              searchable
              onChange={(id) => set('categoryId', id)}
            />
          </FormField>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label="Quantity" error={errors.quantity}>
                <Input
                  value={values.quantity}
                  onChangeText={(text) => set('quantity', text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={String(LISTING_LIMITS.maxMoq).length}
                  placeholder="e.g. 500"
                  accessibilityLabel="Quantity"
                />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label="Unit" error={errors.unit}>
                <OptionPicker
                  title="Unit"
                  placeholder="Unit"
                  options={UNIT_OPTIONS}
                  value={values.unit}
                  onChange={(unit) => set('unit', unit)}
                />
              </FormField>
            </View>
          </View>
          <FormField label="Delivery city" error={errors.deliveryCityId}>
            <View className="gap-2">
              <OptionPicker
                title="State"
                placeholder="Choose a state"
                options={(states.data ?? []).map((state) => ({
                  id: state.code,
                  label: state.name,
                }))}
                value={stateCode}
                isLoading={states.isPending}
                searchable
                onChange={(code) => {
                  setStateCode(code);
                  set('deliveryCityId', null);
                }}
              />
              <OptionPicker
                title="City"
                placeholder={stateCode ? 'Choose a city' : 'Choose a state first'}
                options={(cities.data ?? []).map((city) => ({ id: city.id, label: city.name }))}
                value={values.deliveryCityId}
                isLoading={Boolean(stateCode) && cities.isPending}
                disabled={!stateCode}
                searchable
                onChange={(id) => set('deliveryCityId', id)}
              />
            </View>
          </FormField>
          <FormField
            label="Budget (₹, optional)"
            hint="Your total budget, if any."
            error={errors.budget}
          >
            <Input
              value={values.budget}
              onChangeText={(text) => set('budget', text)}
              keyboardType="decimal-pad"
              placeholder="e.g. 25,000"
              accessibilityLabel="Budget in rupees"
            />
          </FormField>
          <FormField label={`Images (optional, up to ${MAX_IMAGES})`}>
            <ListingImagesPicker
              uploads={photos.uploads}
              onAdd={() => void addPhotos()}
              onRemove={photos.remove}
              onRetry={photos.retry}
              max={MAX_IMAGES}
              hint="A sample, a drawing or a photo."
            />
          </FormField>
          <Text variant="muted" className="text-xs">
            Suppliers see your name and city, never your phone number or email. It stays open for 30
            days.
          </Text>
          {formError ? (
            <Text className="text-destructive text-sm" role="alert">
              {formError}
            </Text>
          ) : null}
          <Button
            onPress={handleSubmit}
            disabled={create.isPending}
            accessibilityLabel="Post requirement"
          >
            <Text>{create.isPending ? 'Posting…' : 'Post requirement'}</Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
