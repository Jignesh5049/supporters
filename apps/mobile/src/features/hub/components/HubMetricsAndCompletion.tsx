import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../../styles/theme';

interface HubMetricsAndCompletionProps {
  completionPercent: number;
  followersCount: number;
  postsCount: number;
  publishedPostsCount: number;
  productsCount: number;
  onOpenFollowers: () => void;
  onNavigatePosts: () => void;
  onCompleteProfile: () => void;
}

export function HubMetricsAndCompletion({
  completionPercent,
  followersCount,
  postsCount,
  publishedPostsCount,
  productsCount,
  onOpenFollowers,
  onNavigatePosts,
  onCompleteProfile,
}: HubMetricsAndCompletionProps) {
  return (
    <View style={styles.container}>
      {/* Profile Completion Card */}
      <View style={styles.completionCard}>
        <View style={styles.completionTop}>
          <View style={styles.completionTextCol}>
            <Text style={styles.completionTitle}>Profile Completion: {completionPercent}%</Text>
            <Text style={styles.completionSub}>
              Add Instagram link & operating hours to rank higher in search
            </Text>
          </View>
          <TouchableOpacity onPress={onCompleteProfile}>
            <Text style={styles.completeLink}>Complete ↗</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.completionTrack}>
          <View style={[styles.completionBar, { width: `${completionPercent}%` }]} />
        </View>
      </View>

      {/* Metric Cards Row */}
      <View style={styles.metricsRow}>
        <TouchableOpacity style={styles.metricCard} onPress={onOpenFollowers} activeOpacity={0.75}>
          <Text style={[styles.metricNumber, { color: colors.primary }]}>{followersCount}</Text>
          <Text style={[styles.metricLabel, { color: colors.primary, fontWeight: '700' }]}>
            Followers ↗
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.metricCard} onPress={onNavigatePosts} activeOpacity={0.75}>
          <Text style={[styles.metricNumber, { color: colors.primary }]}>{postsCount}</Text>
          <Text style={styles.metricLabel}>Posts ({publishedPostsCount} Live)</Text>
        </TouchableOpacity>

        <View style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: '#00AEEF' }]}>{productsCount}</Text>
          <Text style={styles.metricLabel}>Catalog Items</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  completionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  completionTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  completionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  completionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  completeLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  completionTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionBar: {
    height: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
