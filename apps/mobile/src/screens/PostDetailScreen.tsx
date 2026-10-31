import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Send,
  ShieldCheck,
  Tag,
  ChevronRight,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { PostCommentItem } from '../features/feed/components';

export function PostDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    posts,
    likedPostIds,
    toggleLikePost,
    savedPostIds,
    toggleSavePost,
    openShareModal,
    currentUser,
    showToast,
  } = useApp();

  const post = posts.find((p) => p.id === id) || posts[0];

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([
    {
      id: 'c-1',
      authorName: 'Vikram Patel',
      authorAvatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      text: 'Great update! What is the minimum order quantity for this?',
      timeAgo: '2h ago',
    },
    {
      id: 'c-2',
      authorName: 'Sneha Shah',
      authorAvatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      text: 'Interested in bulk dealership. Sent an enquiry.',
      timeAgo: '45m ago',
    },
  ]);

  if (!post) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Post not found</Text>
          <Text style={styles.emptySub}>
            This trade update may have been removed or is no longer available.
          </Text>
        </View>
      </View>
    );
  }

  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: `c-${Date.now()}`,
      authorName: currentUser?.name || 'You',
      authorAvatar:
        currentUser?.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      text: commentText.trim(),
      timeAgo: 'Just now',
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
    showToast('Comment posted', 'success');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Update</Text>
        <TouchableOpacity
          onPress={() =>
            openShareModal({
              title: `${post.businessName}'s Post`,
              url: `https://supporters.in/post/${post.id}`,
            })
          }
          style={styles.backButton}
          accessibilityLabel="Share post"
        >
          <Share2 size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Post Card */}
        <View style={styles.postCard}>
          <TouchableOpacity
            style={styles.businessHeader}
            onPress={() => router.push(`/business/${post.businessId}` as any)}
          >
            <Image source={{ uri: post.businessAvatar }} style={styles.avatar} />
            <View style={styles.businessInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.businessName}>{post.businessName}</Text>
                {post.businessVerified && <ShieldCheck size={14} color="#16A34A" />}
              </View>
              <Text style={styles.postTime}>
                {post.createdAt} • {post.location || 'Ahmedabad, GJ'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Offer Tag */}
          {Boolean(post.offerTag) && (
            <View style={styles.offerBadge}>
              <Tag size={12} color="#4338CA" style={{ marginRight: 4 }} />
              <Text style={styles.offerBadgeText}>{post.offerTag}</Text>
            </View>
          )}

          <Text style={styles.postBody}>{post.content}</Text>

          {/* Images */}
          {Boolean(post.images && post.images.length > 0) && (
            <View style={styles.imagesContainer}>
              {post.images!.map((img, idx) => (
                <Image
                  key={idx}
                  source={{ uri: img }}
                  style={post.images!.length > 1 ? styles.postImageMulti : styles.postImage}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}

          {/* Attached Product or Service */}
          {(Boolean(post.attachedProduct) || Boolean(post.attachedService)) && (
            <TouchableOpacity
              style={styles.attachedCard}
              onPress={() => {
                if (post.attachedProduct?.id) {
                  router.push(`/product/${post.attachedProduct.id}` as any);
                } else if (post.attachedService?.id) {
                  router.push(`/service/${post.attachedService.id}` as any);
                }
              }}
              activeOpacity={0.85}
            >
              <Image
                source={{
                  uri:
                    post.attachedProduct?.image ||
                    post.attachedService?.image ||
                    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
                }}
                style={styles.attachedImage}
              />
              <View style={styles.attachedDetails}>
                <Text style={styles.attachedTitle} numberOfLines={1}>
                  {post.attachedProduct?.title || post.attachedService?.title}
                </Text>
                <Text style={styles.attachedPrice}>
                  ₹
                  {(
                    post.attachedProduct?.price ||
                    post.attachedService?.startingPrice ||
                    0
                  ).toLocaleString('en-IN')}
                  {post.attachedProduct?.unit ? ` / ${post.attachedProduct.unit}` : ''}
                  {post.attachedService?.unit ? ` ${post.attachedService.unit}` : ''}
                </Text>
                {Boolean(post.attachedProduct?.moq) && (
                  <Text style={styles.attachedMoq}>
                    MOQ: {post.attachedProduct?.moq} units
                  </Text>
                )}
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Engagement Counts Bar (Likes count is already updated in AppContext) */}
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>{post.likesCount || 0} Likes</Text>
            <Text style={styles.statsText}>{comments.length} Comments</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => toggleLikePost(post.id)}
            >
              <Heart
                size={18}
                color={isLiked ? '#DC2626' : colors.textSecondary}
                fill={isLiked ? '#DC2626' : 'transparent'}
              />
              <Text style={[styles.actionText, isLiked && { color: '#DC2626' }]}>Like</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <MessageCircle size={18} color={colors.textSecondary} />
              <Text style={styles.actionText}>Comment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => toggleSavePost(post.id)}
            >
              <Bookmark
                size={18}
                color={isSaved ? colors.primary : colors.textSecondary}
                fill={isSaved ? colors.primary : 'transparent'}
              />
              <Text style={[styles.actionText, isSaved && { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
          {comments.map((c) => (
            <PostCommentItem key={c.id} comment={c} />
          ))}
        </View>
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Write a comment..."
          placeholderTextColor="#9CA3AF"
          value={commentText}
          onChangeText={setCommentText}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
          onPress={handleSendComment}
          disabled={!commentText.trim()}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backButton: {
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#E5E7EB',
  },
  businessInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  postTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  offerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  postBody: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 12,
    gap: 8,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  postImageMulti: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 12,
  },
  attachedImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },
  attachedDetails: {
    flex: 1,
  },
  attachedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attachedPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  attachedMoq: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  commentsSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
});