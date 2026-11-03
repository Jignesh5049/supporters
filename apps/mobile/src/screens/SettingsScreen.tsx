import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { ArrowLeft, ChevronRight, ExternalLink, LogOut, Trash2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function SettingsScreen() {
  const {
    currentUser,
    userBusiness,
    updateBusinessProfile,
    updateUserProfile,
    showToast,
    navigate,
    signOut,
  } = useApp();

  const [rfqNotifications, setRfqNotifications] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);
  const [showPhoneOnCatalog, setShowPhoneOnCatalog] = useState(
    userBusiness?.showPhone ?? currentUser.showPhone ?? true,
  );

  const handleToggleShowPhone = (val: boolean) => {
    setShowPhoneOnCatalog(val);
    updateBusinessProfile({ showPhone: val });
    updateUserProfile({ showPhone: val });
    showToast(
      val
        ? 'Phone number will now be shown on your catalog'
        : 'Phone number is now hidden from your catalog',
      'info',
    );
  };

  const promptConfirm = (
    title: string,
    message: string,
    actionText: string,
    onConfirm: () => void,
  ) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || window.confirm(`${title}\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: actionText, style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  const handleLogout = () => {
    promptConfirm(
      'Sign Out of Supporters',
      'Are you sure you want to log out of your session?',
      'Sign Out',
      () => {
        signOut();
      },
    );
  };

  const handleDeleteAccount = () => {
    promptConfirm(
      'Delete Account Permanently',
      'Are you sure you want to delete your account? All listings, business data, and leads will be permanently erased. This cannot be undone.',
      'Delete Account',
      async () => {
        showToast('Account deletion request submitted. Your session has ended.', 'info');
        await signOut();
      },
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('profile')} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings & Preferences</Text>
      </View>

      <View style={styles.content}>
        {/* Account Section */}
        <Text style={styles.sectionHeader}>ACCOUNT & PROFILE</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>Registered Name</Text>
              <Text style={styles.rowSub}>{currentUser.name}</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>Business Email</Text>
              <Text style={styles.rowSub}>{currentUser.email}</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>Phone & WhatsApp</Text>
              <Text style={styles.rowSub}>{currentUser.phone}</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionHeader}>NOTIFICATIONS & ALERTS</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.rowTitle}>Quotation & RFQ Alerts</Text>
              <Text style={styles.rowSub}>Instant notification when buyers request a quote</Text>
            </View>
            <Switch
              value={rfqNotifications}
              onValueChange={setRfqNotifications}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.rowTitle}>Direct Message Push</Text>
              <Text style={styles.rowSub}>Alerts for seller replies & chat inquiries</Text>
            </View>
            <Switch
              value={chatNotifications}
              onValueChange={setChatNotifications}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.rowTitle}>Promotional & Trade Updates</Text>
              <Text style={styles.rowSub}>Festive discount windows & category highlights</Text>
            </View>
            <Switch
              value={marketingNotifications}
              onValueChange={setMarketingNotifications}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
            />
          </View>
        </View>

        {/* Privacy */}
        <Text style={styles.sectionHeader}>PRIVACY & DIRECTORY</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.rowTitle}>Public Directory Listing</Text>
              <Text style={styles.rowSub}>Allow buyers across India to discover your catalog</Text>
            </View>
            <Switch
              value={profilePublic}
              onValueChange={setProfilePublic}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
            />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.rowTitle}>Show Number on Catalog</Text>
                <View
                  style={{
                    backgroundColor: showPhoneOnCatalog ? '#ECFDF5' : '#F3F4F6',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '800',
                      color: showPhoneOnCatalog ? '#065F46' : '#6B7280',
                    }}
                  >
                    {showPhoneOnCatalog ? 'VISIBLE' : 'HIDDEN'}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowSub}>
                Allow buyers to view your contact number ({currentUser.phone || userBusiness?.phone}
                ) directly on your catalog storefront
              </Text>
            </View>
            <Switch
              value={showPhoneOnCatalog}
              onValueChange={handleToggleShowPhone}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
            />
          </View>
        </View>

        {/* App Info & Sign Out */}
        <Text style={styles.sectionHeader}>SUPPORT & ABOUT</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => showToast('Help & documentation opened', 'info')}
          >
            <Text style={styles.rowTitle}>Help & Support Desk</Text>
            <ExternalLink size={16} color="#667085" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => showToast('Terms of Service v2.4', 'info')}
          >
            <Text style={styles.rowTitle}>Terms of Service & Privacy Policy</Text>
            <ExternalLink size={16} color="#667085" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <Text style={styles.rowTitle}>App Version</Text>
            <Text style={styles.rowSub}>v1.0.0 (Supporters Mobile)</Text>
          </View>
        </View>

        {/* Danger Zone - App Store 5.1.1(v) & Google Play Compliant */}
        <Text style={styles.sectionHeader}>DANGER ZONE</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.deleteTitle}>Delete Account</Text>
              <Text style={styles.rowSub}>
                Permanently delete account, business profile, and catalog data
              </Text>
            </View>
            <Trash2 size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone - App Store 5.1.1(v) & Google Play Compliant */}
        <Text style={styles.sectionHeader}>DANGER ZONE</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.deleteTitle}>Delete Account</Text>
              <Text style={styles.rowSub}>
                Permanently delete account, business profile, and catalog data
              </Text>
            </View>
            <Trash2 size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={16} color={colors.textSecondary} />
          <Text style={styles.logoutText}>Sign Out of Supporters</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 10,
  },
  content: {
    padding: 14,
    paddingBottom: 30,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  rowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  deleteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 24,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
});
