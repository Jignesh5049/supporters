import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { Conversation } from '../../../../mock';

interface ConversationListItemProps {
  conversation: Conversation;
  onOpen: (id: string) => void;
}

export function ConversationListItem({ conversation, onOpen }: ConversationListItemProps) {
  return (
    <TouchableOpacity
      style={styles.convCard}
      onPress={() => onOpen(conversation.id)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrapper}>
        <Image
          source={{ uri: conversation.businessAvatar }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
        {conversation.unreadCount > 0 && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.contentCol}>
        <View style={styles.nameRow}>
          <Text style={styles.businessName} numberOfLines={1}>
            {conversation.businessName}
          </Text>
          {conversation.businessVerified && (
            <CheckCircle2 size={13} color={colors.accentCyan} fill={colors.accentCyan} />
          )}
          <Text style={styles.timestamp}>{conversation.lastMessageTime}</Text>
        </View>

        <View style={styles.messageRow}>
          <Text
            style={[styles.lastMessage, conversation.unreadCount > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  convCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contentCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lastMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
