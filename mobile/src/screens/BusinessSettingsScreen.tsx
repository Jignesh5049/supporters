import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function BusinessSettingsScreen() {
  const { userBusiness, navigate, showToast } = useApp();

  const [inquiryAlerts, setInquiryAlerts] = useState(true);
  const [postAlerts, setPostAlerts] = useState(true);
  const [catalogPublic, setCatalogPublic] = useState(true);

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Business Storefront',
      'Temporarily unlist your catalog and products from public trade search? Your data remains intact and you can reactivate at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => showToast('Storefront deactivated temporarily. (Backend API sync pending)', 'info'),
        },
      ]
    );
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      'Delete Business Profile',
      'Warning: This action will permanently remove your business listings, products, catalog specifications, and verified trade badge. Are you sure you wish to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => showToast('Profile deletion request scheduled. (Backend API sync pending)', 'error'),
        },
      ]
    );
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate('business_hub')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Business Hub Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Navigation Quick Links */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Profile Configuration</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigate('business_edit')}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Feather name="edit-2" size={16} color={colors.primary} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Edit Business Information</Text>
              <Text style={styles.settingSub}>Company name, category, about statement</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigate('business_edit')}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Feather name="instagram" size={16} color="#A3238E" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Manage Social Links & Website</Text>
              <Text style={styles.settingSub}>Instagram, official website, Facebook, YouTube</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigate('business_edit')}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Feather name="map-pin" size={16} color="#16A34A" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Address & Get Directions Link</Text>
              <Text style={styles.settingSub}>Plot address, industrial area, PIN, Google Maps</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigate('business_edit')}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Feather name="clock" size={16} color="#D97706" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Operating Hours & Availability</Text>
              <Text style={styles.settingSub}>Working schedule, dispatch turnaround</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Notifications & Visibility Preferences */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Storefront Preferences</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Direct Buyer Inquiries</Text>
              <Text style={styles.toggleSub}>Receive instant push alerts when contractors enquire</Text>
            </View>
            <Switch
              value={inquiryAlerts}
              onValueChange={setInquiryAlerts}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Feed Post Reactions & Shares</Text>
              <Text style={styles.toggleSub}>Notifications when other businesses save or like updates</Text>
            </View>
            <Switch
              value={postAlerts}
              onValueChange={setPostAlerts}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Public Trade Catalog</Text>
              <Text style={styles.toggleSub}>Visible in regional B2B search and category directories</Text>
            </View>
            <Switch
              value={catalogPublic}
              onValueChange={setCatalogPublic}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.sectionCard, { borderColor: '#FECACA' }]}>
          <Text style={[styles.sectionHeader, { color: '#DC2626' }]}>Account Controls</Text>

          <TouchableOpacity
            style={styles.dangerItem}
            onPress={handleDeactivate}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="pause-circle" size={16} color="#D97706" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.dangerTitle}>Deactivate Business Profile</Text>
              <Text style={styles.settingSub}>Temporarily hide profile from public search</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerItem}
            onPress={handleDeleteProfile}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Feather name="trash-2" size={16} color="#DC2626" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={[styles.dangerTitle, { color: '#DC2626' }]}>Delete Business Storefront</Text>
              <Text style={styles.settingSub}>Permanently delete company listings and catalog data</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  container: {
    flex: 1,
    padding: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  toggleTextCol: {
    flex: 1,
    marginRight: 10,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  toggleSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
});
