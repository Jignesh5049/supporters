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
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Send,
  ShieldCheck,
} from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

export default function PostDetailScreen() {
  const router = useRouter();
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
  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);

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

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: `c-${Date.now()}`,
      authorName: currentUser.name || 'You',
      authorAvatar:
        currentUser.avatar ||
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity
          onPress={() =>
            openShareModal({
              title: `${post.businessName}'s Post`,
              url: `https://supporters.app/post/${post.id}`,
            })
          }
          style={styles.backButton}
        >
          <Share2 size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Post Card */}
        <View style={styles.postCard}>
          {/* Business Header */}
          <TouchableOpacity
            style={styles.businessHeader}
            onPress={() => router.push(`/business/${post.businessId}` as any)}
          >
            <Image source={{ uri: post.businessAvatar }} style={styles.avatar} />
            <View style={styles.businessInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.businessName}>{post.businessName}</Text>
                {post.businessVerified && (
                  <ShieldCheck size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                )}
              </View>
              <Text style={styles.timestamp}>{post.createdAt || '1 day ago'}</Text>
            </View>
          </TouchableOpacity>

          {/* Post Content */}
          <Text style={styles.postBody}>{post.content}</Text>

          {/* Media Images */}
          {post.images && post.images.length > 0 && (
            <View style={styles.imagesContainer}>
              {post.images.map((img, i) => (
                <Image key={i} source={{ uri: img }} style={styles.postImage} resizeMode="cover" />
              ))}
            </View>
          )}

          {/* Offer Tag */}
          {post.offerTag && (
            <View style={styles.offerTagContainer}>
              <Text style={styles.offerTagText}>{post.offerTag}</Text>
            </View>
          )}

          {/* Actions Bar */}
          <View style={styles.actionsBar}>
            <TouchableOpacity style={styles.actionButton} onPress={() => toggleLikePost(post.id)}>
              <Heart
                size={20}
                color={isLiked ? colors.error : colors.textSecondary}
                fill={isLiked ? colors.error : 'none'}
              />
              <Text
                style={[styles.actionText, isLiked && { color: colors.error, fontWeight: '700' }]}
              >
                {post.likesCount + (isLiked ? 1 : 0)}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionButton}>
              <MessageCircle size={20} color={colors.textSecondary} />
              <Text style={styles.actionText}>{comments.length}</Text>
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={() => toggleSavePost(post.id)}>
              <Bookmark
                size={20}
                color={isSaved ? colors.primary : colors.textSecondary}
                fill={isSaved ? colors.primary : 'none'}
              />
              <Text
                style={[styles.actionText, isSaved && { color: colors.primary, fontWeight: '700' }]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeading}>Comments ({comments.length})</Text>

          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <Image source={{ uri: comment.authorAvatar }} style={styles.commentAvatar} />
              <View style={styles.commentBubble}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                  <Text style={styles.commentTime}>{comment.timeAgo}</Text>
                </View>
                <Text style={styles.commentContent}>{comment.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment or query..."
          placeholderTextColor={colors.gray400}
          value={commentText}
          onChangeText={setCommentText}
        />
        <TouchableOpacity
          style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    padding: spacing.md,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.sm,
  },
  businessInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessName: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postBody: {
    ...typography.body1,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  imagesContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  postImage: {
    width: '100%',
    height: 240,
  },
  offerTagContainer: {
    backgroundColor: colors.accentCyanLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  offerTagText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '600',
  },
  commentsSection: {
    padding: spacing.md,
  },
  commentsHeading: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  commentContent: {
    ...typography.body2,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  inputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
