import React from 'react';
import { View } from 'react-native';
import { Archive, Pencil, Send, Trash2 } from 'lucide-react-native';
import { ListingStatus } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';

const STATUS_TABS: { status: ListingStatus; label: string }[] = [
  { status: ListingStatus.Published, label: 'Published' },
  { status: ListingStatus.Draft, label: 'Drafts' },
  { status: ListingStatus.Archived, label: 'Archived' },
];

interface ListingStatusTabsProps {
  value: ListingStatus;
  onChange: (status: ListingStatus) => void;
}

/** Switches the list between published, draft and archived listings. */
export function ListingStatusTabs({ value, onChange }: ListingStatusTabsProps) {
  return (
    <View className="bg-muted flex-row gap-1 rounded-lg p-1">
      {STATUS_TABS.map((tab) => {
        const isActive = tab.status === value;
        return (
          <Button
            key={tab.status}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onPress={() => onChange(tab.status)}
            accessibilityState={{ selected: isActive }}
          >
            <Text className={cn('text-xs font-semibold')}>{tab.label}</Text>
          </Button>
        );
      })}
    </View>
  );
}

interface ListingRowActionsProps {
  status: ListingStatus;
  isBusy: boolean;
  onPublish: () => void;
  onArchive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Publish or archive, edit and delete one listing. */
export function ListingRowActions({
  status,
  isBusy,
  onPublish,
  onArchive,
  onEdit,
  onDelete,
}: ListingRowActionsProps) {
  const isPublished = status === ListingStatus.Published;
  return (
    <View className="flex-row items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isBusy}
        onPress={isPublished ? onArchive : onPublish}
        accessibilityLabel={isPublished ? 'Archive listing' : 'Publish listing'}
      >
        <Icon as={isPublished ? Archive : Send} size={12} />
        <Text className="text-xs">{isPublished ? 'Archive' : 'Publish'}</Text>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={isBusy}
        onPress={onEdit}
        accessibilityLabel="Edit listing"
      >
        <Icon as={Pencil} size={15} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={isBusy}
        onPress={onDelete}
        accessibilityLabel="Delete listing"
      >
        <Icon as={Trash2} size={15} className="text-destructive" />
      </Button>
    </View>
  );
}
