import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CheckCheck } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

export interface ChatMessageData {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  attachedProduct?: {
    image?: string;
    title?: string;
    price?: number;
  };
}

export interface ChatMessageBubbleProps {
  message: ChatMessageData;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isMe = message.senderId === 'user-me';

  return (
    <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
      <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
        {Boolean(message.attachedProduct) && (
          <View style={styles.attachedProductCard}>
            {message.attachedProduct?.image ? (
              <Image
                source={{ uri: message.attachedProduct.image }}
                style={styles.attachedImg}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : null}
            <View style={styles.attachedBody}>
              <Text style={styles.attachedTitle} numberOfLines={1}>
                {message.attachedProduct?.title}
              </Text>
              <Text style={styles.attachedPrice}>
                ₹{message.attachedProduct?.price?.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.messageText, isMe ? styles.messageTextRight : styles.messageTextLeft]}>
          {message.text}
        </Text>
        <View style={styles.bubbleFooter}>
          <Text style={[styles.timestamp, isMe ? styles.timestampRight : styles.timestampLeft]}>
            {message.timestamp}
          </Text>
          {isMe && (
            <CheckCheck size={13} color="#FFFFFF" style={{ marginLeft: 3, opacity: 0.85 }} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubbleRight: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  attachedProductCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
    alignItems: 'center',
    gap: 8,
  },
  attachedImg: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  attachedBody: {
    flex: 1,
  },
  attachedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  attachedPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: colors.textPrimary,
  },
  messageTextRight: {
    color: '#FFFFFF',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
  },
  timestampLeft: {
    color: '#9CA3AF',
  },
  timestampRight: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
