import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import {
  joinConversation,
  leaveConversation,
  sendSocketMessage,
  sendTypingStatus,
  onSocketMessage,
  onSocketTyping,
} from '../lib/socket/socketClient';
import { ChatMessageBubble, ChatInputBar } from '../features/messages/components';

export function ChatDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { conversations, sendMessage, activeConversationId, setActiveConversationId, currentUser } =
    useApp();

  useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      setActiveConversationId(conversationId);
    }
  }, [conversationId]);

  const conversation =
    conversations.find((c) => c.id === conversationId) ||
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0];

  const [isPeerTyping, setIsPeerTyping] = useState(false);

  // Realtime Socket listeners
  useEffect(() => {
    if (!conversation?.id) return;

    joinConversation(conversation.id);

    const unsubMessage = onSocketMessage((msg) => {
      if (msg.conversationId === conversation.id && msg.senderId !== 'user-me') {
        sendMessage(conversation.id, msg.text);
      }
    });

    const unsubTyping = onSocketTyping((payload) => {
      if (payload.conversationId === conversation.id && payload.userId !== 'user-me') {
        setIsPeerTyping(payload.isTyping);
      }
    });

    return () => {
      leaveConversation(conversation.id);
      unsubMessage();
      unsubTyping();
    };
  }, [conversation?.id]);

  const handleSendMessage = (text: string) => {
    if (!conversation) return;
    sendMessage(conversation.id, text);
    sendSocketMessage({
      conversationId: conversation.id,
      senderId: 'user-me',
      senderName: currentUser.name,
      text,
      timestamp: 'Just now',
    });
  };

  const handleSendAttachment = (_uri: string) => {
    if (!conversation) return;
    sendMessage(conversation.id, '📷 Shared an image attachment');
  };

  const handleTypingChange = (isTyping: boolean) => {
    if (!conversation) return;
    sendTypingStatus({
      conversationId: conversation.id,
      userId: 'user-me',
      userName: currentUser.name,
      isTyping,
    });
  };

  if (!conversation) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: colors.textSecondary }}>Conversation not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Thread Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back to messages"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.businessTarget}
          onPress={() => router.push(`/business/${conversation.businessId}` as any)}
        >
          <Image
            source={{ uri: conversation.businessAvatar }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="disk"
          />
          <View style={styles.businessDetails}>
            <Text style={styles.businessName} numberOfLines={1}>
              {conversation.businessName}
            </Text>
            <Text style={styles.onlineStatus}>{isPeerTyping ? 'typing...' : '● Active Now'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push(`/business/${conversation.businessId}` as any)}
          accessibilityLabel="Call Supplier"
        >
          <Phone size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView contentContainerStyle={styles.messagesList} showsVerticalScrollIndicator={false}>
        <Text style={styles.encryptionNotice}>🔒 End-to-end direct business enquiry thread</Text>

        {conversation.messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
      </ScrollView>

      {/* Modular Input Bar */}
      <ChatInputBar
        onSendMessage={handleSendMessage}
        onSendAttachment={handleSendAttachment}
        onTypingChange={handleTypingChange}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  businessTarget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
  },
  businessDetails: {
    flex: 1,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  onlineStatus: {
    fontSize: 11,
    color: '#16A34A',
    marginTop: 1,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  messagesList: {
    padding: 14,
    paddingBottom: 24,
  },
  encryptionNotice: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 16,
  },
});
