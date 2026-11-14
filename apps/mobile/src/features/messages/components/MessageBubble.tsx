import React, { memo } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { AlertCircle, Check, CheckCheck, Clock, FileText, ImageOff } from 'lucide-react-native';
import type { ChatAttachment, ListingCard, Message } from '@supporters/shared';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';
import { formatPrice } from '../../social/mappers';
import { useAttachmentUrl } from '../hooks/use-thread';
import type { ThreadItem } from '../hooks/use-thread';
import { bubbleTime, ENQUIRY_STATUS_LABEL, fileSizeLabel, sendFailureMessage } from '../labels';

/** A private chat photo: loaded from a short-lived signed URL, kept in memory only. */
function AttachmentImage({ attachment, size }: { attachment: ChatAttachment; size: 'lg' | 'sm' }) {
  const url = useAttachmentUrl(attachment.url);
  const box = size === 'lg' ? 'h-48 w-56' : 'h-24 w-24';
  if (url.isError) {
    return (
      <View className={cn(box, 'bg-muted items-center justify-center rounded-lg')}>
        <Icon as={ImageOff} size={20} className="text-muted-foreground" />
      </View>
    );
  }
  if (!url.data) {
    return (
      <View className={cn(box, 'bg-muted items-center justify-center rounded-lg')}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url.data }}
      className={cn(box, 'rounded-lg')}
      contentFit="cover"
      // Private files never go to the disk cache.
      cachePolicy="memory"
      accessibilityLabel="Photo"
    />
  );
}

function AttachmentFile({ attachment, isMine }: { attachment: ChatAttachment; isMine: boolean }) {
  const url = useAttachmentUrl(attachment.url);
  const open = async () => {
    const fresh = url.data ?? (await url.refetch()).data;
    if (fresh) await Linking.openURL(fresh);
  };
  return (
    <Pressable
      onPress={() => void open()}
      className="min-h-11 flex-row items-center gap-2"
      accessibilityRole="button"
      accessibilityLabel={`PDF document, ${fileSizeLabel(attachment.size)}. Opens in the browser`}
    >
      <Icon
        as={FileText}
        size={22}
        className={isMine ? 'text-primary-foreground' : 'text-primary'}
      />
      <View>
        <Text className={cn('text-sm font-semibold', isMine && 'text-primary-foreground')}>
          PDF document
        </Text>
        <Text
          className={cn('text-xs', isMine ? 'text-primary-foreground' : 'text-muted-foreground')}
        >
          {fileSizeLabel(attachment.size)}
          {url.isFetching ? ' · opening' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function ListingCardView({
  listing,
  onOpen,
}: {
  listing: ListingCard | null;
  onOpen: (listing: ListingCard) => void;
}) {
  if (!listing) {
    return (
      <Text variant="muted" className="text-xs">
        This listing is no longer available.
      </Text>
    );
  }
  return (
    <Pressable
      onPress={() => onOpen(listing)}
      className="bg-card border-border w-56 overflow-hidden rounded-lg border"
      accessibilityRole="link"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}. Opens the ${listing.type}`}
    >
      {listing.image ? (
        <Image source={{ uri: listing.image.url }} className="h-28 w-full" contentFit="cover" />
      ) : null}
      <View className="gap-0.5 p-2">
        <Text className="text-sm font-semibold" numberOfLines={2}>
          {listing.title}
        </Text>
        <Text className="text-primary text-xs font-semibold">{formatPrice(listing.price)}</Text>
      </View>
    </Pressable>
  );
}

function MessageContent({
  message,
  isMine,
  onOpenListing,
}: {
  message: Message;
  isMine: boolean;
  onOpenListing: (listing: ListingCard) => void;
}) {
  const text = message.body ? (
    <Text className={cn('text-sm', isMine && 'text-primary-foreground')}>{message.body}</Text>
  ) : null;
  switch (message.type) {
    case 'image':
      return (
        <View className="gap-1.5">
          <View className="flex-row flex-wrap gap-1.5">
            {message.attachments.map((attachment) => (
              <AttachmentImage
                key={attachment.id}
                attachment={attachment}
                size={message.attachments.length === 1 ? 'lg' : 'sm'}
              />
            ))}
          </View>
          {text}
        </View>
      );
    case 'file':
      return (
        <View className="gap-1.5">
          {message.attachments.map((attachment) => (
            <AttachmentFile key={attachment.id} attachment={attachment} isMine={isMine} />
          ))}
          {text}
        </View>
      );
    case 'listing_card':
      return (
        <View className="gap-1.5">
          <ListingCardView listing={message.listing} onOpen={onOpenListing} />
          {text}
        </View>
      );
    case 'enquiry':
      return (
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2">
            <Text
              className={cn(
                'text-xs font-bold uppercase',
                isMine ? 'text-primary-foreground' : 'text-highlight',
              )}
            >
              Enquiry
            </Text>
            {message.enquiry ? (
              <Text
                className={cn(
                  'text-xs',
                  isMine ? 'text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                {ENQUIRY_STATUS_LABEL[message.enquiry.status]}
              </Text>
            ) : null}
          </View>
          {message.listing ? (
            <ListingCardView listing={message.listing} onOpen={onOpenListing} />
          ) : null}
          {message.enquiry?.quantity ? (
            <Text className={cn('text-xs font-semibold', isMine && 'text-primary-foreground')}>
              Quantity: {message.enquiry.quantity}
              {message.enquiry.unit ? ` ${message.enquiry.unit.replace(/_/g, ' ')}` : ''}
            </Text>
          ) : null}
          {text}
        </View>
      );
    case 'quote':
      return (
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2">
            <Text
              className={cn(
                'text-xs font-bold uppercase',
                isMine ? 'text-primary-foreground' : 'text-highlight',
              )}
            >
              Quote
            </Text>
            {message.quote ? (
              <Text className={cn('text-sm font-black', isMine && 'text-primary-foreground')}>
                {formatPrice(message.quote.price)}
              </Text>
            ) : null}
          </View>
          {message.listing ? (
            <ListingCardView listing={message.listing} onOpen={onOpenListing} />
          ) : null}
          {text}
          {message.quote ? (
            <Pressable
              onPress={() => router.push(`/requirements/${message.quote?.requirementId ?? ''}`)}
              accessibilityRole="link"
              className="min-h-11 justify-center"
            >
              <Text
                className={cn(
                  'text-xs underline',
                  isMine ? 'text-primary-foreground' : 'text-primary',
                )}
              >
                View requirement
              </Text>
            </Pressable>
          ) : null}
        </View>
      );
    default:
      return text;
  }
}

interface MessageBubbleProps {
  item: ThreadItem;
  onOpenListing: (listing: ListingCard) => void;
  onLongPressMessage: (message: Message, isMine: boolean) => void;
  onPressLocal: (item: Extract<ThreadItem, { kind: 'local' }>) => void;
}

export const MessageBubble = memo(function MessageBubble({
  item,
  onOpenListing,
  onLongPressMessage,
  onPressLocal,
}: MessageBubbleProps) {
  if (item.kind === 'local') {
    const { local } = item;
    const isFailed = local.status === 'failed';
    const draft = local.item.draft;
    return (
      <Pressable
        onPress={() => onPressLocal(item)}
        className="max-w-[80%] self-end"
        accessibilityRole="button"
        accessibilityLabel={isFailed ? `Not sent. ${sendFailureMessage(local.code)}` : 'Sending'}
      >
        <View
          className={cn('bg-primary rounded-2xl rounded-br-sm px-3 py-2', isFailed && 'opacity-60')}
        >
          {local.preview?.imageUris?.length ? (
            <View className="mb-1 flex-row flex-wrap gap-1.5">
              {local.preview.imageUris.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  className="h-24 w-24 rounded-lg"
                  cachePolicy="none"
                />
              ))}
            </View>
          ) : null}
          {local.preview?.fileName ? (
            <Text className="text-primary-foreground text-sm font-semibold">
              {local.preview.fileName}
            </Text>
          ) : null}
          {local.preview?.listingTitle ? (
            <Text className="text-primary-foreground text-sm font-semibold">
              {local.preview.listingTitle}
            </Text>
          ) : null}
          {draft.body ? (
            <Text className="text-primary-foreground text-sm">{draft.body}</Text>
          ) : null}
        </View>
        <View className="mt-0.5 flex-row items-center justify-end gap-1">
          {isFailed ? (
            <>
              <Icon as={AlertCircle} size={12} className="text-destructive" />
              <Text className="text-destructive text-xs">{sendFailureMessage(local.code)}</Text>
            </>
          ) : (
            <>
              <Icon as={Clock} size={12} className="text-muted-foreground" />
              <Text variant="muted" className="text-xs">
                Sending
              </Text>
            </>
          )}
        </View>
      </Pressable>
    );
  }

  const { message, isMine, isRead } = item;
  const isEnquiry = message.type === 'enquiry';
  return (
    <Pressable
      onLongPress={() => onLongPressMessage(message, isMine)}
      className={cn('max-w-[80%]', isMine ? 'self-end' : 'self-start')}
      accessibilityHint="Long press for options"
    >
      <View
        className={cn(
          'rounded-2xl px-3 py-2',
          isMine ? 'bg-primary rounded-br-sm' : 'bg-card border-border rounded-bl-sm border',
          isEnquiry && !isMine && 'border-highlight bg-highlight-soft',
        )}
      >
        <MessageContent message={message} isMine={isMine} onOpenListing={onOpenListing} />
      </View>
      <View
        className={cn(
          'mt-0.5 flex-row items-center gap-1',
          isMine ? 'justify-end' : 'justify-start',
        )}
      >
        <Text variant="muted" className="text-xs">
          {bubbleTime(message.createdAt)}
        </Text>
        {isMine ? (
          <Icon
            as={isRead ? CheckCheck : Check}
            size={13}
            className={isRead ? 'text-info' : 'text-muted-foreground'}
            accessibilityLabel={isRead ? 'Read' : 'Sent'}
          />
        ) : null}
      </View>
    </Pressable>
  );
});
