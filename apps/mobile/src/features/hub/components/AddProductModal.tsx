import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import {
  ListingStatus,
  LISTING_LIMITS,
  PRODUCT_UNITS,
  ProductAvailability,
  TEXT_LIMITS,
  type Product,
} from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import { messageForError } from '../../../lib/api';
import { useCategoryOptions } from '../../categories/hooks';
import {
  buildCreateProductInput,
  buildUpdateProductInput,
  EMPTY_PRODUCT_FORM,
  productToForm,
  type ProductFormValues,
} from '../../catalog/listing-form';
import { productAvailabilityLabel, unitOptionLabel } from '../../catalog/labels';
import { useCreateProductMutation, useUpdateProductMutation } from '../../catalog/hooks';
import { usePostMediaUploads, type MediaUpload } from '../hooks/use-post-media-uploads';
import { pickListingImages } from '../image-picker';
import { AreaPicker } from './AreaPicker';
import { FormField } from './FormField';
import { ListingImagesPicker } from './ListingImagesPicker';
import { OptionPicker } from './OptionPicker';

export interface AddProductModalProps {
  visible: boolean;
  /** The product to edit, or null to add a new one. */
  product: Product | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const UNIT_OPTIONS = PRODUCT_UNITS.map((unit) => ({ id: unit, label: unitOptionLabel(unit) }));
const AVAILABILITY_OPTIONS = Object.values(ProductAvailability).map((value) => ({
  id: value,
  label: productAvailabilityLabel(value),
}));

/** Photos the product already has, shown as uploaded. */
const existingUploads = (product: Product | null): MediaUpload[] =>
  (product?.images ?? []).map((image) => ({
    key: image.id,
    media: { uri: image.url, kind: 'image', contentType: 'image/jpeg' },
    status: 'ready',
    uploadId: image.id,
  }));

function ProductForm({ product, onClose, onSaved }: Omit<AddProductModalProps, 'visible'>) {
  const [values, setValues] = useState<ProductFormValues>(
    product ? productToForm(product) : EMPTY_PRODUCT_FORM,
  );
  const [error, setError] = useState<string | null>(null);
  const photos = usePostMediaUploads('listing', existingUploads(product));
  const categories = useCategoryOptions();
  const create = useCreateProductMutation();
  const update = useUpdateProductMutation();
  const isSaving = create.isPending || update.isPending;
  const isBusy = isSaving || photos.isUploading;

  const change = (patch: Partial<ProductFormValues>) => {
    setError(null);
    setValues((current) => ({ ...current, ...patch }));
  };

  const addPhotos = async () => {
    const picked = await pickListingImages(photos.uploads.length);
    if (!picked.ok) {
      setError(
        picked.problem === 'permission'
          ? 'Allow photo access in Settings to add photos.'
          : 'A listing can have up to 10 photos.',
      );
      return;
    }
    photos.add(picked.media);
  };

  const save = (status: ListingStatus) => {
    if (photos.hasFailed) return setError('Remove or retry the photos that did not upload.');
    const withPhotos = { ...values, mediaIds: photos.mediaIds };
    const onError = (saveError: unknown) => setError(messageForError(saveError));
    if (product) {
      const built = buildUpdateProductInput(withPhotos, status);
      if (!built.ok) return setError(built.message);
      update.mutate(
        { id: product.id, data: built.input },
        { onSuccess: () => onSaved('Product saved'), onError },
      );
    } else {
      const built = buildCreateProductInput(withPhotos, status);
      if (!built.ok) return setError(built.message);
      create.mutate(built.input, {
        onSuccess: () =>
          onSaved(
            status === ListingStatus.Published ? 'Product published' : 'Product saved as draft',
          ),
        onError,
      });
    }
  };

  const isEditing = product !== null;
  const keepStatus = product?.status ?? ListingStatus.Draft;

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-end bg-black/50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="bg-background max-h-[90%] rounded-t-2xl p-5">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </Text>
          <Button variant="ghost" size="icon" onPress={onClose} accessibilityLabel="Close">
            <Icon as={X} size={20} />
          </Button>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-4">
            <FormField label="Product Name *">
              <Input
                value={values.title}
                onChangeText={(title) => change({ title })}
                maxLength={TEXT_LIMITS.listingTitle.max}
                placeholder="e.g. Industrial Valve (Forged Steel)"
              />
            </FormField>

            <FormField label="Category *">
              <OptionPicker
                title="Category"
                placeholder="Choose a category"
                options={categories.options}
                value={values.categoryId || null}
                onChange={(categoryId) => change({ categoryId })}
                isLoading={categories.isLoading}
                searchable
              />
            </FormField>

            <FormField
              label="Photos *"
              hint="Needed to publish. A draft can be saved without them."
            >
              <ListingImagesPicker
                uploads={photos.uploads}
                onAdd={() => void addPhotos()}
                onRemove={photos.remove}
                onRetry={photos.retry}
              />
            </FormField>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Price (₹)" hint="Leave empty to show 'Ask for price'.">
                  <Input
                    value={values.price}
                    onChangeText={(price) => change({ price })}
                    placeholder="e.g. 1500"
                    keyboardType="decimal-pad"
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Original price (₹)" hint="Shown struck through.">
                  <Input
                    value={values.originalPrice}
                    onChangeText={(originalPrice) => change({ originalPrice })}
                    placeholder="e.g. 1800"
                    keyboardType="decimal-pad"
                  />
                </FormField>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField label="Unit">
                  <OptionPicker
                    title="Unit"
                    placeholder="Piece / Box / Kg"
                    options={UNIT_OPTIONS}
                    value={values.unit || null}
                    onChange={(unit) => change({ unit: unit as ProductFormValues['unit'] })}
                    searchable
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Min Order Qty (MOQ)">
                  <Input
                    value={values.moq}
                    onChangeText={(moq) => change({ moq })}
                    placeholder="e.g. 50"
                    keyboardType="number-pad"
                    maxLength={String(LISTING_LIMITS.maxMoq).length}
                  />
                </FormField>
              </View>
            </View>

            <FormField label="Availability">
              <OptionPicker
                title="Availability"
                placeholder="Choose availability"
                options={AVAILABILITY_OPTIONS}
                value={values.availability}
                onChange={(availability) =>
                  change({ availability: availability as ProductFormValues['availability'] })
                }
              />
            </FormField>

            <FormField label="Delivery time">
              <Input
                value={values.deliveryTime}
                onChangeText={(deliveryTime) => change({ deliveryTime })}
                maxLength={LISTING_LIMITS.leadTime.max}
                placeholder="e.g. 3 to 5 days"
              />
            </FormField>

            <FormField label="Ships to">
              <AreaPicker
                label="Ships to"
                value={values.area}
                onChange={(area) => change({ area })}
              />
            </FormField>

            <FormField label="Product Description *">
              <Textarea
                value={values.description}
                onChangeText={(description) => change({ description })}
                maxLength={TEXT_LIMITS.listingDescription.max}
                numberOfLines={4}
                placeholder="Describe material grade, application, warranty..."
              />
            </FormField>

            <FormField label="Specifications" hint='One per line, like "Material: Steel".'>
              <Textarea
                value={values.specs}
                onChangeText={(specs) => change({ specs })}
                numberOfLines={4}
                placeholder={'Material: Forged steel\nPressure: 150 psi'}
              />
            </FormField>

            {error ? (
              <Text className="text-destructive text-sm" role="alert">
                {error}
              </Text>
            ) : null}

            <View className="flex-row gap-2">
              {isEditing ? (
                <Button className="flex-1" disabled={isBusy} onPress={() => save(keepStatus)}>
                  <Text>{isSaving ? 'Saving' : 'Save changes'}</Text>
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isBusy}
                    onPress={() => save(ListingStatus.Draft)}
                  >
                    <Text>Save as draft</Text>
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={isBusy}
                    onPress={() => save(ListingStatus.Published)}
                  >
                    <Text>{isSaving ? 'Saving' : 'Publish'}</Text>
                  </Button>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Adds a product to the catalog, or edits one. Saves as a draft or publishes. */
export function AddProductModal({ visible, product, onClose, onSaved }: AddProductModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible ? (
        <ProductForm
          key={product?.id ?? 'new'}
          product={product}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Modal>
  );
}
