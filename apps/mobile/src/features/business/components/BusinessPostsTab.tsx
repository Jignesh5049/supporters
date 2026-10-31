import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Newspaper } from 'lucide-react-native';
import { FeedPost } from '../../../mock';
import { FeedPostCard } from '../../../components/FeedPostCard';
import { colors, spacing } from '../../../styles/theme';

interface BusinessPostsTabProps {
  posts: FeedPost[];
}

export function BusinessPostsTab({ posts }: BusinessPostsTabProps) {
  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Newspaper size={40} color={colors.textMuted} style={{ marginBottom: 8 }} />
        <Text style={styles.emptyTitle}>No updates published</Text>
        <Text style={styles.emptyText}>This business hasn't shared any public feed posts yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {posts.map((post) => (
        <FeedPostCard key={post.id} post={post} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
