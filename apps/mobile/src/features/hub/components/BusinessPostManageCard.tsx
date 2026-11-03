import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  Package,
  Heart,
  MessageCircle,
  Share2,
  EyeOff,
  CheckCircle2,
  Edit2,
  Archive,
  Trash2,
} from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { FeedPost } from '../../../../mock';

interface BusinessPostManageCardProps {
  post: FeedPost;
  onTogglePublish: (post: FeedPost) => void;
  onEdit: (post: FeedPost) => void;
  onArchive: (post: FeedPost) => void;
  onDelete: (post: FeedPost) => void;
}

export function BusinessPostManageCard({
  post,
  onTogglePublish,
  onEdit,
  onArchive,
  onDelete,
}: BusinessPostManageCardProps) {
  const status = post.postStatus || 'Published';
  const isPublished = status === 'Published';
  const isDraft = status === 'Draft';
  const isArchived = status === 'Archived';

  return (
    <View style={styles.card}>
      {/* Header Info */}
      <View style={styles.cardHeader}>
        <View style={styles.typeTag}>
          <Text style={styles.typeTagText}>{post.postType.toUpperCase()}</Text>
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
              styles.statusText,
              isPublished && styles.textPublished,
              isDraft && styles.textDraft,
              isArchived && styles.textArchived,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.contentText} numberOfLines={3}>
        {post.content}
      </Text>

      {/* Image Preview */}
      {post.images && post.images.length > 0 && (
        <View style={styles.imagePreviewWrap}>
          <Image
            source={{ uri: post.images[0] }}
            style={styles.postThumb}
            contentFit="cover"
            transition={200}
          />
          {post.aspectRatio && (
            <View style={styles.ratioPill}>
              <Text style={styles.ratioPillText}>{post.aspectRatio}</Text>
            </View>
          )}
        </View>
      )}

      {/* Attached Product preview */}
      {post.attachedProduct && (
        <View style={styles.attachedPreview}>
          <Package size={13} color={colors.primary} />
          <Text style={styles.attachedText} numberOfLines={1}>
            Attached: {post.attachedProduct.title} (₹
            {post.attachedProduct.price.toLocaleString('en-IN')})
          </Text>
        </View>
      )}

      {/* Engagement Stats */}
      <View style={styles.engagementRow}>
        <View style={styles.engagementLeft}>
          <View style={styles.statItem}>
            <Heart size={13} color="#64748B" />
            <Text style={styles.statText}>{post.likesCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <MessageCircle size={13} color="#64748B" />
            <Text style={styles.statText}>{post.commentsCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Share2 size={12} color="#64748B" />
            <Text style={styles.statText}>{post.sharesCount || 0}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{post.createdAt}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionPill}
          onPress={() => onTogglePublish(post)}
          activeOpacity={0.7}
        >
          {isPublished ? (
            <EyeOff size={13} color="#D97706" />
          ) : (
            <CheckCircle2 size={13} color="#16A34A" />
          )}
          <Text style={[styles.actionText, { color: isPublished ? '#D97706' : '#16A34A' }]}>
            {isPublished ? 'Unpublish' : 'Publish'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPill}
          onPress={() => onEdit(post)}
          activeOpacity={0.7}
        >
          <Edit2 size={13} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPill}
          onPress={() => onArchive(post)}
          activeOpacity={0.7}
        >
          <Archive size={13} color="#64748B" />
          <Text style={[styles.actionText, { color: '#64748B' }]}>
            {isArchived ? 'Unarchive' : 'Archive'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deletePill}
          onPress={() => onDelete(post)}
          activeOpacity={0.7}
        >
          <Trash2 size={13} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeTag: {
    backgroundColor: '#EEF0FA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '700',
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
  statusText: {
    fontSize: 10,
    fontWeight: '700',
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
  contentText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 10,
  },
  imagePreviewWrap: {
    position: 'relative',
    height: 140,
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
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratioPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  attachedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachedText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
  statText: {
    fontSize: 11,
    color: '#64748B',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deletePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
