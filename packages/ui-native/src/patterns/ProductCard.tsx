import * as React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Card } from '@supporters/ui-native/components/card';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';
import { MessageSquare } from 'lucide-react-native';

export interface ProductCardData {
  id: string;
  title: string;
  price: number;
  currency?: string;
  moq?: number;
  unit?: string;
  imageUrl?: string;
  businessName?: string;
}

export interface ProductCardProps {
  product: ProductCardData;
  onPress?: () => void;
  onEnquiry?: () => void;
  className?: string;
}

export function ProductCard({ product, onPress, onEnquiry, className }: ProductCardProps) {
  const formattedPrice = `₹${product.price.toLocaleString('en-IN')}`;

  return (
    <Card className={cn('overflow-hidden p-0', className)}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={product.title}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            className="h-36 w-full bg-muted object-cover"
            resizeMode="cover"
          />
        ) : (
          <View className="h-36 w-full items-center justify-center bg-muted">
            <Text variant="muted" className="text-xs">
              No Image Available
            </Text>
          </View>
        )}

        <View className="p-3">
          {product.businessName ? (
            <Text
              variant="muted"
              className="text-[11px] uppercase tracking-wider"
              numberOfLines={1}
            >
              {product.businessName}
            </Text>
          ) : null}

          <Text variant="large" className="mt-0.5 font-bold text-sm" numberOfLines={2}>
            {product.title}
          </Text>

          <View className="mt-2 flex flex-row items-baseline gap-1.5">
            <Text className="text-primary font-black text-base">{formattedPrice}</Text>
            {product.unit ? (
              <Text variant="muted" className="text-xs">
                / {product.unit}
              </Text>
            ) : null}
          </View>

          {product.moq ? (
            <View className="mt-1 flex flex-row items-center gap-1">
              <Badge variant="outline" className="px-1.5 py-0">
                <Text className="text-[10px]">
                  Min. Order: {product.moq} {product.unit || 'units'}
                </Text>
              </Badge>
            </View>
          ) : null}
        </View>
      </Pressable>

      {onEnquiry ? (
        <View className="border-t border-border p-2">
          <Button variant="outline" size="sm" className="w-full gap-1.5" onPress={onEnquiry}>
            <MessageSquare size={14} color="#2E3192" />
            <Text className="text-primary font-bold text-xs">Request Quote</Text>
          </Button>
        </View>
      ) : null}
    </Card>
  );
}
