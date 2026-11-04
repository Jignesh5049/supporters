import React from 'react';
import { Switch, View } from 'react-native';
import { DayOfWeek } from '@supporters/shared';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { DAY_NAMES, type Day } from '../../business/business-form';
import type { EditTabProps } from './EditBusinessBasicTab';

/** Opening hours, one slot per day. Leave both times empty for a closed day. */
export function EditBusinessOperationsTab({ values, onChange }: EditTabProps) {
  const setDay = (day: Day, change: Partial<{ opens: string; closes: string }>) =>
    onChange({ hours: { ...values.hours, [day]: { ...values.hours[day], ...change } } });

  return (
    <View className="gap-4 p-4">
      <Text variant="muted" className="text-xs">
        Use 24-hour times, like 09:30 and 19:30. Leave a day empty if you are closed.
      </Text>
      {DayOfWeek.map((day) => (
        <View key={day} className="flex-row items-center gap-2">
          <Text className="w-24 text-sm font-medium">{DAY_NAMES[day]}</Text>
          <Input
            className="flex-1"
            value={values.hours[day].opens}
            onChangeText={(opens) => setDay(day, { opens })}
            placeholder="Opens"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            accessibilityLabel={`${DAY_NAMES[day]} opening time`}
          />
          <Text variant="muted">to</Text>
          <Input
            className="flex-1"
            value={values.hours[day].closes}
            onChangeText={(closes) => setDay(day, { closes })}
            placeholder="Closes"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            accessibilityLabel={`${DAY_NAMES[day]} closing time`}
          />
        </View>
      ))}

      <View className="border-border flex-row items-center justify-between gap-3 border-t pt-4">
        <View className="flex-1">
          <Text className="text-sm font-medium">Show phone and email on my page</Text>
          <Text variant="muted" className="text-xs">
            Buyers see your contact details on your public page.
          </Text>
        </View>
        <Switch
          value={values.isContactPublic}
          onValueChange={(isContactPublic) => onChange({ isContactPublic })}
          accessibilityLabel="Show phone and email on my page"
        />
      </View>
    </View>
  );
}
