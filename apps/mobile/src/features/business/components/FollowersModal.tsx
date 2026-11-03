import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Search, CheckCircle2, UserPlus, UserCheck } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface FollowerItem {
  id: string;
  name: string;
  username: string;
  avatar: string;
  city: string;
  isFollowedByMe: boolean;
}

const SAMPLE_FOLLOWERS: FollowerItem[] = [
  {
    id: 'f-1',
    name: 'Rajesh Patel',
    username: 'rajesh_valves',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    city: 'Ahmedabad',
    isFollowedByMe: true,
  },
  {
    id: 'f-2',
    name: 'Pooja Sharma',
    username: 'pooja_textiles',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    city: 'Surat',
    isFollowedByMe: false,
  },
  {
    id: 'f-3',
    name: 'Amitabh Shah',
    username: 'amitabh_machinery',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    city: 'Rajkot',
    isFollowedByMe: true,
  },
];

interface FollowersModalProps {
  visible: boolean;
  onClose: () => void;
  businessName: string;
}

export function FollowersModal({ visible, onClose, businessName }: FollowersModalProps) {
  const [search, setSearch] = useState('');
  const [followers, setFollowers] = useState<FollowerItem[]>(SAMPLE_FOLLOWERS);

  const filtered = followers.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.username.toLowerCase().includes(search.toLowerCase()) ||
      f.city.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleFollowUser = (id: string) => {
    setFollowers((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isFollowedByMe: !f.isFollowedByMe } : f)),
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Followers</Text>
              <Text style={styles.subTitle}>{businessName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBar}>
            <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search followers..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Followers List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {filtered.map((item) => (
              <View key={item.id} style={styles.followerRow}>
                <Image
                  source={{ uri: item.avatar }}
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="disk"
                />
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.username}>
                    @{item.username} • {item.city}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.followToggle, item.isFollowedByMe && styles.followToggleActive]}
                  onPress={() => toggleFollowUser(item.id)}
                >
                  {item.isFollowedByMe ? (
                    <Text style={styles.followToggleTextActive}>Following</Text>
                  ) : (
                    <Text style={styles.followToggleText}>Follow</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.md,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subTitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 40,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  followerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  followToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  followToggleActive: {
    backgroundColor: colors.primaryLight,
  },
  followToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followToggleTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
