import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function SettingsScreen() {
  const { currentUser, showToast, navigate, signOut } = useApp();

  const [rfqNotifications, setRfqNotifications] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);
  const [profilePublic, setProfilePublic] = useState(true);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to log out of Supporters?') : true;
      if (confirmed) {
        signOut();
      }
    } else {
      Alert.alert(
        'Sign Out of Supporters',
        'Are you sure you want to log out of your session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              await signOut();
            },
          },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('profile')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
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
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>Business Email</Text>
              <Text style={styles.rowSub}>{currentUser.email}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>Phone & WhatsApp</Text>
              <Text style={styles.rowSub}>{currentUser.phone}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
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
        </View>

        {/* App Info & Sign Out */}
        <Text style={styles.sectionHeader}>SUPPORT & ABOUT</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => showToast('Help & documentation opened', 'info')}
          >
            <Text style={styles.rowTitle}>Help & Support Desk</Text>
            <Feather name="external-link" size={16} color="#667085" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => showToast('Terms of Service v2.4', 'info')}
          >
            <Text style={styles.rowTitle}>Terms of Service & Privacy Policy</Text>
            <Feather name="external-link" size={16} color="#667085" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <Text style={styles.rowTitle}>App Version</Text>
            <Text style={styles.rowSub}>v1.0.0 (Supporters Mobile)</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color={colors.danger} />
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
