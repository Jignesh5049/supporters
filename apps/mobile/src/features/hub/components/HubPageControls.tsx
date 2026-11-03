import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Newspaper, FileText, PlusCircle, Sliders, ChevronRight } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface HubPageControlsProps {
  draftPostsCount: number;
  onNavigate: (route: string) => void;
}

export function HubPageControls({ draftPostsCount, onNavigate }: HubPageControlsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Business Page Controls</Text>

      <View style={styles.hubGrid}>
        {/* Module 1: Manage Posts */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={() => onNavigate('business_posts')}
          activeOpacity={0.8}
        >
          <View style={[styles.hubIconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Newspaper size={20} color={colors.primary} />
          </View>
          <View style={styles.hubCardText}>
            <View style={styles.hubTitleRow}>
              <Text style={styles.hubCardTitle}>Manage Posts</Text>
              {draftPostsCount > 0 && (
                <View style={styles.draftBadge}>
                  <Text style={styles.draftBadgeText}>{draftPostsCount} Draft</Text>
                </View>
              )}
            </View>
            <Text style={styles.hubCardDesc}>
              Publish updates, manage drafts, archive or delete factory posts
            </Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Module 2: Edit Business Profile */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={() => onNavigate('business_edit')}
          activeOpacity={0.8}
        >
          <View style={[styles.hubIconCircle, { backgroundColor: '#F0FDF4' }]}>
            <FileText size={20} color="#16A34A" />
          </View>
          <View style={styles.hubCardText}>
            <Text style={styles.hubCardTitle}>Edit Business Information</Text>
            <Text style={styles.hubCardDesc}>
              Address, Google Maps link, Instagram handle, opening hours
            </Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Module 3: Create New Post */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={() => onNavigate('create')}
          activeOpacity={0.8}
        >
          <View style={[styles.hubIconCircle, { backgroundColor: '#FDF4FF' }]}>
            <PlusCircle size={20} color={colors.accentMagenta} />
          </View>
          <View style={styles.hubCardText}>
            <Text style={styles.hubCardTitle}>Create New Listing / Post</Text>
            <Text style={styles.hubCardDesc}>
              Broadcast catalog items, offers or milestones with 16:9 & 9:16 media
            </Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* Module 4: Settings */}
        <TouchableOpacity
          style={styles.hubCard}
          onPress={() => onNavigate('business_settings')}
          activeOpacity={0.8}
        >
          <View style={[styles.hubIconCircle, { backgroundColor: '#F8FAFC' }]}>
            <Sliders size={20} color="#475569" />
          </View>
          <View style={styles.hubCardText}>
            <Text style={styles.hubCardTitle}>Business Hub Settings</Text>
            <Text style={styles.hubCardDesc}>
              Notification preferences, address visibility & deactivation
            </Text>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  hubGrid: {
    gap: 8,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  hubIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubCardText: {
    flex: 1,
  },
  hubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  hubCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  draftBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  hubCardDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
});
