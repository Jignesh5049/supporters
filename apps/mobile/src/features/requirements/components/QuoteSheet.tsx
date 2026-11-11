import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Requirement } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import { useApp } from '../../../context/AppContext';
import { useMyProducts, useMyServices } from '../../catalog/hooks';
import { FormField } from '../../hub/components/FormField';
import { OptionPicker } from '../../hub/components/OptionPicker';
import { useSendQuote } from '../hooks';
import {
  QUOTE_TEXT,
  emptyQuoteForm,
  quoteErrorMessage,
  requirementQuantity,
  requirementTitle,
  toQuoteInput,
  type QuoteFormValues,
} from '../requirement-form';

interface QuoteSheetProps {
  requirement: Requirement | null;
  onClose: () => void;
}

/** Send a quote (product spec, Buyer requirements: Quotes). Verified businesses only. */
export function QuoteSheet({ requirement, onClose }: QuoteSheetProps) {
  return (
    <Modal
      visible={requirement !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {requirement ? <QuoteForm requirement={requirement} onClose={onClose} /> : null}
    </Modal>
  );
}

function QuoteForm({ requirement, onClose }: { requirement: Requirement; onClose: () => void }) {
  const router = useRouter();
  const { showToast } = useApp();
  const send = useSendQuote();
  // One key per open form: a retry after a timeout returns the stored quote.
  const key = useRef(randomUUID()).current;
  const [values, setValues] = useState<QuoteFormValues>(emptyQuoteForm);
  const [errors, setErrors] = useState<Partial<Record<'price' | 'message', string>>>({});
  const products = useMyProducts({ status: 'published' });
  const services = useMyServices({ status: 'published' });
  const listingOptions = [
    ...(products.data?.pages ?? []).flatMap((page) =>
      page.data.map((p) => ({ id: `product:${p.id}`, label: p.title })),
    ),
    ...(services.data?.pages ?? []).flatMap((page) =>
      page.data.map((s) => ({ id: `service:${s.id}`, label: `${s.title} (service)` })),
    ),
  ];

  const set = <K extends keyof QuoteFormValues>(field: K, value: QuoteFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    send.reset();
  };

  const handleSubmit = () => {
    const result = toQuoteInput(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    send.mutate(
      { id: requirement.id, key, input: result.input },
      {
        onSuccess: (quote) => {
          onClose();
          showToast('Quote sent to the buyer', 'success');
          router.push(`/messages/${quote.conversationId}`);
        },
      },
    );
  };

  const messageLength = values.message.trim().length;
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
            <Text className="text-base font-bold">Send a quote</Text>
            <Text variant="muted" className="text-xs" numberOfLines={1}>
              {requirementTitle(requirement)} · {requirementQuantity(requirement)}
            </Text>
          </View>
        </View>
        <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
          <FormField
            label="Your price (₹)"
            hint="The total for the quantity asked."
            error={errors.price}
          >
            <Input
              value={values.price}
              onChangeText={(text) => set('price', text)}
              keyboardType="decimal-pad"
              placeholder="e.g. 1,25,000"
              accessibilityLabel="Your price in rupees"
            />
          </FormField>
          <FormField
            label="Message"
            hint={`${messageLength} / ${QUOTE_TEXT.max} (at least ${QUOTE_TEXT.min})`}
            error={errors.message}
          >
            <Textarea
              value={values.message}
              onChangeText={(text) => set('message', text)}
              maxLength={QUOTE_TEXT.max}
              numberOfLines={5}
              placeholder="Delivery time, terms, what is included"
              accessibilityLabel="Message"
            />
          </FormField>
          <FormField label="Attach a listing (optional)">
            <OptionPicker
              title="Listing"
              placeholder="None"
              options={[{ id: '', label: 'None' }, ...listingOptions]}
              value={values.listing ? `${values.listing.type}:${values.listing.id}` : ''}
              isLoading={products.isPending || services.isPending}
              searchable
              onChange={(id) => {
                const [type, listingId] = id.split(':');
                set(
                  'listing',
                  (type === 'product' || type === 'service') && listingId
                    ? { type, id: listingId }
                    : null,
                );
              }}
            />
          </FormField>
          {send.isError ? (
            <Text className="text-destructive text-sm" role="alert">
              {quoteErrorMessage(send.error)}
            </Text>
          ) : null}
          <Button onPress={handleSubmit} disabled={send.isPending} accessibilityLabel="Send quote">
            <Text>{send.isPending ? 'Sending…' : 'Send quote'}</Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
