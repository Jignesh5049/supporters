import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, XCircle, FilePlus, PlusCircle } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import { SuggestedBusinessesWidget } from '../../../components/SuggestedBusinessesWidget';

interface FeedHeaderProps {
  feedSearch: string;
  setFeedSearch: (v: string) => void;
  onOpenRequirementModal: () => void;
}

export function FeedHeader({ feedSearch, setFeedSearch, onOpenRequirementModal }: FeedHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      {/* Feed Quick Search Bar */}
      <View style={styles.searchBar}>
        <Search size={15} color="#667085" />
        <TextInput
          style={styles.searchInput}
          value={feedSearch}
          onChangeText={setFeedSearch}
          placeholder="Search posts, offers or verified updates..."
          placeholderTextColor="#667085"
        />
        {feedSearch.length > 0 && (
          <TouchableOpacity
            onPress={() => setFeedSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <XCircle size={15} color="#667085" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sleek Post Requirement Banner */}
      <TouchableOpacity
        style={styles.reqBanner}
        onPress={onOpenRequirementModal}
        activeOpacity={0.85}
      >
        <View style={styles.reqBannerLeft}>
          <View style={styles.reqIconBox}>
            <FilePlus size={15} color="#FFFFFF" />
          </View>
          <Text style={styles.reqBannerTitle}>Looking to Buy?</Text>
        </View>
        <View style={styles.reqBannerBtn}>
          <PlusCircle size={12} color="#FFFFFF" />
          <Text style={styles.reqBannerBtnText}>Post Requirement</Text>
        </View>
      </TouchableOpacity>

      <SuggestedBusinessesWidget />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  reqBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  reqBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reqBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reqBannerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
