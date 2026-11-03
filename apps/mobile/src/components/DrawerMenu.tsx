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
  Alert,
  Platform,
} from 'react-native';
import {
  X,
  CheckCircle2,
  Bookmark,
  FileText,
  CreditCard,
  Gift,
  Briefcase,
  Crown,
  Settings,
  LogOut,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function DrawerMenu() {
  const insets = useSafeAreaInsets();
  const { drawerOpen, setDrawerOpen, currentUser, navigate, signOut } = useApp();

  const handleNavigate = (route: any, params?: any) => {
    setDrawerOpen(false);
    navigate(route, params);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to log out of Supporters?')
          : true;
      if (confirmed) {
        signOut();
      }
    } else {
      Alert.alert('Sign Out of Supporters', 'Are you sure you want to log out of your session?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]);
    }
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

        <View
          style={[
            styles.drawerContent,
            { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 },
          ]}
        >
          {/* Header Close */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Menu</Text>
            <TouchableOpacity onPress={() => setDrawerOpen(false)} style={styles.closeButton}>
              <X size={20} color="#667085" />
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
                <CheckCircle2 size={15} color={colors.accentCyan} />
              </View>
              <Text style={styles.userHandle}>@{currentUser.username}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified Member</Text>
              </View>
            </View>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.menuList}>
            {/* Collection */}
            <Text style={styles.sectionHeader}>COLLECTION</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('saved')}>
              <Bookmark size={18} color={colors.primary} />
              <Text style={styles.menuItemText}>Saved Collection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('requirements')}
            >
              <FileText size={18} color="#0284C7" />
              <Text style={styles.menuItemText}>Buyer Requirements</Text>
            </TouchableOpacity>

            {/* Earnings & Business */}
            <Text style={styles.sectionHeader}>EARNINGS & BUSINESS</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('wallet')}>
              <CreditCard size={18} color={colors.primary} />
              <Text style={styles.menuItemText}>App Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('referral')}>
              <Gift size={18} color={colors.accentMagenta} />
              <Text style={[styles.menuItemText, { color: colors.accentMagenta }]}>
                Refer & Earn
              </Text>
              <View style={styles.rewardTag}>
                <Text style={styles.rewardTagText}>Up to ₹500</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('business_hub')}
            >
              <Briefcase size={18} color="#0D9488" />
              <Text style={styles.menuItemText}>Business Hub (Manager)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('subscription')}
            >
              <Crown size={18} color="#F59E0B" />
              <Text style={styles.menuItemText}>Supporters Pro</Text>
            </TouchableOpacity>

            {/* Account & Settings */}
            <Text style={styles.sectionHeader}>ACCOUNT</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('settings')}>
              <Settings size={18} color="#667085" />
              <Text style={styles.menuItemText}>Settings & Preferences</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <LogOut size={18} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Sign Out</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#101828',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8F9FC',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAECF0',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#101828',
  },
  userHandle: {
    fontSize: 12,
    color: '#667085',
    marginTop: 1,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentCyanLight,
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#98A2B3',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
    flex: 1,
  },
  rewardTag: {
    backgroundColor: colors.accentMagentaLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rewardTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentMagenta,
  },
});
