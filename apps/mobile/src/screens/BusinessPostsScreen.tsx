import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { ArrowLeft, Plus, Inbox } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { FeedPost } from '../../mock';
import { colors } from '../styles/theme';
import { BusinessPostManageCard, EditPostModal } from '../features/hub/components';

export function BusinessPostsScreen() {
  const { posts, userBusiness, updateBusinessPost, setBusinessPostStatus, deletePost, navigate } =
    useApp();

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
        <TouchableOpacity
          onPress={() => navigate('business_hub')}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Business Posts</Text>
        <TouchableOpacity
          onPress={() => navigate('create')}
          style={styles.newPostBtn}
          activeOpacity={0.8}
        >
          <Plus size={15} color="#FFFFFF" />
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
            <Inbox size={36} color="#94A3B8" />
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
            {filteredPosts.map((post) => (
              <BusinessPostManageCard
                key={post.id}
                post={post}
                onTogglePublish={handleTogglePublish}
                onEdit={handleOpenEdit}
                onArchive={handleArchive}
                onDelete={handleDeletePost}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <EditPostModal
        post={editingPost}
        editContent={editContent}
        setEditContent={setEditContent}
        onClose={() => setEditingPost(null)}
        onSave={handleSaveEdit}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: colors.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    padding: 12,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  postsList: {
    paddingBottom: 24,
  },
});
