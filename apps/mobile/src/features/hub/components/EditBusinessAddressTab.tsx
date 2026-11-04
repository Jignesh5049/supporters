import React from 'react';
import { View } from 'react-native';
import { BUSINESS_LIMITS } from '@supporters/shared';
import { Input } from '@supporters/ui-native/components/input';
import { useCities, useStates } from '../../places/hooks';
import { FormField } from './FormField';
import { OptionPicker } from './OptionPicker';
import type { EditTabProps } from './EditBusinessBasicTab';

export function EditBusinessAddressTab({ values, onChange }: EditTabProps) {
  const states = useStates();
  const cities = useCities(values.stateCode || null);

  return (
    <View className="gap-4 p-4">
      <FormField label="Street / Factory Address">
        <Input
          value={values.address}
          onChangeText={(address) => onChange({ address })}
          maxLength={BUSINESS_LIMITS.address.max}
          placeholder="e.g. Plot 42, Phase II, GIDC Industrial Estate, Naroda"
        />
      </FormField>

      <FormField label="State *">
        <OptionPicker
          title="State"
          placeholder="Choose a state"
          options={(states.data ?? []).map((state) => ({ id: state.code, label: state.name }))}
          value={values.stateCode || null}
          // A city belongs to one state, so changing the state clears the city.
          onChange={(stateCode) => onChange({ stateCode, cityId: '' })}
          isLoading={states.isPending}
          searchable
        />
      </FormField>

      <FormField label="City *">
        <OptionPicker
          title="City"
          placeholder={values.stateCode ? 'Choose a city' : 'Choose a state first'}
          options={(cities.data ?? []).map((city) => ({ id: city.id, label: city.name }))}
          value={values.cityId || null}
          onChange={(cityId) => onChange({ cityId })}
          isLoading={cities.isPending && Boolean(values.stateCode)}
          disabled={!values.stateCode}
          searchable
        />
      </FormField>

      <FormField label="PIN Code">
        <Input
          value={values.pincode}
          onChangeText={(pincode) => onChange({ pincode })}
          placeholder="382330"
          keyboardType="numeric"
          maxLength={6}
        />
      </FormField>

      <FormField label="Google Maps Location URL">
        <Input
          value={values.mapUrl}
          onChangeText={(mapUrl) => onChange({ mapUrl })}
          placeholder="https://maps.google.com/?q=..."
          keyboardType="url"
          autoCapitalize="none"
        />
      </FormField>
    </View>
  );
}
