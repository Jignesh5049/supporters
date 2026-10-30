import './global.css';
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AUTH_ROUTES, AppProvider, useApp } from './src/context/AppContext';
import { Header } from './src/components/Header';
import { BottomTabBar } from './src/components/BottomTabBar';
import { DrawerMenu } from './src/components/DrawerMenu';
import { CreateModal } from './src/components/CreateModal';
import { EnquiryModal } from './src/components/EnquiryModal';
import { ShareModal } from './src/components/ShareModal';
import { Toast } from './src/components/Toast';
import { queryClient } from './src/lib/query-client';

// Auth Screens
import { SignInScreen } from './src/screens/SignInScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { OtpVerifyScreen } from './src/screens/otp-verify-screen';
import { UpdateRequiredScreen } from './src/screens/update-required-screen';
import { useSessionStore } from './src/stores/session-store';

// Main App Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CreateScreen } from './src/screens/CreateScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { ReferralScreen } from './src/screens/ReferralScreen';
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BusinessDetailScreen } from './src/screens/BusinessDetailScreen';
import { ProductDetailScreen } from './src/screens/ProductDetailScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { WithdrawalScreen } from './src/screens/WithdrawalScreen';
import { WithdrawalHistoryScreen } from './src/screens/WithdrawalHistoryScreen';
import { BusinessHubScreen } from './src/screens/BusinessHubScreen';
import { BusinessEditScreen } from './src/screens/BusinessEditScreen';
import { BusinessPostsScreen } from './src/screens/BusinessPostsScreen';
import { BusinessSettingsScreen } from './src/screens/BusinessSettingsScreen';
import { colors } from './src/styles/theme';

function MainApp() {
  const { currentRoute, isLoadingAuth } = useApp();
  const isUpgradeRequired = useSessionStore((state) => state.isUpgradeRequired);

  // The API refused this app version (426): nothing else is usable until it is updated.
  if (isUpgradeRequired) {
    return <UpdateRequiredScreen />;
  }

  // Loading indicator while checking stored session
  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Authentication Flow. Without a session the main app still opens, in guest mode.
  if (AUTH_ROUTES.includes(currentRoute)) {
    const renderAuthScreen = () => {
      switch (currentRoute) {
        case 'sign_up':
          return <SignUpScreen />;
        case 'verify_otp':
          return <OtpVerifyScreen />;
        case 'forgot_password':
          return <ForgotPasswordScreen />;
        case 'sign_in':
        default:
          return <SignInScreen />;
      }
    };

    return (
      <SafeAreaView style={styles.authSafeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.authContentArea}>{renderAuthScreen()}</View>
        <Toast />
      </SafeAreaView>
    );
  }

  // Authenticated Main Application Flow
  const renderCurrentScreen = () => {
    switch (currentRoute) {
      case 'home':
        return <HomeScreen />;
      case 'discover':
        return <DiscoverScreen />;
      case 'messages':
      case 'chat':
        return <MessagesScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'create':
        return <CreateScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'saved':
        return <SavedScreen />;
      case 'referral':
        return <ReferralScreen />;
      case 'subscription':
        return <SubscriptionScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'business_detail':
        return <BusinessDetailScreen />;
      case 'product_detail':
        return <ProductDetailScreen />;
      case 'wallet':
        return <WalletScreen />;
      case 'withdrawal':
        return <WithdrawalScreen />;
      case 'withdrawal_history':
        return <WithdrawalHistoryScreen />;
      case 'business_hub':
        return <BusinessHubScreen />;
      case 'business_edit':
        return <BusinessEditScreen />;
      case 'business_posts':
        return <BusinessPostsScreen />;
      case 'business_settings':
        return <BusinessSettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      {/* Persistent Mobile Header (shown on main screens) */}
      <Header />

      {/* Active Screen Area */}
      <View style={styles.contentArea}>{renderCurrentScreen()}</View>

      {/* Persistent Bottom Tab Navigation with '+' FAB */}
      <BottomTabBar />

      {/* Modals & Overlays */}
      <DrawerMenu />
      <CreateModal />
      <EnquiryModal />
      <ShareModal />
      <Toast />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppProvider>
          <MainApp />
        </AppProvider>
        {/* Dialogs and other overlays from @supporters/ui-native render here. */}
        <PortalHost />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    height: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authSafeArea: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.background,
  },
  authContentArea: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.background,
  },
});
