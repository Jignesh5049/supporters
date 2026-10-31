import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { FeedPost } from '../../../mock';
import { colors } from '../../styles/theme';

export function BusinessPostsScreen() {
  const {
    posts,
    userBusiness,
    updateBusinessPost,
    setBusinessPostStatus,
    deletePost,
    navigate,
    showToast,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'All' | 'Published' | 'Draft' | 'Archived'>(
    'All',
  );
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editContent, setEditContent] = useState('');

  // Owner posts for user's business
  const myPosts = posts.filter((p) => p.businessId === userBusiness?.id || p.isOwnPost);

  const filteredPosts = myPosts.filter((p) => {
    const status = p.postStatus || 'Published';
    if (activeFilter === 'Published') return status === 'Published';
    if (activeFilter === 'Draft') return status === 'Draft';
    if (activeFilter === 'Archived') return status === 'Archived';
    return true;
  });

  const handleDeletePost = (post: FeedPost) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to permanently delete this post from your business page? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePost(post.id),
        },
      ],
    );
  };

  const handleOpenEdit = (post: FeedPost) => {
    setEditingPost(post);
    setEditContent(post.content);
  };

  const handleSaveEdit = () => {
    if (!editingPost) return;
    updateBusinessPost(editingPost.id, {
      content: editContent.trim() || editingPost.content,
    });
    setEditingPost(null);
  };

  const handleTogglePublish = (post: FeedPost) => {
    const current = post.postStatus || 'Published';
    const next = current === 'Published' ? 'Draft' : 'Published';
    setBusinessPostStatus(post.id, next);
  };

  const handleArchive = (post: FeedPost) => {
    const current = post.postStatus || 'Published';
    const next = current === 'Archived' ? 'Published' : 'Archived';
    setBusinessPostStatus(post.id, next);
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate('business_hub')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Business Posts</Text>
        <TouchableOpacity
          onPress={() => navigate('create')}
          style={styles.newPostBtn}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={15} color="#FFFFFF" />
          <Text style={styles.newPostBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {(['All', 'Published', 'Draft', 'Archived'] as const).map((tab) => {
          const count =
            tab === 'All'
              ? myPosts.length
              : myPosts.filter((p) => (p.postStatus || 'Published') === tab).length;

          const isActive = activeFilter === tab;

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {filteredPosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No {activeFilter} Posts Found</Text>
            <Text style={styles.emptySub}>
              {activeFilter === 'Draft'
                ? 'Drafts saved from the composer will be safely stored here before going live.'
                : 'Create and broadcast new catalog items, factory dispatch updates, or seasonal offers.'}
            </Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={() => navigate('create')}>
              <Text style={styles.emptyActionBtnText}>Create New Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.postsList}>
            {filteredPosts.map((post) => {
              const status = post.postStatus || 'Published';
              const isPublished = status === 'Published';
              const isDraft = status === 'Draft';
              const isArchived = status === 'Archived';

              return (
                <View key={post.id} style={styles.postCard}>
                  {/* Status & Header Info */}
                  <View style={styles.cardHeader}>
                    <View style={styles.postTypeTag}>
                      <Text style={styles.postTypeTagText}>{post.postType.toUpperCase()}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isPublished && styles.badgePublished,
                        isDraft && styles.badgeDraft,
                        isArchived && styles.badgeArchived,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isPublished && styles.textPublished,
                          isDraft && styles.textDraft,
                          isArchived && styles.textArchived,
                        ]}
                      >
                        {status}
                      </Text>
                    </View>
                  </View>

                  {/* Post Content */}
                  <Text style={styles.postContentText} numberOfLines={3}>
                    {post.content}
                  </Text>

                  {/* Image Preview if present */}
                  {post.images && post.images.length > 0 && (
                    <View style={styles.imagePreviewWrap}>
                      <Image
                        source={{ uri: post.images[0] }}
                        style={styles.postThumb}
                        resizeMode="cover"
                      />
                      {post.aspectRatio && (
                        <View style={styles.ratioPill}>
                          <Text style={styles.ratioPillText}>{post.aspectRatio}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Attached Product / Service preview if present */}
                  {post.attachedProduct && (
                    <View style={styles.attachedPreview}>
                      <Feather name="package" size={13} color={colors.primary} />
                      <Text style={styles.attachedText} numberOfLines={1}>
                        Attached: {post.attachedProduct.title} (₹
                        {post.attachedProduct.price.toLocaleString('en-IN')})
                      </Text>
                    </View>
                  )}

                  {/* Engagement Stats & Date */}
                  <View style={styles.engagementRow}>
                    <View style={styles.engagementLeft}>
                      <View style={styles.statItem}>
                        <Ionicons name="heart-outline" size={13} color="#64748B" />
                        <Text style={styles.statItemText}>{post.likesCount || 0}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="chatbubble-outline" size={13} color="#64748B" />
                        <Text style={styles.statItemText}>{post.commentsCount || 0}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Feather name="share-2" size={12} color="#64748B" />
                        <Text style={styles.statItemText}>{post.sharesCount || 0}</Text>
                      </View>
                    </View>
                    <Text style={styles.postDate}>{post.createdAt}</Text>
                  </View>

                  {/* Management Action Buttons */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleTogglePublish(post)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={isPublished ? 'eye-off' : 'check-circle'}
                        size={13}
                        color={isPublished ? '#D97706' : '#16A34A'}
                      />
                      <Text
                        style={[
                          styles.actionPillText,
                          { color: isPublished ? '#D97706' : '#16A34A' },
                        ]}
                      >
                        {isPublished ? 'Unpublish (Draft)' : 'Publish Live'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleOpenEdit(post)}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-3" size={13} color={colors.primary} />
                      <Text style={[styles.actionPillText, { color: colors.primary }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleArchive(post)}
                      activeOpacity={0.7}
                    >
                      <Feather name="archive" size={13} color="#475569" />
                      <Text style={[styles.actionPillText, { color: '#475569' }]}>
                        {isArchived ? 'Restore' : 'Archive'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionPill, { borderColor: '#FEE2E2' }]}
                      onPress={() => handleDeletePost(post)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={13} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Content Modal */}
      <Modal
        visible={Boolean(editingPost)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Post Content</Text>
              <TouchableOpacity onPress={() => setEditingPost(null)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.editTextInput}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="Edit your post content..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={5}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingPost(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEdit}>
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newPostBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    padding: 14,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  postsList: {
    gap: 12,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postTypeTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  postTypeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePublished: {
    backgroundColor: '#DCFCE7',
  },
  badgeDraft: {
    backgroundColor: '#FEF3C7',
  },
  badgeArchived: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textPublished: {
    color: '#16A34A',
  },
  textDraft: {
    color: '#D97706',
  },
  textArchived: {
    color: '#64748B',
  },
  postContentText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 10,
  },
  imagePreviewWrap: {
    position: 'relative',
    height: 120,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 10,
  },
  postThumb: {
    width: '100%',
    height: '100%',
  },
  ratioPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratioPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  attachedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  attachedText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginBottom: 10,
  },
  engagementLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItemText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  postDate: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  editTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
