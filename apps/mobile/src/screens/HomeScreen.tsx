import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Platform,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { SuggestedBusinessesWidget } from '../components/SuggestedBusinessesWidget';
import { FeedPostCard } from '../components/FeedPostCard';
import { colors } from '../styles/theme';

export function HomeScreen() {
  const { posts, addPost, showToast, routeParams, setHeaderVisible } = useApp();
  const [feedSearch, setFeedSearch] = useState('');

  // Requirement Modal states - just message description
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqDescription, setReqDescription] = useState('');
  const [reqImageUri, setReqImageUri] = useState<string | null>(null);

  // Track scroll position to hide/show header
  const lastOffsetY = useRef(0);

  useEffect(() => {
    if (routeParams?.openRequirement) {
      setReqModalOpen(true);
    }
  }, [routeParams]);

  useEffect(() => {
    return () => {
      setHeaderVisible(true);
    };
  }, [setHeaderVisible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastOffsetY.current;

    // At top of feed, header is always visible
    if (currentY <= 15) {
      setHeaderVisible(true);
    } else if (diff > 8 && currentY > 35) {
      // Scrolling down feed (finger swiping up) -> hide header
      setHeaderVisible(false);
    } else if (diff < -8) {
      // Scrolling back up (finger swiping down) -> show header
      setHeaderVisible(true);
    }

    lastOffsetY.current = currentY;
  };

  // Filter posts based on search
  const filteredPosts = posts.filter((post) => {
    if (!feedSearch.trim()) return true;

    const query = feedSearch.toLowerCase();
    return (
      post.content.toLowerCase().includes(query) ||
      post.businessName.toLowerCase().includes(query) ||
      post.location.toLowerCase().includes(query) ||
      (post.attachedProduct?.title.toLowerCase().includes(query) ?? false) ||
      (post.attachedService?.title.toLowerCase().includes(query) ?? false)
    );
  });

  const handlePickReqImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setReqImageUri(res.assets[0].uri);
      }
    } catch (e) {
      // ignore
    }
  };

  const handlePublishRequirement = () => {
    if (!reqDescription.trim()) {
      Alert.alert('Required Field', 'Please write your requirement description.');
      return;
    }

    const trimmed = reqDescription.trim();
    const firstLine = trimmed.split('\n')[0];
    const previewTitle = firstLine.length > 55 ? firstLine.slice(0, 55) + '...' : firstLine;

    addPost({
      postType: 'offer',
      offerTag: 'BUYER REQUIREMENT',
      content: `📌 BUYER REQUIREMENT\n\n${trimmed}`,
      attachedProduct: {
        id: `req-${Date.now()}`,
        title: previewTitle,
        price: 0,
        image: reqImageUri || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
        moq: 1,
        unit: 'Units',
      },
      images: reqImageUri ? [reqImageUri] : undefined,
    });

    // Reset & close
    setReqDescription('');
    setReqImageUri(null);
    setReqModalOpen(false);

    showToast('Your requirement is published! Verified sellers can now reach out.', 'success');
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Feed Quick Search Bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={15} color="#667085" />
        <TextInput
          style={styles.searchInput}
          value={feedSearch}
          onChangeText={setFeedSearch}
          placeholder="Search posts, offers or verified updates..."
          placeholderTextColor="#667085"
        />
        {feedSearch.length > 0 && (
          <TouchableOpacity onPress={() => setFeedSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x-circle" size={15} color="#667085" />
          </TouchableOpacity>
        )}
      </View>

      {/* Compact Sleek Post Requirement Banner */}
      <TouchableOpacity
        style={styles.reqBanner}
        onPress={() => setReqModalOpen(true)}
        activeOpacity={0.85}
      >
        <View style={styles.reqBannerLeft}>
          <View style={styles.reqIconBox}>
            <Feather name="file-plus" size={15} color="#FFFFFF" />
          </View>
          <Text style={styles.reqBannerTitle}>Looking to Buy?</Text>
        </View>
        <View style={styles.reqBannerBtn}>
          <Feather name="plus-circle" size={12} color="#FFFFFF" />
          <Text style={styles.reqBannerBtnText}>Post Requirement</Text>
        </View>
      </TouchableOpacity>

      {/* Profile suggestion like Insta has (showing other business profiles) */}
      <SuggestedBusinessesWidget />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={36} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No posts found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search term to see more business updates.
      </Text>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => setFeedSearch('')}
      >
        <Text style={styles.resetButtonText}>Clear Search</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedPostCard post={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Post a Requirement Modal - Message Description Only */}
      <Modal
        visible={reqModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReqModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Top Bar */}
            <View style={styles.modalTopBar}>
              <View>
                <Text style={styles.modalTitle}>Post Requirement</Text>
                <Text style={styles.modalSub}>
                  Describe what you need. Sellers will see this and contact you.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReqModalOpen(false)}
                style={styles.closeModalBtn}
              >
                <Feather name="x" size={20} color="#667085" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.formLabel}>Message Description *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={reqDescription}
                onChangeText={setReqDescription}
                placeholder="Type what product, material, or service you are looking to buy, quantity needed, delivery city, etc..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              {/* Optional Photo Attachment */}
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={handlePickReqImage}
                activeOpacity={0.8}
              >
                <Feather
                  name={reqImageUri ? 'check-circle' : 'camera'}
                  size={16}
                  color={reqImageUri ? '#059669' : colors.primary}
                />
                <Text style={styles.uploadBoxText}>
                  {reqImageUri ? 'Photo Attached (Tap to Change)' : 'Attach Photo or Sample (Optional)'}
                </Text>
                {reqImageUri && (
                  <TouchableOpacity
                    onPress={() => setReqImageUri(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 6 }}
                  >
                    <Feather name="trash-2" size={14} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setReqModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitReqBtn}
                onPress={handlePublishRequirement}
                activeOpacity={0.85}
              >
                <Feather name="send" size={13} color="#FFFFFF" />
                <Text style={styles.submitReqBtnText}>Post Requirement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  headerContainer: {
    marginBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  reqBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  reqBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reqIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reqBannerBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reqBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  resetButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 6,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: colors.textPrimary,
  },
  formTextArea: {
    height: 130,
    paddingTop: 12,
    textAlignVertical: 'top',
    fontSize: 13,
    lineHeight: 19,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
  },
  uploadBoxText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  submitReqBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  submitReqBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
