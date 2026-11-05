import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, ChevronRight, FileText, Package, Wrench, Megaphone, Tag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function CreateModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createModalOpen, setCreateModalOpen, navigate } = useApp();

  const handleSelectOption = (tab: string) => {
    setCreateModalOpen(false);
    if (tab === 'requirement') {
      navigate('home', { openRequirement: true });
      router.push('/requirements/new');
    } else {
      navigate('create', { initialTab: tab });
      router.push('/(tabs)/create');
    }
  };

  const options = [
    {
      id: 'requirement',
      title: 'Post a Requirement',
      badge: 'Buyer & Sourcing',
      badgeBg: '#FEF3C7',
      badgeColor: '#D97706',
      desc: 'Looking for products or materials? Post requirements for sellers to reach out',
      Icon: FileText,
      iconBg: '#F59E0B',
    },
    {
      id: 'product',
      title: 'List a Product',
      badge: 'B2B & Retail',
      badgeBg: '#EEF2FF',
      badgeColor: '#4338CA',
      desc: 'Showcase physical items, wholesale inventory, MOQ & specs',
      Icon: Package,
      iconBg: colors.primary,
    },
    {
      id: 'service',
      title: 'Add a Service',
      badge: 'Custom Quotes',
      badgeBg: '#E0F7FE',
      badgeColor: '#0284C7',
      desc: 'Highlight bespoke manufacturing, repairs, consulting or turnkey work',
      Icon: Wrench,
      iconBg: colors.accentCyan,
    },
    {
      id: 'post',
      title: 'Share an Update',
      badge: 'Social Feed',
      badgeBg: '#F3E8FF',
      badgeColor: '#7E22CE',
      desc: 'Post factory dispatch, milestones, photos or attach catalog items',
      Icon: Megaphone,
      iconBg: '#6366F1',
    },
    {
      id: 'offer',
      title: 'Post Limited Offer',
      badge: 'Spotlight Deals',
      badgeBg: colors.accentMagentaLight,
      badgeColor: colors.accentMagenta,
      desc: 'Promote clearance discounts, festive wholesale lots or flash offers',
      Icon: Tag,
      iconBg: colors.accentMagenta,
    },
  ];

  return (
    <Modal
      visible={createModalOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setCreateModalOpen(false)}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={() => setCreateModalOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header indicator */}
          <View style={styles.dragIndicator} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Create Listing or Post</Text>
              <Text style={styles.sheetSubtitle}>
                Broadcast your verified offerings to buyers & businesses
              </Text>
            </View>
            <TouchableOpacity onPress={() => setCreateModalOpen(false)} style={styles.closeBtn}>
              <X size={20} color="#667085" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {options.map((opt) => {
              const OptIcon = opt.Icon;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => handleSelectOption(opt.id)}
                  style={styles.optionCard}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconContainer, { backgroundColor: opt.iconBg }]}>
                    <OptIcon size={22} color="#FFFFFF" />
                  </View>

                  <View style={styles.optionDetails}>
                    <View style={styles.titleRow}>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <View style={[styles.badgeContainer, { backgroundColor: opt.badgeBg }]}>
                        <Text style={[styles.badgeText, { color: opt.badgeColor }]}>
                          {opt.badge}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.optionDesc} numberOfLines={2}>
                      {opt.desc}
                    </Text>
                  </View>

                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 10,
    marginBottom: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeContainer: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
});
