import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  Eye,
  MousePointerClick,
  Mail,
  Users,
  Award,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

export default function HubAnalyticsScreen() {
  const router = useRouter();
  const [range, setRange] = useState<'7d' | '30d'>('7d');

  const STATS = {
    profileViews: 1420,
    listingClicks: 840,
    enquiriesGenerated: 38,
    newFollowers: 76,
  };

  const TOP_PERFORMERS = [
    { title: 'SS304 Industrial Ball Valves (2 Inch)', views: 420, leads: 18 },
    { title: 'Forged Gate Valve (Class 150)', views: 280, leads: 11 },
    { title: 'Custom ERP & Inventory Sync for Manufacturing', views: 140, leads: 9 },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Time Filter */}
        <View style={styles.rangeSelector}>
          <TouchableOpacity
            style={[styles.rangeTab, range === '7d' && styles.rangeTabActive]}
            onPress={() => setRange('7d')}
          >
            <Text style={[styles.rangeText, range === '7d' && styles.rangeTextActive]}>
              Last 7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangeTab, range === '30d' && styles.rangeTabActive]}
            onPress={() => setRange('30d')}
          >
            <Text style={[styles.rangeText, range === '30d' && styles.rangeTextActive]}>
              Last 30 Days
            </Text>
          </TouchableOpacity>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Eye size={18} color={colors.primary} />
            </View>
            <Text style={styles.metricValue}>{range === '7d' ? '1,420' : '5,890'}</Text>
            <Text style={styles.metricLabel}>Profile Visits</Text>
            <Text style={styles.metricTrend}>↑ +18% vs last week</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#E0F2FE' }]}>
              <MousePointerClick size={18} color="#0284C7" />
            </View>
            <Text style={styles.metricValue}>{range === '7d' ? '840' : '3,210'}</Text>
            <Text style={styles.metricLabel}>Catalog Clicks</Text>
            <Text style={styles.metricTrend}>↑ +12% vs last week</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Mail size={18} color={colors.success} />
            </View>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {range === '7d' ? '38' : '142'}
            </Text>
            <Text style={styles.metricLabel}>Direct Leads</Text>
            <Text style={styles.metricTrend}>↑ +24% vs last week</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Users size={18} color="#D97706" />
            </View>
            <Text style={styles.metricValue}>{range === '7d' ? '76' : '310'}</Text>
            <Text style={styles.metricLabel}>New Followers</Text>
            <Text style={styles.metricTrend}>↑ +8% vs last week</Text>
          </View>
        </View>

        {/* Top Performing Listings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Award size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Top Performing Listings</Text>
          </View>

          {TOP_PERFORMERS.map((item, index) => (
            <View key={index} style={styles.performerRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.performerInfo}>
                <Text style={styles.performerTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.performerStats}>
                  <Text style={styles.statSub}>{item.views} views</Text>
                  <Text style={styles.statDot}>•</Text>
                  <Text style={[styles.statSub, { color: colors.primary, fontWeight: '700' }]}>
                    {item.leads} leads
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
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
    padding: spacing.md,
    paddingBottom: 60,
  },
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  rangeTabActive: {
    backgroundColor: '#FFFFFF',
  },
  rangeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rangeTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricTrend: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  performerInfo: {
    flex: 1,
  },
  performerTitle: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  performerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statDot: {
    marginHorizontal: 4,
    color: colors.gray400,
  },
});
