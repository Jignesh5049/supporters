import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { Briefcase, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { colors, spacing, borderRadius, typography } from '../../src/styles/theme';

export default function HubLayout() {
  const router = useRouter();
  const { currentUser, userBusiness, isAuthenticated, navigate } = useApp();

  // If not authenticated, prompt to sign in
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Hub</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContent}>
          <View style={styles.iconCircle}>
            <Briefcase size={36} color={colors.primary} />
          </View>
          <Text style={styles.title}>Sign In Required</Text>
          <Text style={styles.subtitle}>
            Please sign in to access your business management dashboard and seller tools.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              navigate('sign_in');
              router.push('/(auth)/sign-in');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>Sign In to Supporters</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Spec line 60: hub/* also needs a business, and otherwise shows "Create your business".
  const hasBusiness = !!(userBusiness?.id || currentUser?.businessId);

  if (!hasBusiness) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Hub</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContent}>
          <View style={[styles.iconCircle, { backgroundColor: '#EEF0FA' }]}>
            <Briefcase size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Create Your Business</Text>
          <Text style={styles.subtitle}>
            Register your company or workshop to list wholesale products, receive direct buyer
            quotation enquiries, and access seller analytics.
          </Text>

          <View style={styles.perksList}>
            <View style={styles.perkRow}>
              <ShieldCheck size={16} color={colors.primary} />
              <Text style={styles.perkText}>Verified Blue Shield Vendor Trustmark</Text>
            </View>
            <View style={styles.perkRow}>
              <ShieldCheck size={16} color={colors.primary} />
              <Text style={styles.perkText}>Unlimited B2B Product & Service Listings</Text>
            </View>
            <View style={styles.perkRow}>
              <ShieldCheck size={16} color={colors.primary} />
              <Text style={styles.perkText}>Realtime WhatsApp & Chat Lead Delivery</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              navigate('business_edit');
              router.push('/hub/edit');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>Set Up Business Profile</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <Slot />;
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
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  perksList: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
