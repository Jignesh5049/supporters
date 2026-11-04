import React from 'react';
import { View } from 'react-native';
import { Input } from '@supporters/ui-native/components/input';
import { FormField } from './FormField';
import type { EditTabProps } from './EditBusinessBasicTab';

export function EditBusinessSocialTab({ values, onChange }: EditTabProps) {
  return (
    <View className="gap-4 p-4">
      <FormField label="Instagram Profile Link">
        <Input
          value={values.instagram}
          onChangeText={(instagram) => onChange({ instagram })}
          placeholder="https://instagram.com/shree_electronics"
          keyboardType="url"
          autoCapitalize="none"
        />
      </FormField>

      <FormField label="Company Website URL">
        <Input
          value={values.website}
          onChangeText={(website) => onChange({ website })}
          placeholder="https://shreeelectronics.in"
          keyboardType="url"
          autoCapitalize="none"
        />
      </FormField>

      <FormField label="Facebook Page Link">
        <Input
          value={values.facebook}
          onChangeText={(facebook) => onChange({ facebook })}
          placeholder="https://facebook.com/shreeelectronics"
          keyboardType="url"
          autoCapitalize="none"
        />
      </FormField>

      <FormField label="YouTube Channel / Demo Reel">
        <Input
          value={values.youtube}
          onChangeText={(youtube) => onChange({ youtube })}
          placeholder="https://youtube.com/@shreeelectronics"
          keyboardType="url"
          autoCapitalize="none"
        />
      </FormField>
    </View>
  );
}
