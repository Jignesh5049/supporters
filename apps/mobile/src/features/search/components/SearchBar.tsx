import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Building2, Package, Search, Wrench, X } from 'lucide-react-native';
import type { Suggestion } from '@supporters/shared';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { useSuggestions } from '../hooks';

const seg = encodeURIComponent;
const ICONS = { business: Building2, product: Package, service: Wrench, post: Search };
const KINDS = { business: 'Business', product: 'Product', service: 'Service', post: 'Post' };

export function suggestionPath(suggestion: Suggestion): string {
  switch (suggestion.type) {
    case 'business':
      return `/business/${seg(suggestion.slug ?? '')}`;
    case 'product':
    case 'service':
    case 'post':
      return `/${suggestion.type}/${seg(suggestion.id)}`;
  }
}

interface SearchBarProps {
  initialQuery?: string;
  onSubmit: (q: string) => void;
  autoFocus?: boolean;
}

/** The search input with autocomplete from 2 characters; a suggestion opens its page. */
export function SearchBar({ initialQuery = '', onSubmit, autoFocus }: SearchBarProps) {
  const [text, setText] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const suggestions = useSuggestions(text);
  const items = isFocused ? suggestions : [];

  return (
    <View className="z-10">
      <View className="justify-center">
        <Input
          value={text}
          onChangeText={setText}
          onFocus={() => setIsFocused(true)}
          // Let a tap on a suggestion land before the list closes.
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onSubmitEditing={() => {
            setIsFocused(false);
            onSubmit(text.trim());
          }}
          placeholder="Search businesses, products, services…"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          accessibilityLabel="Search businesses, products, services and posts"
          className="pl-10 pr-10"
        />
        <View className="absolute left-3" pointerEvents="none">
          <Icon as={Search} size={16} className="text-muted-foreground" />
        </View>
        {text ? (
          <Pressable
            onPress={() => {
              setText('');
              onSubmit('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={12}
            className="absolute right-3"
          >
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Pressable>
        ) : null}
      </View>
      {items.length > 0 ? (
        <View
          accessibilityRole="list"
          accessibilityLabel="Suggestions"
          className="border-border bg-popover mt-1 overflow-hidden rounded-xl border"
        >
          {items.map((item) => (
            <Pressable
              key={`${item.type}-${item.id}`}
              onPress={() => {
                setIsFocused(false);
                router.push(suggestionPath(item));
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${KINDS[item.type]}`}
              className="min-h-11 flex-row items-center gap-3 px-3 py-2"
            >
              <Icon as={ICONS[item.type]} size={16} className="text-muted-foreground" />
              <Text className="flex-1 text-sm" numberOfLines={1}>
                {item.label}
              </Text>
              <Text variant="muted" className="text-xs">
                {KINDS[item.type]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
