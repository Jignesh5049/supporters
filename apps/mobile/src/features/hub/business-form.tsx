import { BusinessType, UploadPurpose } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { BUSINESS_TYPE_LABELS } from '../catalog/format';
import { useCities, useStates } from '../catalog/queries';
import { CategoryField, ChoiceField, FieldError, ImagesField, TextField } from './form-controls';
import type { BusinessFormValues, FieldErrors } from './forms';

const TYPE_OPTIONS = Object.values(BusinessType).map((value) => ({
  value,
  label: BUSINESS_TYPE_LABELS[value],
}));

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Show on my page' },
  { value: 'hidden', label: 'Keep private' },
] as const;

/** States, then the cities of the chosen state, both from the API. */
function PlaceFields({
  stateCode,
  cityId,
  onStateChange,
  onCityChange,
  error,
}: {
  stateCode: string;
  cityId: string;
  onStateChange: (code: string) => void;
  onCityChange: (id: string) => void;
  error?: string;
}) {
  const states = useStates();
  const cities = useCities(stateCode);
  const [cityFilter, setCityFilter] = useState('');

  if (!states.data) {
    return states.isLoading ? (
      <Text variant="muted">Loading states…</Text>
    ) : (
      <Button variant="outline" onPress={() => void states.refetch()}>
        <Text>Couldn't load states. Try again</Text>
      </Button>
    );
  }
  const filter = cityFilter.trim().toLowerCase();
  const cityOptions = (cities.data ?? [])
    .filter((city) => city.id === cityId || city.name.toLowerCase().includes(filter))
    .map((city) => ({ value: city.id, label: city.name }));

  return (
    <>
      <ChoiceField
        label="State"
        options={states.data.map((state) => ({ value: state.code, label: state.name }))}
        value={stateCode}
        onChange={onStateChange}
      />
      {stateCode !== '' && (
        <>
          <TextField
            label="Find your city"
            value={cityFilter}
            onChangeText={setCityFilter}
            placeholder="Type a city name"
          />
          {cities.isLoading ? (
            <Text variant="muted">Loading cities…</Text>
          ) : (
            <ChoiceField
              label="City"
              options={cityOptions}
              value={cityId}
              onChange={onCityChange}
            />
          )}
        </>
      )}
      <FieldError message={error} />
    </>
  );
}

/** The business profile fields, for onboarding and for editing in the Hub. */
export function BusinessForm({
  title,
  initialValues,
  submitLabel,
  isSaving,
  formError,
  errors,
  onSubmit,
}: {
  title: string;
  initialValues: BusinessFormValues;
  submitLabel: string;
  isSaving: boolean;
  formError: string | null;
  errors: FieldErrors;
  onSubmit: (values: BusinessFormValues) => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [cleared, setCleared] = useState<Record<string, boolean>>({});
  const set = <K extends keyof BusinessFormValues>(key: K, value: BusinessFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setCleared((current) => ({ ...current, [key]: true }));
  };
  const errorFor = (key: string) => (cleared[key] ? undefined : errors[key]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-background flex-1"
    >
      <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <Text variant="h4">{title}</Text>
        <TextField
          label="Business name"
          value={values.name}
          onChangeText={(value) => set('name', value)}
          error={errorFor('name')}
        />
        <ChoiceField
          label="Business type"
          options={TYPE_OPTIONS}
          value={values.type}
          onChange={(value) => set('type', value)}
          error={errorFor('type')}
        />
        <CategoryField
          topLevelOnly
          value={values.categoryId}
          onChange={(value) => set('categoryId', value)}
          error={errorFor('categoryId')}
        />
        <PlaceFields
          stateCode={values.stateCode}
          cityId={values.cityId}
          onStateChange={(code) => {
            set('stateCode', code);
            set('cityId', '');
          }}
          onCityChange={(id) => set('cityId', id)}
          error={errorFor('cityId')}
        />
        <ImagesField
          label="Logo (optional)"
          images={values.logo ? [values.logo] : []}
          onChange={(images) => set('logo', images[0] ?? null)}
          max={1}
          purpose={UploadPurpose.Avatar}
          error={errorFor('logoMediaId')}
        />
        <ImagesField
          label="Cover photo (optional)"
          images={values.cover ? [values.cover] : []}
          onChange={(images) => set('cover', images[0] ?? null)}
          max={1}
          purpose={UploadPurpose.Cover}
          error={errorFor('coverMediaId')}
        />
        <TextField
          label="About (optional)"
          value={values.about}
          onChangeText={(value) => set('about', value)}
          multiline
          error={errorFor('about')}
        />
        <TextField
          label="Contact phone (optional)"
          value={values.contactPhone}
          onChangeText={(value) => set('contactPhone', value)}
          keyboardType="phone-pad"
          placeholder="+91"
          error={errorFor('contactPhone')}
        />
        <TextField
          label="Contact email (optional)"
          value={values.contactEmail}
          onChangeText={(value) => set('contactEmail', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errorFor('contactEmail')}
        />
        <ChoiceField
          label="Contact details"
          options={VISIBILITY_OPTIONS}
          value={values.isContactPublic ? 'public' : 'hidden'}
          onChange={(value) => set('isContactPublic', value === 'public')}
        />
        <TextField
          label="Website (optional)"
          value={values.website}
          onChangeText={(value) => set('website', value)}
          keyboardType="url"
          autoCapitalize="none"
          placeholder="https://"
          error={errorFor('website')}
        />
        <TextField
          label="Address (optional)"
          value={values.address}
          onChangeText={(value) => set('address', value)}
          multiline
          error={errorFor('address')}
        />
        <TextField
          label="PIN code (optional)"
          value={values.pincode}
          onChangeText={(value) => set('pincode', value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          error={errorFor('pincode')}
        />
        <FieldError message={formError ?? undefined} />
        <Button
          onPress={() => {
            // A new submit brings new errors: show them all again.
            setCleared({});
            onSubmit(values);
          }}
          disabled={isSaving}
        >
          <Text>{isSaving ? 'Saving…' : submitLabel}</Text>
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
