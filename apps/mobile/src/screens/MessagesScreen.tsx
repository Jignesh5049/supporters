import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { ArrowLeft, Search, XCircle, MessageSquare } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { ConversationListItem, ChatThreadView } from '../features/messages/components';

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
    Boolean(routeParams?.openChat || routeParams?.conversationId || routeParams?.businessId),
  );
  const [searchConv, setSearchConv] = useState('');

  // Select active conversation by routeParams or activeConversationId
  const targetConvId = routeParams?.conversationId;
  const activeConv =
    (targetConvId && conversations.find((c) => c.id === targetConvId)) ||
    (routeParams?.businessId &&
      conversations.find((c) => c.businessId === routeParams.businessId)) ||
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

  const filteredConversations = conversations.filter(
    (c) =>
      c.businessName.toLowerCase().includes(searchConv.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchConv.toLowerCase()),
  );

  if (inChatView && activeConv) {
    return (
      <ChatThreadView
        conversation={activeConv}
        onBack={() => setInChatView(false)}
        onSendMessage={(text) => sendMessage(activeConv.id, text)}
        onViewBusiness={(bizId) => navigate('business_detail', { businessId: bizId })}
        onViewProduct={(prodId) => navigate('product_detail', { productId: prodId })}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.headerTitleRow}>
          {routeHistory.length > 0 && (
            <TouchableOpacity onPress={goBack} style={styles.headerBackBtn} activeOpacity={0.7}>
              <ArrowLeft size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Messages & Enquiries</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={15} color="#667085" />
          <TextInput
            style={styles.searchInput}
            value={searchConv}
            onChangeText={setSearchConv}
            placeholder="Search conversations by business or keywords..."
            placeholderTextColor="#667085"
          />
          {searchConv.length > 0 && (
            <TouchableOpacity onPress={() => setSearchConv('')}>
              <XCircle size={15} color="#667085" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationListItem conversation={item} onOpen={handleOpenConversation} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyInbox}>
            <MessageSquare size={36} color="#94A3B8" />
            <Text style={styles.emptyInboxTitle}>No conversations found</Text>
            <Text style={styles.emptyInboxSub}>
              Direct enquiries with verified suppliers will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerBackBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
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
  emptyInbox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyInboxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyInboxSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
