import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Conversation } from '../../mock';
import { colors } from '../styles/theme';

export function MessagesScreen() {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    navigate,
    routeParams,
    routeHistory,
    goBack,
  } = useApp();

  const [inChatView, setInChatView] = useState(() =>
    Boolean(routeParams?.openChat || routeParams?.conversationId || routeParams?.businessId)
  );
  const [inputText, setInputText] = useState('');
  const [searchConv, setSearchConv] = useState('');

  // Select active conversation by routeParams or activeConversationId
  const targetConvId = routeParams?.conversationId;
  const activeConv =
    (targetConvId && conversations.find((c) => c.id === targetConvId)) ||
    (routeParams?.businessId && conversations.find((c) => c.businessId === routeParams.businessId)) ||
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0];

  useEffect(() => {
    if (routeParams?.openChat || routeParams?.conversationId || routeParams?.businessId) {
      if (routeParams.conversationId) {
        setActiveConversationId(routeParams.conversationId);
      } else if (routeParams.businessId) {
        const match = conversations.find((c) => c.businessId === routeParams.businessId);
        if (match) {
          setActiveConversationId(match.id);
        }
      }
      setInChatView(true);
    }
  }, [routeParams?.businessId, routeParams?.conversationId, routeParams?.openChat]);

  const handleOpenConversation = (id: string) => {
    setActiveConversationId(id);
    setInChatView(true);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeConv) return;
    sendMessage(activeConv.id, inputText.trim());
    setInputText('');
  };

  // Filter conversations
  const filteredConversations = conversations.filter(
    (c) =>
      c.businessName.toLowerCase().includes(searchConv.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchConv.toLowerCase())
  );

  // If in Chat Thread View
  if (inChatView && activeConv) {
    return (
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Chat Thread Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            onPress={() => setInChatView(false)}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Image source={{ uri: activeConv.businessAvatar }} style={styles.chatAvatar} />

          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatNameRow}>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {activeConv.businessName}
              </Text>
              {activeConv.businessVerified && (
                <Ionicons name="checkmark-circle" size={13} color={colors.accentCyan} />
              )}
            </View>
            <Text style={styles.chatSubtitle}>
              {activeConv.online ? '🟢 Online now' : 'Active yesterday'} · {activeConv.businessCity}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigate('business_detail', { businessId: activeConv.businessId })
            }
            style={styles.catalogShortcut}
          >
            <Feather name="external-link" size={18} color="#667085" />
          </TouchableOpacity>
        </View>

        {/* Message Thread List */}
        <FlatList
          data={activeConv.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyThreadContainer}>
              <View style={styles.emptyThreadIconWrap}>
                <Ionicons name="chatbubbles-outline" size={26} color={colors.primary} />
              </View>
              <Text style={styles.emptyThreadTitle}>Chat with {activeConv.businessName}</Text>
              <Text style={styles.emptyThreadSubtitle}>
                Send a direct enquiry regarding product prices, bulk order MOQ, sample requests, or delivery timelines.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.isMe;

            return (
              <View
                style={[
                  styles.messageBubbleContainer,
                  isMe ? styles.myMessageContainer : styles.otherMessageContainer,
                ]}
              >
                {/* Attached Product Box */}
                {item.attachedProduct && (
                  <TouchableOpacity
                    style={styles.attachedProductBubble}
                    onPress={() => {
                      if (item.attachedProduct?.id) {
                        navigate('product_detail', { productId: item.attachedProduct.id });
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.attachedProduct.image }}
                      style={styles.attachedProductImg}
                    />
                    <View style={styles.attachedProductText}>
                      <Text style={styles.attachedProductTitle} numberOfLines={1}>
                        {item.attachedProduct.title}
                      </Text>
                      <Text style={styles.attachedProductPrice}>
                        ₹{item.attachedProduct.price.toLocaleString('en-IN')}
                      </Text>
                      <Text style={{ fontSize: 9.5, color: colors.primary, fontWeight: '700', marginTop: 2 }}>
                        View Product ↗
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : styles.otherBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isMe ? styles.myMessageText : styles.otherMessageText,
                    ]}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isMe ? styles.myMessageTime : styles.otherMessageTime,
                    ]}
                  >
                    {item.timestamp}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Chat Input Bar */}
        <View style={styles.chatInputBar}>
          <TextInput
            style={styles.chatTextInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type quote inquiry, delivery query..."
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            disabled={!inputText.trim()}
          >
            <Feather name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Conversation List View
  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.headerTitleRow}>
          {routeHistory.length > 0 && (
            <TouchableOpacity onPress={goBack} style={styles.headerBackBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.screenHeading}>Messages & Quotations</Text>
            <Text style={styles.screenSubheading}>
              Direct communication with suppliers and clients
            </Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={15} color="#667085" />
          <TextInput
            style={styles.searchInput}
            value={searchConv}
            onChangeText={setSearchConv}
            placeholder="Search conversations..."
            placeholderTextColor="#667085"
          />
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.conversationsList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => handleOpenConversation(item.id)}
            activeOpacity={0.75}
          >
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: item.businessAvatar }} style={styles.convAvatar} />
              {item.online && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.convDetails}>
              <View style={styles.convTopRow}>
                <View style={styles.nameAndBadge}>
                  <Text style={styles.convName} numberOfLines={1}>
                    {item.businessName}
                  </Text>
                  {item.businessVerified && (
                    <Ionicons name="checkmark-circle" size={13} color={colors.accentCyan} />
                  )}
                </View>
                <Text style={styles.convTime}>{item.lastMessageTime}</Text>
              </View>

              <View style={styles.convBottomRow}>
                <Text style={styles.lastMsgText} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  screenSubheading: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  conversationsList: {
    padding: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  convDetails: {
    flex: 1,
    marginLeft: 12,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  convName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  convTime: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  convBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  lastMsgText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: colors.accentCyan,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  // Chat View Styles
  chatContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  chatSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  catalogShortcut: {
    padding: 6,
  },
  messagesList: {
    padding: 12,
    paddingBottom: 16,
  },
  messageBubbleContainer: {
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  attachedProductImg: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  attachedProductText: {
    flex: 1,
  },
  attachedProductTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attachedProductPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 17,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: colors.textPrimary,
  },
  messageTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBackBtn: {
    padding: 4,
    marginLeft: -4,
  },
  emptyThreadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyThreadIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyThreadTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyThreadSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
