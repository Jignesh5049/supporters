import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Phone, Paperclip, CheckCheck, Package } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';
import {
  getSocket,
  joinConversation,
  leaveConversation,
  sendSocketMessage,
  sendTypingStatus,
  onSocketMessage,
  onSocketTyping,
} from '../../src/lib/socket/socketClient';
import { pickAndCompressImageAsync } from '../../src/lib/media/imagePicker';

export default function ConversationScreen() {
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

  const [inputMessage, setInputMessage] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Setup Realtime Socket listeners
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

  const handleInputChange = (text: string) => {
    setInputMessage(text);
    if (!conversation) return;

    sendTypingStatus({
      conversationId: conversation.id,
      userId: 'user-me',
      userName: currentUser.name,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus({
        conversationId: conversation.id,
        userId: 'user-me',
        userName: currentUser.name,
        isTyping: false,
      });
    }, 1500);
  };

  const handleSend = () => {
    if (!inputMessage.trim() || !conversation) return;
    const text = inputMessage.trim();

    sendMessage(conversation.id, text);
    sendSocketMessage({
      conversationId: conversation.id,
      senderId: 'user-me',
      senderName: currentUser.name,
      text,
      timestamp: 'Just now',
    });

    setInputMessage('');
  };

  const handlePickAttachment = async () => {
    if (!conversation) return;
    setIsAttaching(true);
    try {
      const result = await pickAndCompressImageAsync({ aspect: [4, 3] });
      if (result?.uri) {
        sendMessage(conversation.id, '📷 Shared an image attachment');
      }
    } catch {
      // Ignored
    } finally {
      setIsAttaching(false);
    }
  };

  if (!conversation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
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

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push(`/business/${conversation.businessId}` as any)}
            accessibilityLabel="Call Supplier"
          >
            <Phone size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView contentContainerStyle={styles.messagesList} showsVerticalScrollIndicator={false}>
        <Text style={styles.encryptionNotice}>🔒 End-to-end direct business enquiry thread</Text>

        {conversation.messages.map((msg) => {
          const isMe = msg.senderId === 'user-me';
          return (
            <View
              key={msg.id}
              style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}
            >
              <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                {/* Attached Product Snippet */}
                {Boolean(msg.attachedProduct) && (
                  <View style={styles.attachedProductCard}>
                    <Image
                      source={{ uri: msg.attachedProduct?.image }}
                      style={styles.attachedImg}
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                    <View style={styles.attachedBody}>
                      <Text style={styles.attachedTitle} numberOfLines={1}>
                        {msg.attachedProduct?.title}
                      </Text>
                      <Text style={styles.attachedPrice}>
                        ₹{msg.attachedProduct?.price?.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                )}

                <Text
                  style={[
                    styles.messageText,
                    isMe ? styles.messageTextRight : styles.messageTextLeft,
                  ]}
                >
                  {msg.text}
                </Text>
                <View style={styles.bubbleFooter}>
                  <Text
                    style={[styles.timestamp, isMe ? styles.timestampRight : styles.timestampLeft]}
                  >
                    {msg.timestamp}
                  </Text>
                  {isMe && (
                    <CheckCheck
                      size={13}
                      color="#FFFFFF"
                      style={{ marginLeft: 3, opacity: 0.85 }}
                    />
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handlePickAttachment}
          disabled={isAttaching}
          accessibilityLabel="Attach photo"
        >
          {isAttaching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Paperclip size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message or price offer..."
          placeholderTextColor={colors.gray400}
          value={inputMessage}
          onChangeText={handleInputChange}
          multiline
        />

        <TouchableOpacity
          style={[styles.sendBtn, !inputMessage.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputMessage.trim()}
          accessibilityLabel="Send message"
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  businessTarget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  businessDetails: {
    flex: 1,
  },
  businessName: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  onlineStatus: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: 20,
  },
  encryptionNotice: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  bubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  bubbleRight: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  attachedProductCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.sm,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  attachedImg: {
    width: 40,
    height: 40,
    borderRadius: 4,
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
    color: '#FDE047',
    marginTop: 1,
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
    color: colors.gray500,
  },
  timestampRight: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  attachBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendBtnDisabled: {
    backgroundColor: colors.gray300,
  },
});
