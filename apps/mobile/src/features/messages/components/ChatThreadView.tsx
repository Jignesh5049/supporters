import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeft, CheckCircle2, ExternalLink, Send, MessageSquare } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { Conversation } from '../../../../mock';

interface ChatThreadViewProps {
  conversation: Conversation;
  onBack: () => void;
  onSendMessage: (text: string) => void;
  onViewBusiness: (businessId: string) => void;
  onViewProduct: (productId: string) => void;
}

export function ChatThreadView({
  conversation,
  onBack,
  onSendMessage,
  onViewBusiness,
  onViewProduct,
}: ChatThreadViewProps) {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel="Back">
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Image
          source={{ uri: conversation.businessAvatar }}
          style={styles.avatar}
          contentFit="cover"
        />

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.title} numberOfLines={1}>
              {conversation.businessName}
            </Text>
            {conversation.businessVerified && (
              <CheckCircle2 size={13} color={colors.accentCyan} fill={colors.accentCyan} />
            )}
          </View>
          <Text style={styles.subtitle}>
            {conversation.online ? '🟢 Online now' : 'Active recently'} ·{' '}
            {conversation.businessCity}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onViewBusiness(conversation.businessId)}
          style={styles.catalogShortcut}
          accessibilityLabel="View business"
        >
          <ExternalLink size={18} color="#667085" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        data={conversation.messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MessageSquare size={24} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chat with {conversation.businessName}</Text>
            <Text style={styles.emptySubtitle}>
              Send a direct enquiry regarding product prices, bulk order MOQ, sample requests, or
              delivery timelines.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.isMe;

          return (
            <View
              style={[
                styles.messageContainer,
                isMe ? styles.myMessageContainer : styles.otherMessageContainer,
              ]}
            >
              {item.attachedProduct && (
                <TouchableOpacity
                  style={styles.attachedProductBubble}
                  onPress={() => {
                    if (item.attachedProduct?.id) {
                      onViewProduct(item.attachedProduct.id);
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: item.attachedProduct.image }}
                    style={styles.attachedProductImg}
                    contentFit="cover"
                  />
                  <View style={styles.attachedProductText}>
                    <Text style={styles.attachedProductTitle} numberOfLines={1}>
                      {item.attachedProduct.title}
                    </Text>
                    <Text style={styles.attachedProductPrice}>
                      ₹{item.attachedProduct.price.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.viewProductText}>View Product ↗</Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.otherMsgText]}>
                  {item.text}
                </Text>
                <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText]}>
                  {item.timestamp}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type quote inquiry, delivery query..."
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          disabled={!inputText.trim()}
        >
          <Send size={16} color="#FFFFFF" />
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  backBtn: {
    padding: 6,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  catalogShortcut: {
    padding: 6,
  },
  messagesList: {
    padding: 14,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageContainer: {
    marginBottom: 10,
    maxWidth: '82%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  attachedProductBubble: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  attachedProductImg: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  attachedProductText: {
    flex: 1,
    justifyContent: 'center',
  },
  attachedProductTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  attachedProductPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 2,
  },
  viewProductText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  bubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  myMsgText: {
    color: '#FFFFFF',
  },
  otherMsgText: {
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherTimeText: {
    color: '#94A3B8',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
