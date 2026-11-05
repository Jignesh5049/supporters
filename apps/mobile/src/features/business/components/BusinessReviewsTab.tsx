import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Star, ShieldCheck, ThumbsUp, Plus, X } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../../../styles/theme';

export interface BusinessReview {
  id: string;
  authorName: string;
  rating: number;
  date: string;
  comment: string;
  verifiedBuyer: boolean;
  helpfulCount: number;
}

const SAMPLE_REVIEWS: BusinessReview[] = [
  {
    id: 'rev-1',
    authorName: 'Rajesh Sharma',
    rating: 5,
    date: '2 days ago',
    comment:
      'Exceptional quality textiles. Prompt delivery of our wholesale order of 500 meters silk fabric. GST invoices and packing were immaculate.',
    verifiedBuyer: true,
    helpfulCount: 14,
  },
  {
    id: 'rev-2',
    authorName: 'Pooja Patel',
    rating: 5,
    date: '1 week ago',
    comment:
      'Very professional supplier. They customized the shade exactly to our specifications. Communication over chat was super responsive.',
    verifiedBuyer: true,
    helpfulCount: 9,
  },
  {
    id: 'rev-3',
    authorName: 'Sunil Verma',
    rating: 4,
    date: '2 weeks ago',
    comment:
      'Good pricing for bulk purchases. Delivery took one extra day due to interstate transit, but goods arrived in perfect condition.',
    verifiedBuyer: true,
    helpfulCount: 6,
  },
];

interface BusinessReviewsTabProps {
  businessName: string;
}

export function BusinessReviewsTab({ businessName }: BusinessReviewsTabProps) {
  const [reviews, setReviews] = useState<BusinessReview[]>(SAMPLE_REVIEWS);
  const [modalOpen, setModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [likedReviews, setLikedReviews] = useState<string[]>([]);

  const averageRating = (
    reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)
  ).toFixed(1);

  const handleHelpful = (id: string) => {
    if (likedReviews.includes(id)) return;
    setLikedReviews((prev) => [...prev, id]);
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r)),
    );
  };

  const handleAddReview = () => {
    if (!newComment.trim()) return;
    const newEntry: BusinessReview = {
      id: `rev-${Date.now()}`,
      authorName: reviewerName.trim() || 'Verified Buyer',
      rating: newRating,
      date: 'Just now',
      comment: newComment.trim(),
      verifiedBuyer: true,
      helpfulCount: 0,
    };
    setReviews([newEntry, ...reviews]);
    setNewComment('');
    setReviewerName('');
    setModalOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* Rating Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.scoreCol}>
          <Text style={styles.averageScore}>{averageRating}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                color="#F59E0B"
                fill={s <= Math.round(Number(averageRating)) ? '#F59E0B' : 'transparent'}
              />
            ))}
          </View>
          <Text style={styles.totalReviewsText}>{reviews.length} Verified Reviews</Text>
        </View>

        <View style={styles.actionCol}>
          <TouchableOpacity
            style={styles.writeReviewBtn}
            onPress={() => setModalOpen(true)}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.writeReviewBtnText}>Write a Review</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Review List */}
      <View style={styles.reviewsList}>
        {reviews.map((rev) => {
          const isLiked = likedReviews.includes(rev.id);
          return (
            <View key={rev.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.authorInfo}>
                  <View style={styles.authorAvatar}>
                    <Text style={styles.avatarInitial}>
                      {rev.authorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <View style={styles.authorRow}>
                      <Text style={styles.authorName}>{rev.authorName}</Text>
                      {rev.verifiedBuyer && (
                        <View style={styles.verifiedBadge}>
                          <ShieldCheck size={12} color={colors.primary} />
                          <Text style={styles.verifiedText}>Verified Buyer</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.reviewDate}>{rev.date}</Text>
                  </View>
                </View>

                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      color="#F59E0B"
                      fill={s <= rev.rating ? '#F59E0B' : 'transparent'}
                    />
                  ))}
                </View>
              </View>

              <Text style={styles.reviewComment}>{rev.comment}</Text>

              <View style={styles.reviewFooter}>
                <TouchableOpacity
                  testID={`helpful-${rev.id}`}
                  style={[styles.helpfulBtn, isLiked && styles.helpfulBtnActive]}
                  onPress={() => handleHelpful(rev.id)}
                  activeOpacity={0.7}
                >
                  <ThumbsUp size={12} color={isLiked ? colors.primary : '#64748B'} />
                  <Text style={[styles.helpfulText, isLiked && styles.helpfulTextActive]}>
                    Helpful ({rev.helpfulCount})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Modal: Write a Review */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review {businessName}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Rating</Text>
              <View style={styles.ratingPickerRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNewRating(star)}
                    style={styles.starTouch}
                  >
                    <Star
                      size={28}
                      color="#F59E0B"
                      fill={star <= newRating ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Your Name / Company</Text>
              <TextInput
                style={styles.input}
                value={reviewerName}
                onChangeText={setReviewerName}
                placeholder="e.g. Ramesh Trading Co."
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Detailed Experience</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Share thoughts on product quality, shipping speed, response time..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={[
                  styles.submitReviewBtn,
                  !newComment.trim() && styles.submitReviewBtnDisabled,
                ]}
                onPress={handleAddReview}
                disabled={!newComment.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.submitReviewBtnText}>Submit Review</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreCol: {
    alignItems: 'flex-start',
  },
  averageScore: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 4,
  },
  totalReviewsText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionCol: {
    justifyContent: 'center',
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  writeReviewBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewsList: {
    gap: spacing.md,
  },
  reviewItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  authorInfo: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontWeight: '700',
    color: colors.primary,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    ...typography.subtitle2,
    color: colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  reviewDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    ...typography.body2,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F8FAFC',
  },
  helpfulBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  helpfulText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  helpfulTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  ratingPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.xs,
  },
  starTouch: {
    padding: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  submitReviewBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  submitReviewBtnDisabled: {
    opacity: 0.5,
  },
  submitReviewBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
