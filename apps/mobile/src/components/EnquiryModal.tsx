import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { Check, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { LISTING_LIMITS, PRODUCT_UNITS, type ListingRef } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import { cn } from '@supporters/ui-native/lib/utils';
import { useApp, type EnquiryTarget } from '../context/AppContext';
import { unitOptionLabel } from '../features/catalog/labels';
import { useBusinessProducts, useBusinessServices } from '../features/catalog/hooks';
import {
  createKeyRing,
  emptyEnquiryForm,
  ENQUIRY_MESSAGE,
  enquiryErrorMessage,
  toEnquiryDraft,
  type EnquiryField,
  type EnquiryFormValues,
  type ProductUnit,
} from '../features/enquiries/enquiry-form';
import { useCreateEnquiry } from '../features/enquiries/hooks';
import { FormField } from '../features/hub/components/FormField';
import { OptionPicker } from '../features/hub/components/OptionPicker';
import { useCities, useStates } from '../features/places/hooks';
import { useSessionStore } from '../stores/session-store';

const UNIT_OPTIONS = PRODUCT_UNITS.map((unit) => ({ id: unit, label: unitOptionLabel(unit) }));

/** "+91 ••••• •3410": enough for the buyer to recognise the number being shared. */
export function maskedPhone(phone: string | undefined): string {
  if (!phone) return 'your verified number';
  return `${phone.slice(0, 3)} ••••• •${phone.slice(-4)}`;
}

/** Picks one of the business's public listings when the form was opened from its page. */
function ListingChoice({
  businessId,
  value,
  onChange,
}: {
  businessId: string;
  value: ListingRef | null;
  onChange: (listing: ListingRef) => void;
}) {
  const isValidBusiness = z.uuid().safeParse(businessId).success;
  const products = useBusinessProducts(isValidBusiness ? businessId : '');
  const services = useBusinessServices(isValidBusiness ? businessId : '');
  const options = [
    ...(products.data?.pages ?? []).flatMap((page) =>
      page.data.map((p) => ({ id: `product:${p.id}`, label: p.title })),
    ),
    ...(services.data?.pages ?? []).flatMap((page) =>
      page.data.map((s) => ({ id: `service:${s.id}`, label: `${s.title} (service)` })),
    ),
  ];
  if (!isValidBusiness) {
    return (
      <Text variant="muted" className="text-sm">
        This business can't take enquiries yet.
      </Text>
    );
  }
  return (
    <OptionPicker
      title="Product or service"
      placeholder="Choose what you are asking about"
      options={options}
      value={value ? `${value.type}:${value.id}` : null}
      isLoading={products.isPending || services.isPending}
      searchable
      onChange={(id) => {
        const [type, listingId] = id.split(':');
        if ((type === 'product' || type === 'service') && listingId) {
          onChange({ type, id: listingId });
        }
      }}
    />
  );
}

function EnquiryForm({ target, onClose }: { target: EnquiryTarget; onClose: () => void }) {
  const router = useRouter();
  const { showToast } = useApp();
  const phone = useSessionStore((state) => state.user?.phone);
  const create = useCreateEnquiry();
  const keys = useRef(createKeyRing(randomUUID)).current;
  const [values, setValues] = useState<EnquiryFormValues>(() =>
    emptyEnquiryForm(target.targetListing ?? null),
  );
  const [errors, setErrors] = useState<Partial<Record<EnquiryField, string>>>({});
  const [stateCode, setStateCode] = useState<string | null>(null);
  const states = useStates();
  const cities = useCities(stateCode);

  const set = <K extends keyof EnquiryFormValues>(key: K, value: EnquiryFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    create.reset();
  };

  const handleSubmit = () => {
    const result = toEnquiryDraft(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    create.mutate(
      { key: keys.keyFor(result.draft), draft: result.draft },
      {
        onSuccess: (enquiry) => {
          keys.reset();
          onClose();
          showToast(`Enquiry sent to ${enquiry.business.name}`, 'success');
          router.push(`/messages/${enquiry.conversationId}`);
        },
      },
    );
  };

  const messageLength = values.message.trim().length;
  const businessName = target.targetBusinessName ?? 'this business';

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="border-border flex-row items-center gap-2 border-b px-2 py-2">
          <Button variant="ghost" size="icon" onPress={onClose} accessibilityLabel="Close">
            <Icon as={X} size={20} />
          </Button>
          <View className="flex-1">
            <Text className="text-base font-bold">Send enquiry</Text>
            <Text variant="muted" className="text-xs" numberOfLines={1}>
              To {businessName}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
          <FormField label="Product or service" error={errors.listing}>
            {target.targetListing ? (
              <View className="bg-muted rounded-lg p-3">
                <Text className="text-sm font-semibold" numberOfLines={2}>
                  {target.targetTitle}
                </Text>
              </View>
            ) : (
              <ListingChoice
                businessId={target.targetBusinessId ?? ''}
                value={values.listing}
                onChange={(listing) => set('listing', listing)}
              />
            )}
          </FormField>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label="Quantity (optional)" error={errors.quantity}>
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
              <FormField label="Unit (optional)">
                <OptionPicker
                  title="Unit"
                  placeholder="Unit"
                  options={UNIT_OPTIONS}
                  value={values.unit}
                  onChange={(unit) => set('unit', unit as ProductUnit)}
                />
              </FormField>
            </View>
          </View>

          <FormField label="Delivery city (optional)">
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
            label="Message"
            hint={`${messageLength} / ${ENQUIRY_MESSAGE.max} (at least ${ENQUIRY_MESSAGE.min})`}
            error={errors.message}
          >
            <Textarea
              value={values.message}
              onChangeText={(text) => set('message', text)}
              maxLength={ENQUIRY_MESSAGE.max}
              numberOfLines={5}
              placeholder="Quantity, specifications, delivery timeline, GST invoice…"
              accessibilityLabel="Message"
            />
          </FormField>

          <Pressable
            onPress={() => set('sharePhone', !values.sharePhone)}
            className="min-h-11 flex-row items-start gap-3"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: values.sharePhone }}
            accessibilityLabel={`Share my phone number ${maskedPhone(phone)} with ${businessName}`}
          >
            <View
              className={cn(
                'border-input mt-0.5 size-5 items-center justify-center rounded border',
                values.sharePhone && 'bg-primary border-primary',
              )}
            >
              {values.sharePhone ? (
                <Icon as={Check} size={14} className="text-primary-foreground" />
              ) : null}
            </View>
            <View className="flex-1">
              <Text className="text-sm">
                Share my phone number ({maskedPhone(phone)}) with {businessName}
              </Text>
              <Text variant="muted" className="text-xs">
                Only this business sees it. Leave it unticked to talk in chat only.
              </Text>
            </View>
          </Pressable>

          {create.isError ? (
            <Text className="text-destructive text-sm" role="alert">
              {enquiryErrorMessage(create.error)}
            </Text>
          ) : null}
        </ScrollView>

        <View className="border-border flex-row gap-2 border-t p-3">
          <Button
            variant="outline"
            className="flex-1"
            onPress={onClose}
            disabled={create.isPending}
          >
            <Text>Cancel</Text>
          </Button>
          <Button className="flex-1" onPress={handleSubmit} disabled={create.isPending}>
            <Text>{create.isPending ? 'Sending' : 'Send enquiry'}</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Contact Supplier (product spec, Enquiries): POST /v1/enquiries, then opens the thread. */
export function EnquiryModal() {
  const { enquiryModal, closeEnquiryModal } = useApp();
  // A fresh form (and Idempotency-Key) every time the modal opens.
  const [session, setSession] = useState(0);
  useEffect(() => {
    if (enquiryModal.isOpen) setSession((n) => n + 1);
  }, [enquiryModal.isOpen]);
  const target = useMemo(() => enquiryModal, [enquiryModal]);

  return (
    <Modal
      visible={enquiryModal.isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeEnquiryModal}
    >
      {enquiryModal.isOpen ? (
        <EnquiryForm key={session} target={target} onClose={closeEnquiryModal} />
      ) : null}
    </Modal>
  );
}
