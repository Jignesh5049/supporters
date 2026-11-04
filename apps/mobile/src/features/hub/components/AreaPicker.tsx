import React, { useState } from 'react';
import { Modal, ScrollView, Switch, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import type { AreaValues } from '../../catalog/listing-form';
import { useStates } from '../../places/hooks';

interface AreaPickerProps {
  label: string;
  value: AreaValues;
  onChange: (area: AreaValues) => void;
}

/** "All India", or a list of states. */
export function AreaPicker({ label, value, onChange }: AreaPickerProps) {
  const [open, setOpen] = useState(false);
  const states = useStates();
  const stateNames = new Map((states.data ?? []).map((state) => [state.id, state.name]));
  const chosen = value.stateIds.map((id) => stateNames.get(id)).filter(Boolean);

  const toggle = (id: string) =>
    onChange({
      ...value,
      stateIds: value.stateIds.includes(id)
        ? value.stateIds.filter((existing) => existing !== id)
        : [...value.stateIds, id],
    });

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium">All India</Text>
        <Switch
          value={value.allIndia}
          onValueChange={(allIndia) =>
            onChange(allIndia ? { allIndia, stateIds: [], cityIds: [] } : { ...value, allIndia })
          }
          accessibilityLabel={`${label}: all India`}
        />
      </View>
      {value.allIndia ? null : (
        <>
          <Button
            variant="outline"
            onPress={() => setOpen(true)}
            accessibilityLabel="Choose states"
          >
            <Text numberOfLines={1}>{chosen.length > 0 ? chosen.join(', ') : 'Choose states'}</Text>
          </Button>
          {value.cityIds.length > 0 ? (
            <Text variant="muted" className="text-xs">
              Also covers {value.cityIds.length} {value.cityIds.length === 1 ? 'city' : 'cities'}{' '}
              chosen earlier.
            </Text>
          ) : null}
        </>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="bg-background flex-1">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-base font-semibold">{label}</Text>
            <Button size="sm" onPress={() => setOpen(false)}>
              <Text>Done</Text>
            </Button>
          </View>
          <ScrollView>
            {(states.data ?? []).map((state) => {
              const isChosen = value.stateIds.includes(state.id);
              return (
                <Button
                  key={state.id}
                  variant="ghost"
                  className="justify-between rounded-none px-4"
                  onPress={() => toggle(state.id)}
                  accessibilityState={{ checked: isChosen }}
                >
                  <Text>{state.name}</Text>
                  {isChosen ? <Icon as={Check} size={16} /> : null}
                </Button>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
