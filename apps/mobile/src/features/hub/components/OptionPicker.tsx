import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, View } from 'react-native';
import { Check, ChevronDown, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';

export interface PickerOption {
  id: string;
  label: string;
}

interface OptionPickerProps {
  title: string;
  placeholder: string;
  options: PickerOption[];
  value: string | null;
  onChange: (id: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  /** Shows a search box above the list; for long lists such as cities. */
  searchable?: boolean;
}

/** A select: a field that opens a full-screen list. */
export function OptionPicker({
  title,
  placeholder,
  options,
  value,
  onChange,
  isLoading = false,
  disabled = false,
  searchable = false,
}: OptionPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((option) => option.id === value);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? options.filter((option) => option.label.toLowerCase().includes(term)) : options;
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <Button
        variant="outline"
        className="justify-between"
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityLabel={`${title}: ${selected?.label ?? 'not chosen'}`}
      >
        <Text className={selected ? undefined : 'text-muted-foreground'} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
      </Button>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView className="bg-background flex-1">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-base font-semibold">{title}</Text>
            <Button variant="ghost" size="icon" onPress={close} accessibilityLabel="Close">
              <Icon as={X} size={20} />
            </Button>
          </View>
          {searchable ? (
            <View className="px-4 pb-2">
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder="Search"
                autoCapitalize="none"
                accessibilityLabel={`Search ${title}`}
              />
            </View>
          ) : null}
          {isLoading ? (
            <ActivityIndicator className="mt-8" />
          ) : (
            <FlatList
              data={visible}
              keyExtractor={(option) => option.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text variant="muted" className="p-4 text-center">
                  Nothing to choose from.
                </Text>
              }
              renderItem={({ item }) => (
                <Button
                  variant="ghost"
                  className="justify-between rounded-none px-4"
                  onPress={() => {
                    onChange(item.id);
                    close();
                  }}
                  accessibilityState={{ selected: item.id === value }}
                >
                  <Text>{item.label}</Text>
                  {item.id === value ? <Icon as={Check} size={16} /> : null}
                </Button>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}
