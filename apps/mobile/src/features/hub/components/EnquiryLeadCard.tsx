import React from 'react';
import { View } from 'react-native';
import { CheckCircle, MapPin, MessageSquare, Phone } from 'lucide-react-native';
import type { Enquiry } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Card } from '@supporters/ui-native/components/card';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { enquiryQuantity, ENQUIRY_STATUS_LABEL } from '../../enquiries/labels';
import { inboxTime } from '../../messages/labels';

export interface EnquiryLeadCardProps {
  enquiry: Enquiry;
  isClosing: boolean;
  onReply: (enquiry: Enquiry) => void;
  onCall: (phone: string) => void;
  onClose: (enquiry: Enquiry) => void;
}

/** One enquiry in the owner's inbox. The phone shows only when the buyer chose to share it. */
export function EnquiryLeadCard({
  enquiry,
  isClosing,
  onReply,
  onCall,
  onClose,
}: EnquiryLeadCardProps) {
  const quantity = enquiryQuantity(enquiry);
  return (
    <Card className="gap-2 p-4">
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-sm font-bold" numberOfLines={1}>
          {enquiry.buyer.name}
        </Text>
        <Badge
          variant={
            enquiry.status === 'new'
              ? 'default'
              : enquiry.status === 'closed'
                ? 'outline'
                : 'secondary'
          }
        >
          <Text>{ENQUIRY_STATUS_LABEL[enquiry.status]}</Text>
        </Badge>
      </View>
      <Text className="text-primary text-sm font-semibold" numberOfLines={2}>
        {enquiry.listing?.title ?? 'Listing no longer available'}
      </Text>
      {quantity || enquiry.deliveryCity ? (
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          {quantity ? <Text className="text-xs font-semibold">Qty: {quantity}</Text> : null}
          {enquiry.deliveryCity ? (
            <View className="flex-row items-center gap-1">
              <Icon as={MapPin} size={12} className="text-muted-foreground" />
              <Text variant="muted" className="text-xs">
                {enquiry.deliveryCity.name}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <Text className="text-sm" numberOfLines={4}>
        {enquiry.message}
      </Text>
      <Text variant="muted" className="text-xs">
        {inboxTime(enquiry.createdAt)}
      </Text>
      <View className="flex-row flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          onPress={() => onReply(enquiry)}
          accessibilityLabel={`Reply to ${enquiry.buyer.name}`}
        >
          <Icon as={MessageSquare} size={14} className="text-primary-foreground" />
          <Text>Reply</Text>
        </Button>
        {enquiry.buyerPhone ? (
          <Button
            size="sm"
            variant="outline"
            onPress={() => onCall(enquiry.buyerPhone ?? '')}
            accessibilityLabel={`Call ${enquiry.buyer.name}`}
          >
            <Icon as={Phone} size={14} />
            <Text>Call</Text>
          </Button>
        ) : null}
        {enquiry.status !== 'closed' ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={isClosing}
            onPress={() => onClose(enquiry)}
            accessibilityLabel="Close enquiry"
          >
            <Icon as={CheckCircle} size={14} />
            <Text>Close</Text>
          </Button>
        ) : null}
      </View>
    </Card>
  );
}
