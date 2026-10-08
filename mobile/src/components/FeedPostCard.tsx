import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FeedPost } from '../../mock';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

interface FeedPostCardProps {
  post: FeedPost;
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const {
    likedPostIds,
    toggleLikePost,
    savedPostIds,
    toggleSavePost,
    deletePost,
    openEnquiryModal,
    openShareModal,
    navigate,
    showToast
  } = useApp();

  const [menuVisible, setMenuVisible] = useState(false);
  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);

  const handleDelete = () => {
    setMenuVisible(false);
    deletePost(post.id);
  };

  const hasAttachedItem = post.attachedProduct || post.attachedService;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={() => navigate('business_detail', { businessId: post.businessId })}
          style={styles.businessAvatarLink}
          activeOpacity={0.8}
        >
          <Image source={{ uri: post.businessAvatar }} style={styles.businessAvatar} />
          {post.businessVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={7} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.businessMeta}>
          <TouchableOpacity
            onPress={() => navigate('business_detail', { businessId: post.businessId })}
            activeOpacity={0.8}
          >
            <View style={styles.nameRow}>
              <Text style={styles.businessName} numberOfLines={1}>
                {post.businessName}
              </Text>
              {post.businessVerified && (
                <Text style={styles.verifiedTag}>✓ Verified</Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.subMetaRow}>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={10} color="#667085" />
              <Text style={styles.metaText}>{post.location}</Text>
            </View>
            <Text style={styles.dotSeparator}>·</Text>
            <View style={styles.metaItem}>
              <Feather name="clock" size={10} color="#667085" />
              <Text style={styles.metaText}>{post.createdAt}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.moreButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="more-horizontal" size={18} color="#667085" />
        </TouchableOpacity>
      </View>

      {/* Offer Tag Badge */}
      {post.offerTag && (
        <View style={styles.offerBadgeContainer}>
          <Feather name="tag" size={12} color={colors.accentMagenta} />
          <Text style={styles.offerBadgeText}>{post.offerTag}</Text>
        </View>
      )}

      {/* Content Text */}
      <View style={styles.contentContainer}>
        <Text style={styles.contentText}>{post.content}</Text>
      </View>

      {/* Attached Media / Image */}
      {post.images && post.images.length > 0 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.images[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Attached Product / Service Box */}
      {hasAttachedItem && (
        <View style={styles.attachedContainer}>
          <View style={styles.attachedInfoRow}>
            {(post.attachedProduct?.image || post.attachedService?.image) && (
              <Image
                source={{
                  uri: post.attachedProduct?.image || post.attachedService?.image,
                }}
                style={styles.attachedImage}
              />
            )}
            <View style={styles.attachedTextCol}>
              <Text style={styles.attachedTitle} numberOfLines={1}>
                {post.attachedProduct?.title || post.attachedService?.title}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.attachedPrice}>
                  Starting from ₹
                  {(
                    post.attachedProduct?.price ||
                    post.attachedService?.startingPrice ||
                    0
                  ).toLocaleString('en-IN')}
                </Text>
                {post.attachedProduct?.moq && (
                  <Text style={styles.moqText}>
                    (MOQ: {post.attachedProduct.moq} {post.attachedProduct.unit || 'Units'})
                  </Text>
                )}
                {post.attachedService?.unit && (
                  <Text style={styles.moqText}>({post.attachedService.unit})</Text>
                )}
              </View>
            </View>
          </View>

          {/* Direct CTA Buttons */}
          <View style={styles.attachedActionsRow}>
            <TouchableOpacity
              onPress={() =>
                openEnquiryModal({
                  title:
                    post.attachedProduct?.title ||
                    post.attachedService?.title ||
                    'Product Enquiry',
                  businessName: post.businessName,
                  businessId: post.businessId,
                })
              }
              style={styles.enquiryBtn}
              activeOpacity={0.85}
            >
              <Feather name="send" size={12} color="#FFFFFF" />
              <Text style={styles.enquiryBtnText}>Contact Supplier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                navigate('business_detail', { businessId: post.businessId })
              }
              style={styles.viewCatalogBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.viewCatalogText}>View Catalog</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Social Stats Counters */}
      <View style={styles.countersRow}>
        <View style={styles.likeCounter}>
          <View style={[styles.thumbCircle, isLiked && styles.thumbCircleActive]}>
            <Ionicons name="thumbs-up" size={10} color="#FFFFFF" />
          </View>
          <Text style={styles.counterText}>{post.likesCount} likes</Text>
        </View>

        <Text style={styles.counterText}>
          {post.sharesCount} shares
        </Text>
      </View>

      {/* Social Actions Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          onPress={() => toggleLikePost(post.id)}
          style={[styles.actionButton, isLiked && styles.actionButtonActive]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? "thumbs-up" : "thumbs-up-outline"}
            size={17}
            color={isLiked ? colors.primary : '#667085'}
          />
          <Text style={[styles.actionLabel, isLiked && styles.actionLabelActive]}>
            {isLiked ? 'Liked' : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            openShareModal({
              title: post.businessName + ' on Supporters',
              url: `https://supporters.in/post/${post.id}`,
            })
          }
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Feather name="share-2" size={16} color="#667085" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => toggleSavePost(post.id)}
          style={[styles.actionButton, isSaved && styles.actionButtonActive]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={17}
            color={isSaved ? colors.primary : '#667085'}
          />
          <Text style={[styles.actionLabel, isSaved && styles.actionLabelActive]}>
            {isSaved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modern Options Action Sheet Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.menuSheet}>
                {/* Top drag handle indicator */}
                <View style={styles.dragHandle} />

                {/* Author Info Header */}
                <View style={styles.menuHeader}>
                  <Image source={{ uri: post.businessAvatar }} style={styles.menuAvatar} />
                  <View style={styles.menuHeaderInfo}>
                    <Text style={styles.menuAuthorName} numberOfLines={1}>
                      {post.businessName}
                    </Text>
                    <Text style={styles.menuPostTime}>
                      {post.location} · {post.createdAt}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setMenuVisible(false)}
                    style={styles.menuCloseBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={18} color="#667085" />
                  </TouchableOpacity>
                </View>

                {/* Options List */}
                <View style={styles.menuItemsList}>
                  {/* Save / Bookmark */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      toggleSavePost(post.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconCircle, { backgroundColor: isSaved ? '#EEF2FF' : '#F8FAFC' }]}>
                      <Ionicons
                        name={isSaved ? "bookmark" : "bookmark-outline"}
                        size={18}
                        color={isSaved ? colors.primary : '#475569'}
                      />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={[styles.menuItemTitle, isSaved && { color: colors.primary }]}>
                        {isSaved ? 'Remove from Saved' : 'Save Post'}
                      </Text>
                      <Text style={styles.menuItemSubtitle}>
                        {isSaved ? 'Remove from your bookmarks' : 'Save this update to read later'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Copy Link */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      showToast('Post link copied to clipboard', 'success');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconCircle, { backgroundColor: '#F8FAFC' }]}>
                      <Feather name="link-2" size={18} color="#475569" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemTitle}>Copy Post Link</Text>
                      <Text style={styles.menuItemSubtitle}>Share direct link with your network</Text>
                    </View>
                  </TouchableOpacity>

                  {/* View Business Profile */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      navigate('business_detail', { businessId: post.businessId });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconCircle, { backgroundColor: '#F8FAFC' }]}>
                      <Feather name="briefcase" size={18} color="#475569" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemTitle}>View Business Profile</Text>
                      <Text style={styles.menuItemSubtitle}>Explore catalog, verified badge & details</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.menuDivider} />

                  {/* Delete Post (Requested Option) */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconCircle, { backgroundColor: '#FEE2E2' }]}>
                      <Feather name="trash-2" size={18} color="#DC2626" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={[styles.menuItemTitle, { color: '#DC2626', fontWeight: '700' }]}>
                        Delete Post
                      </Text>
                      <Text style={styles.menuItemSubtitle}>Permanently remove this post from the feed</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Report Post */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      showToast('Post reported to moderation team', 'info');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuItemIconCircle, { backgroundColor: '#F8FAFC' }]}>
                      <Feather name="flag" size={18} color="#94A3B8" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={[styles.menuItemTitle, { color: '#64748B' }]}>Report Post</Text>
                      <Text style={styles.menuItemSubtitle}>Flag inappropriate or spam content</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.menuCancelBtn}
                  onPress={() => setMenuVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.menuCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  businessAvatarLink: {
    position: 'relative',
  },
  businessAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  businessMeta: {
    flex: 1,
    marginLeft: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  businessName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  verifiedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentCyan,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  dotSeparator: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  moreButton: {
    padding: 6,
  },
  offerBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentMagentaLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 12,
    marginBottom: 8,
    gap: 4,
  },
  offerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentMagenta,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  contentText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  attachedContainer: {
    margin: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
  },
  attachedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachedImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  attachedTextCol: {
    flex: 1,
  },
  attachedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  attachedPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  moqText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  attachedActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  enquiryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  enquiryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewCatalogBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  viewCatalogText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  countersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  likeCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thumbCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#667085',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCircleActive: {
    backgroundColor: colors.primary,
  },
  counterText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'transparent',
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  menuHeaderInfo: {
    flex: 1,
  },
  menuAuthorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuPostTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  menuCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  menuItemsList: {
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuItemIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  menuCancelBtn: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});
