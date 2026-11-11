import React, { useState } from 'react';
import { Modal, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { BusinessType } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Label } from '@supporters/ui-native/components/label';
import { Text } from '@supporters/ui-native/components/text';
import { useCategoriesQuery } from '../../categories/hooks';
import { OptionPicker, type PickerOption } from '../../hub/components/OptionPicker';
import { useCities, useStates } from '../../places/hooks';
import {
  type SearchState,
  availabilityOptions,
  clearFilters,
  filtersFor,
  rupeesToPaise,
  withFilter,
} from '../search-state';

const ANY = '';
const BUSINESS_TYPE_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  wholesaler: 'Wholesaler',
  retailer: 'Retailer',
  distributor: 'Distributor',
  brand: 'Brand',
  service_provider: 'Service provider',
};
const RATINGS = [
  { id: '4.5', label: '4.5 and up' },
  { id: '4', label: '4 and up' },
  { id: '3', label: '3 and up' },
];

const withAny = (label: string, options: PickerOption[]): PickerOption[] => [
  { id: ANY, label },
  ...options,
];
const paiseText = (paise: number | undefined) => (paise === undefined ? '' : String(paise / 100));

interface FilterSheetProps {
  visible: boolean;
  state: SearchState;
  onApply: (state: SearchState) => void;
  onClose: () => void;
}

/** Filters for the current tab, edited as a draft and applied together. */
export function FilterSheet({ visible, state, onApply, onClose }: FilterSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Remounts with the applied state each time it opens. */}
      {visible ? <FilterForm state={state} onApply={onApply} onClose={onClose} /> : null}
    </Modal>
  );
}

function FilterForm({ state, onApply, onClose }: Omit<FilterSheetProps, 'visible'>) {
  const [draft, setDraft] = useState(state);
  const [minText, setMinText] = useState(paiseText(state.priceMin));
  const [maxText, setMaxText] = useState(paiseText(state.priceMax));
  const [moqText, setMoqText] = useState(state.moqMax ? String(state.moqMax) : '');
  const [error, setError] = useState<string | null>(null);
  const shown = filtersFor(draft.type);
  const categories = useCategoriesQuery();
  const states = useStates();
  const cities = useCities(draft.state ?? null);

  const categoryOptions = (categories.data?.data ?? []).flatMap((category) => [
    { id: category.slug, label: category.name },
    ...category.subcategories.map((sub) => ({ id: sub.slug, label: `  ${sub.name}` })),
  ]);
  const pick =
    <K extends 'category' | 'state' | 'city'>(key: K) =>
    (id: string) =>
      setDraft((current) => withFilter(current, key, id === ANY ? undefined : id));

  const apply = () => {
    let next = draft;
    if (shown.has('priceMin')) {
      const min = minText.trim() ? rupeesToPaise(minText) : undefined;
      const max = maxText.trim() ? rupeesToPaise(maxText) : undefined;
      if (min === null || max === null) return setError('Enter prices in rupees.');
      if (min !== undefined && max !== undefined && min > max) {
        return setError('The maximum price must be at least the minimum.');
      }
      next = withFilter(withFilter(next, 'priceMin', min), 'priceMax', max);
    }
    if (shown.has('moqMax')) {
      const moq = Number.parseInt(moqText, 10);
      next = withFilter(next, 'moqMax', Number.isInteger(moq) && moq > 0 ? moq : undefined);
    }
    onApply(next);
  };

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="border-border flex-row items-center justify-between border-b px-4 py-3">
        <Text className="text-base font-semibold">Filters</Text>
        <Button variant="ghost" size="icon" onPress={onClose} accessibilityLabel="Close filters">
          <Icon as={X} size={20} />
        </Button>
      </View>
      <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
        <Field label="Category">
          <OptionPicker
            title="Category"
            placeholder="All categories"
            options={withAny('All categories', categoryOptions)}
            value={draft.category ?? ANY}
            onChange={pick('category')}
            isLoading={categories.isPending}
            searchable
          />
        </Field>
        <Field label="State">
          <OptionPicker
            title="State"
            placeholder="All India"
            options={withAny(
              'All India',
              (states.data ?? []).map((item) => ({ id: item.code, label: item.name })),
            )}
            value={draft.state ?? ANY}
            onChange={pick('state')}
            isLoading={states.isPending}
            searchable
          />
        </Field>
        <Field label="City">
          <OptionPicker
            title="City"
            placeholder={draft.state ? 'All cities' : 'Pick a state first'}
            options={withAny(
              'All cities',
              (cities.data ?? []).map((city) => ({ id: city.id, label: city.name })),
            )}
            value={draft.city ?? ANY}
            onChange={pick('city')}
            isLoading={cities.isFetching}
            disabled={!draft.state}
            searchable
          />
        </Field>
        <Field label="Business type">
          <OptionPicker
            title="Business type"
            placeholder="Any type"
            options={withAny(
              'Any type',
              Object.values(BusinessType).map((type) => ({
                id: type,
                label: BUSINESS_TYPE_LABELS[type] ?? type,
              })),
            )}
            value={draft.businessType ?? ANY}
            onChange={(id) =>
              setDraft((current) =>
                withFilter(
                  current,
                  'businessType',
                  (id || undefined) as SearchState['businessType'],
                ),
              )
            }
          />
        </Field>
        <View className="min-h-11 flex-row items-center justify-between">
          <Label nativeID="verified-only">Verified businesses only</Label>
          <Switch
            accessibilityLabelledBy="verified-only"
            accessibilityLabel="Verified businesses only"
            value={draft.verified === true}
            onValueChange={(on) =>
              setDraft((current) => withFilter(current, 'verified', on ? true : undefined))
            }
          />
        </View>

        {shown.has('priceMin') ? (
          <Field label="Price (₹)">
            <View className="flex-row gap-2">
              <Input
                className="flex-1"
                value={minText}
                onChangeText={setMinText}
                placeholder="Min"
                keyboardType="decimal-pad"
                accessibilityLabel="Minimum price in rupees"
              />
              <Input
                className="flex-1"
                value={maxText}
                onChangeText={setMaxText}
                placeholder="Max"
                keyboardType="decimal-pad"
                accessibilityLabel="Maximum price in rupees"
              />
            </View>
          </Field>
        ) : null}
        {shown.has('availability') ? (
          <Field label="Availability">
            <OptionPicker
              title="Availability"
              placeholder="Any"
              options={withAny(
                'Any',
                availabilityOptions(draft.type).map((option) => ({
                  id: option.value,
                  label: option.label,
                })),
              )}
              value={draft.availability ?? ANY}
              onChange={(id) =>
                setDraft((current) =>
                  withFilter(
                    current,
                    'availability',
                    (id || undefined) as SearchState['availability'],
                  ),
                )
              }
            />
          </Field>
        ) : null}
        {shown.has('moqMax') ? (
          <Field label="Maximum MOQ">
            <Input
              value={moqText}
              onChangeText={(value) => setMoqText(value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              accessibilityLabel="Maximum minimum order quantity"
            />
          </Field>
        ) : null}
        {shown.has('ratingMin') ? (
          <Field label="Rating">
            <OptionPicker
              title="Rating"
              placeholder="Any rating"
              options={withAny('Any rating', RATINGS)}
              value={draft.ratingMin === undefined ? ANY : String(draft.ratingMin)}
              onChange={(id) =>
                setDraft((current) => withFilter(current, 'ratingMin', id ? Number(id) : undefined))
              }
            />
          </Field>
        ) : null}
        {error ? (
          <Text className="text-destructive text-sm" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <View className="border-border flex-row gap-2 border-t p-4">
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => {
            setDraft(clearFilters(draft));
            setMinText('');
            setMaxText('');
            setMoqText('');
            setError(null);
          }}
        >
          <Text>Clear all</Text>
        </Button>
        <Button className="flex-1" onPress={apply}>
          <Text>Show results</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium">{label}</Text>
      {children}
    </View>
  );
}
