import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';

export interface SheetAction {
  key: string;
  label: string;
  icon: LucideIcon;
  isDestructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  title: string;
  isOpen: boolean;
  actions: SheetAction[];
  onClose: () => void;
}

/** A bottom sheet of actions (Android alerts hold only three buttons). */
export function ActionSheet({ title, isOpen, actions, onClose }: ActionSheetProps) {
  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/40"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View className="bg-background gap-1 rounded-t-2xl p-4 pb-8">
        <Text className="mb-2 text-base font-semibold">{title}</Text>
        {actions.map((action) => (
          <Button
            key={action.key}
            variant="ghost"
            className="justify-start gap-3"
            onPress={() => {
              onClose();
              action.onPress();
            }}
            accessibilityLabel={action.label}
          >
            <Icon
              as={action.icon}
              size={18}
              className={action.isDestructive ? 'text-destructive' : 'text-foreground'}
            />
            <Text className={cn(action.isDestructive && 'text-destructive')}>{action.label}</Text>
          </Button>
        ))}
        <Button variant="outline" className="mt-2" onPress={onClose}>
          <Text>Cancel</Text>
        </Button>
      </View>
    </Modal>
  );
}
