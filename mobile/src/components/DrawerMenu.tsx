import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  TouchableWithoutFeedback,
  Alert
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function DrawerMenu() {
  const insets = useSafeAreaInsets();
  const {
    drawerOpen,
    setDrawerOpen,
    currentUser,
    navigate,
    unreadNotificationsCount,
    unreadMessagesCount,
    showToast
  } = useApp();

  const handleNavigate = (route: any, params?: any) => {
    setDrawerOpen(false);
    navigate(route, params);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    Alert.alert(
      'Sign Out of Supporters',
      'Are you sure you want to log out of your session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => showToast('Signed out successfully', 'info')
        }
      ]
    );
  };

  return (
    <Modal
      visible={drawerOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setDrawerOpen(false)}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.drawerContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
          {/* Header Close */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Menu</Text>
            <TouchableOpacity
              onPress={() => setDrawerOpen(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={20} color="#667085" />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <TouchableOpacity
            onPress={() => handleNavigate('profile')}
            style={styles.profileCard}
            activeOpacity={0.8}
          >
            <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{currentUser.name}</Text>
                <Ionicons name="checkmark-circle" size={15} color={colors.accentCyan} />
              </View>
              <Text style={styles.userHandle}>@{currentUser.username}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified Member</Text>
              </View>
            </View>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.menuList}>
            {/* Main items */}
            {/* Main items */}
            <Text style={styles.sectionHeader}>COLLECTION</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('saved')}
            >
              <Feather name="bookmark" size={18} color={colors.primary} />
              <Text style={styles.menuItemText}>Saved Collection</Text>
            </TouchableOpacity>

            {/* Growth & Business */}
            <Text style={styles.sectionHeader}>GROWTH & MEMBERSHIP</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('referral')}
            >
              <Feather name="gift" size={18} color={colors.accentMagenta} />
              <Text style={[styles.menuItemText, { color: colors.accentMagenta }]}>
                Invite & Earn
              </Text>
              <View style={styles.rewardTag}>
                <Text style={styles.rewardTagText}>₹250 / Ref</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('subscription')}
            >
              <MaterialCommunityIcons name="crown" size={20} color="#F59E0B" />
              <Text style={styles.menuItemText}>Supporters Pro</Text>
            </TouchableOpacity>

            {/* Account & Settings */}
            <Text style={styles.sectionHeader}>ACCOUNT</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('settings')}
            >
              <Feather name="settings" size={18} color="#667085" />
              <Text style={styles.menuItemText}>Settings & Preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={18} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawerContent: {
    width: '82%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    height: '100%',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 6,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 14,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.border,
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userHandle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,49,146,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  menuList: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 12,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  counterBadgeCyan: {
    backgroundColor: colors.accentCyan,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  counterBadgePurple: {
    backgroundColor: colors.accentMagenta,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  rewardTag: {
    backgroundColor: colors.accentMagentaLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(163,35,142,0.2)',
  },
  rewardTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentMagenta,
  },
});
