import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Search,
  XCircle,
  FilePlus,
  PlusCircle,
  Inbox,
  X,
  Camera,
  CheckCircle2,
  Trash2,
  Send,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { SuggestedBusinessesWidget } from '../components/SuggestedBusinessesWidget';
import { FeedPostCard } from '../components/FeedPostCard';
import { colors } from '../styles/theme';

export function HomeScreen() {
  const { posts, addPost, showToast, routeParams, setHeaderVisible } = useApp();
  const [feedSearch, setFeedSearch] = useState('');

  // Requirement Modal states
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
      // Scrolling down feed -> hide header
      setHeaderVisible(false);
    } else if (diff < -8) {
      // Scrolling back up -> show header
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
    } catch {
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
        image:
          reqImageUri ||
          'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
        moq: 1,
        unit: 'Units',
      },
      images: reqImageUri ? [reqImageUri] : undefined,
    });

    setReqDescription('');
    setReqImageUri(null);
    setReqModalOpen(false);

    showToast('Your requirement is published! Verified sellers can now reach out.', 'success');
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Feed Quick Search Bar */}
      <View style={styles.searchBar}>
        <Search size={15} color="#667085" />
        <TextInput
          style={styles.searchInput}
          value={feedSearch}
          onChangeText={setFeedSearch}
          placeholder="Search posts, offers or verified updates..."
          placeholderTextColor="#667085"
        />
        {feedSearch.length > 0 && (
          <TouchableOpacity
            onPress={() => setFeedSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <XCircle size={15} color="#667085" />
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
            <FilePlus size={15} color="#FFFFFF" />
          </View>
          <Text style={styles.reqBannerTitle}>Looking to Buy?</Text>
        </View>
        <View style={styles.reqBannerBtn}>
          <PlusCircle size={12} color="#FFFFFF" />
          <Text style={styles.reqBannerBtnText}>Post Requirement</Text>
        </View>
      </TouchableOpacity>

      {/* Profile suggestion like Insta has (showing other business profiles) */}
      <SuggestedBusinessesWidget />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Inbox size={36} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No posts found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search term to see more business updates.
      </Text>
      <TouchableOpacity style={styles.resetButton} onPress={() => setFeedSearch('')}>
        <Text style={styles.resetButtonText}>Clear Search</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlashList
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

      {/* Post a Requirement Modal */}
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
              <TouchableOpacity onPress={() => setReqModalOpen(false)} style={styles.closeModalBtn}>
                <X size={20} color="#667085" />
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
                {reqImageUri ? (
                  <CheckCircle2 size={16} color="#059669" />
                ) : (
                  <Camera size={16} color={colors.primary} />
                )}
                <Text style={styles.uploadBoxText}>
                  {reqImageUri
                    ? 'Photo Attached (Tap to Change)'
                    : 'Attach Photo or Sample (Optional)'}
                </Text>
                {reqImageUri && (
                  <TouchableOpacity
                    onPress={() => setReqImageUri(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 6 }}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReqModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitReqBtn}
                onPress={handlePublishRequirement}
                activeOpacity={0.85}
              >
                <Send size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
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
    borderColor: '#EAECF0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    height: '100%',
  },
  reqBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  reqBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reqIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  reqBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reqBannerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 280,
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8F9FC',
  },
  modalBody: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  formTextArea: {
    height: 120,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  uploadBoxText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
  },
  submitReqBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
