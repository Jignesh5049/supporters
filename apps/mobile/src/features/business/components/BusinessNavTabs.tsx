import React from 'react';
import { View } from 'react-native';
import { Tabs, TabsList, TabsTrigger } from '@supporters/ui-native/components/tabs';
import { Text } from '@supporters/ui-native/components/text';

export type BusinessTabType = 'products' | 'services' | 'posts' | 'about';

const TABS: { value: BusinessTabType; label: string }[] = [
  { value: 'products', label: 'Products' },
  { value: 'services', label: 'Services' },
  { value: 'posts', label: 'Posts' },
  { value: 'about', label: 'About' },
];

interface BusinessNavTabsProps {
  activeTab: BusinessTabType;
  onTabChange: (tab: BusinessTabType) => void;
}

export function BusinessNavTabs({ activeTab, onTabChange }: BusinessNavTabsProps) {
  return (
    <View className="bg-card border-border border-b px-4 py-2">
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as BusinessTabType)}>
        <TabsList className="w-full">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
              <Text>{tab.label}</Text>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </View>
  );
}
