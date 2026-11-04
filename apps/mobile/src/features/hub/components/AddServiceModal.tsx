import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import {
  ListingStatus,
  LISTING_LIMITS,
  SERVICE_PRICE_UNITS,
  ServiceAvailability,
  TEXT_LIMITS,
  type Service,
} from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import { messageForError } from '../../../lib/api';
import { useCategoryOptions } from '../../categories/hooks';
import {
  buildCreateServiceInput,
  buildUpdateServiceInput,
  EMPTY_SERVICE_FORM,
  serviceToForm,
  type ServiceFormValues,
} from '../../catalog/listing-form';
import { serviceAvailabilityLabel, unitOptionLabel } from '../../catalog/labels';
import { useCreateServiceMutation, useUpdateServiceMutation } from '../../catalog/hooks';
import { usePostMediaUploads, type MediaUpload } from '../hooks/use-post-media-uploads';
import { pickListingImages } from '../image-picker';
import { AreaPicker } from './AreaPicker';
import { FormField } from './FormField';
import { ListingImagesPicker } from './ListingImagesPicker';
import { OptionPicker } from './OptionPicker';

export interface AddServiceModalProps {
  visible: boolean;
  /** The service to edit, or null to add a new one. */
  service: Service | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const PRICE_UNIT_OPTIONS = SERVICE_PRICE_UNITS.map((unit) => ({
  id: unit,
  label: unitOptionLabel(unit),
}));
const AVAILABILITY_OPTIONS = Object.values(ServiceAvailability).map((value) => ({
  id: value,
  label: serviceAvailabilityLabel(value),
}));

/** Photos the service already has, shown as uploaded. */
const existingUploads = (service: Service | null): MediaUpload[] =>
  (service?.images ?? []).map((image) => ({
    key: image.id,
    media: { uri: image.url, kind: 'image', contentType: 'image/jpeg' },
    status: 'ready',
    uploadId: image.id,
  }));

function ServiceForm({ service, onClose, onSaved }: Omit<AddServiceModalProps, 'visible'>) {
  const [values, setValues] = useState<ServiceFormValues>(
    service ? serviceToForm(service) : EMPTY_SERVICE_FORM,
  );
  const [error, setError] = useState<string | null>(null);
  const photos = usePostMediaUploads('listing', existingUploads(service));
  const categories = useCategoryOptions();
  const create = useCreateServiceMutation();
  const update = useUpdateServiceMutation();
  const isSaving = create.isPending || update.isPending;
  const isBusy = isSaving || photos.isUploading;

  const change = (patch: Partial<ServiceFormValues>) => {
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
    if (service) {
      const built = buildUpdateServiceInput(withPhotos, status);
      if (!built.ok) return setError(built.message);
      update.mutate(
        { id: service.id, data: built.input },
        { onSuccess: () => onSaved('Service saved'), onError },
      );
    } else {
      const built = buildCreateServiceInput(withPhotos, status);
      if (!built.ok) return setError(built.message);
      create.mutate(built.input, {
        onSuccess: () =>
          onSaved(
            status === ListingStatus.Published ? 'Service published' : 'Service saved as draft',
          ),
        onError,
      });
    }
  };

  const isEditing = service !== null;
  const keepStatus = service?.status ?? ListingStatus.Draft;

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-end bg-black/50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="bg-background max-h-[90%] rounded-t-2xl p-5">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-lg font-bold">
            {isEditing ? 'Edit Service' : 'Add New Service'}
          </Text>
          <Button variant="ghost" size="icon" onPress={onClose} accessibilityLabel="Close">
            <Icon as={X} size={20} />
          </Button>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-4">
            <FormField label="Service Title *">
              <Input
                value={values.title}
                onChangeText={(title) => change({ title })}
                maxLength={TEXT_LIMITS.listingTitle.max}
                placeholder="e.g. CNC Precision Turning & Milling"
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
                <FormField label="Starting Price (₹)" hint="Leave empty to show 'Ask for price'.">
                  <Input
                    value={values.price}
                    onChangeText={(price) => change({ price })}
                    placeholder="e.g. 5000"
                    keyboardType="decimal-pad"
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label="Price Unit">
                  <OptionPicker
                    title="Price unit"
                    placeholder="Per job"
                    options={PRICE_UNIT_OPTIONS}
                    value={values.priceUnit || null}
                    onChange={(priceUnit) =>
                      change({ priceUnit: priceUnit as ServiceFormValues['priceUnit'] })
                    }
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
                  change({ availability: availability as ServiceFormValues['availability'] })
                }
              />
            </FormField>

            <FormField label="Turnaround">
              <Input
                value={values.turnaround}
                onChangeText={(turnaround) => change({ turnaround })}
                maxLength={LISTING_LIMITS.leadTime.max}
                placeholder="e.g. 3 to 5 days"
              />
            </FormField>

            <FormField label="Service area">
              <AreaPicker
                label="Service area"
                value={values.area}
                onChange={(area) => change({ area })}
              />
            </FormField>

            <FormField label="Service Description *">
              <Textarea
                value={values.description}
                onChangeText={(description) => change({ description })}
                maxLength={TEXT_LIMITS.listingDescription.max}
                numberOfLines={4}
                placeholder="Describe capabilities, tolerances, machines, turnaround..."
              />
            </FormField>

            <FormField label="Features" hint="One per line.">
              <Textarea
                value={values.features}
                onChangeText={(features) => change({ features })}
                numberOfLines={4}
                placeholder={'Free site visit\nOn-time delivery'}
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

/** Adds a service to the catalog, or edits one. Saves as a draft or publishes. */
export function AddServiceModal({ visible, service, onClose, onSaved }: AddServiceModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible ? (
        <ServiceForm
          key={service?.id ?? 'new'}
          service={service}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Modal>
  );
}
