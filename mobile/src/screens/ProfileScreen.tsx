import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { FeedPostCard } from '../components/FeedPostCard';
import { colors } from '../styles/theme';

export function ProfileScreen() {
  const { currentUser, updateUserProfile, posts, products, navigate } = useApp();
  const [activeTab, setActiveTab] = useState<'posts' | 'catalog' | 'about'>('posts');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states for profile update
  const [editName, setEditName] = useState(currentUser.name);
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [editBio, setEditBio] = useState(currentUser.bio);
  const [editPhone, setEditPhone] = useState(currentUser.phone);
  const [editEmail, setEditEmail] = useState(currentUser.email);
  const [editCity, setEditCity] = useState(currentUser.city);
  const [editState, setEditState] = useState(currentUser.state);

  const openEditModal = () => {
    setEditName(currentUser.name);
    setEditUsername(currentUser.username);
    setEditBio(currentUser.bio);
    setEditPhone(currentUser.phone);
    setEditEmail(currentUser.email);
    setEditCity(currentUser.city);
    setEditState(currentUser.state);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = () => {
    updateUserProfile({
      name: editName.trim() || currentUser.name,
      username: editUsername.trim() || currentUser.username,
      bio: editBio.trim() || currentUser.bio,
      phone: editPhone.trim() || currentUser.phone,
      email: editEmail.trim() || currentUser.email,
      city: editCity.trim() || currentUser.city,
      state: editState.trim() || currentUser.state,
    });
    setIsEditModalOpen(false);
  };

  const myPosts = posts.filter((p) => p.businessId === currentUser.businessId);
  const myProducts = products.filter((p) => p.businessId === currentUser.businessId);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        <Image source={{ uri: currentUser.coverImage }} style={styles.coverImage} />
      </View>

      {/* Profile Header Details */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
            <View style={styles.verifiedIcon}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={openEditModal}
              style={styles.editProfileBtnPrimary}
              activeOpacity={0.8}
            >
              <Feather name="edit-3" size={13} color="#FFFFFF" />
              <Text style={styles.editProfileBtnPrimaryText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigate('settings')}
              style={styles.settingsIconBtn}
              activeOpacity={0.8}
            >
              <Feather name="settings" size={14} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigate('referral')}
              style={styles.inviteBtn}
              activeOpacity={0.8}
            >
              <Feather name="gift" size={13} color="#FFFFFF" />
              <Text style={styles.inviteText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Titles */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{currentUser.name}</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          </View>
          <Text style={styles.usernameText}>@{currentUser.username}</Text>

          <Text style={styles.bioText}>{currentUser.bio}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={12} color="#667085" />
              <Text style={styles.metaText}>
                {currentUser.city}, {currentUser.state}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color="#667085" />
              <Text style={styles.metaText}>Joined {currentUser.memberSince}</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{currentUser.followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{currentUser.followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() =>
              navigate('business_detail', { businessId: currentUser.businessId })
            }
          >
            <Text style={styles.statNumber}>{currentUser.businessesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.primary, fontWeight: '700' }]}>
              Business ↗
            </Text>
          </TouchableOpacity>
        </View>

        {/* Growth Shortcuts */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() =>
              navigate('business_detail', { businessId: currentUser.businessId })
            }
          >
            <Feather name="briefcase" size={16} color={colors.primary} />
            <Text style={styles.shortcutTitle}>My Business Hub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcutCard, { borderColor: 'rgba(163,35,142,0.3)' }]}
            onPress={() => navigate('subscription')}
          >
            <MaterialCommunityIcons name="crown" size={18} color="#F59E0B" />
            <Text style={styles.shortcutTitle}>Supporters Pro</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Tabs */}
        <View style={styles.tabBar}>
          {(['posts', 'catalog', 'about'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab === 'posts'
                    ? `Posts (${myPosts.length})`
                    : tab === 'catalog'
                    ? `Catalog (${myProducts.length})`
                    : 'About'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab Contents */}
      <View style={styles.tabContentArea}>
        {activeTab === 'posts' && (
          <View>
            {myPosts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </View>
        )}

        {activeTab === 'catalog' && (
          <View style={styles.catalogGrid}>
            {myProducts.map((p) => (
              <View key={p.id} style={styles.catalogCard}>
                <Image source={{ uri: p.images[0] }} style={styles.catalogImg} />
                <View style={styles.catalogBody}>
                  <Text style={styles.catalogTitle} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={styles.catalogPrice}>
                    ₹{p.price.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.catalogMoq}>
                    MOQ: {p.minOrderQuantity} {p.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeaderRow}>
              <Text style={styles.aboutHeading}>Business Profile & Contact</Text>
              <TouchableOpacity
                onPress={openEditModal}
                style={styles.aboutEditBtn}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={13} color={colors.primary} />
                <Text style={styles.aboutEditText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.aboutBody}>
              {currentUser.bio}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mobile:</Text>
              <Text style={styles.detailValue}>{currentUser.phone}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{currentUser.email}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Primary Location:</Text>
              <Text style={styles.detailValue}>
                {currentUser.city}, {currentUser.state}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.editModalContainer}>
            {/* Modal Header */}
            <View style={styles.editModalHeader}>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                style={styles.closeModalBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>Update Profile</Text>
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={styles.saveHeaderBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.saveHeaderBtnText}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.editFormScroll}
              contentContainerStyle={styles.editFormContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Avatar Preview */}
              <View style={styles.avatarEditPreview}>
                <Image source={{ uri: currentUser.avatar }} style={styles.avatarEditImg} />
                <View style={styles.avatarEditBadge}>
                  <Feather name="camera" size={12} color="#FFFFFF" />
                </View>
              </View>

              {/* Input Fields */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Username</Text>
                <View style={styles.usernameInputWrap}>
                  <Text style={styles.atSymbol}>@</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.usernameInputInner]}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="username"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Bio / Business Summary</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMultiline]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Write a brief description of your business..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editCity}
                    onChangeText={setEditCity}
                    placeholder="City"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editState}
                    onChangeText={setEditState}
                    placeholder="State"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mobile Phone</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+91 Phone number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="email@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Bottom Action Button */}
              <TouchableOpacity
                style={styles.saveSubmitBtn}
                onPress={handleSaveProfile}
                activeOpacity={0.85}
              >
                <Feather name="check" size={16} color="#FFFFFF" />
                <Text style={styles.saveSubmitBtnText}>Save Profile Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  coverContainer: {
    height: 120,
    width: '100%',
    backgroundColor: '#CBD5E1',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -32,
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  verifiedIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editProfileBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  editProfileBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settingsIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentMagenta,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  inviteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  usernameText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  bioText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    height: '70%',
    alignSelf: 'center',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  shortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    gap: 6,
  },
  shortcutTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabContentArea: {
    padding: 12,
    paddingBottom: 24,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catalogCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  catalogImg: {
    width: '100%',
    height: 100,
    backgroundColor: '#E5E7EB',
  },
  catalogBody: {
    padding: 8,
  },
  catalogTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  catalogPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  catalogMoq: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  aboutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aboutHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  aboutEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  aboutEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  aboutBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  detailLabel: {
    width: 120,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailValue: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  editModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  saveHeaderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  editFormScroll: {
    paddingHorizontal: 18,
  },
  editFormContent: {
    paddingVertical: 16,
    paddingBottom: 36,
  },
  avatarEditPreview: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 18,
  },
  avatarEditImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  usernameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingLeft: 12,
  },
  atSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 4,
  },
  usernameInputInner: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 0,
  },
  fieldInputMultiline: {
    minHeight: 80,
    paddingTop: 10,
  },
  saveSubmitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  saveSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
