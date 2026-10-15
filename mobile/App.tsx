import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { Header } from './src/components/Header';
import { BottomTabBar } from './src/components/BottomTabBar';
import { DrawerMenu } from './src/components/DrawerMenu';
import { CreateModal } from './src/components/CreateModal';
import { EnquiryModal } from './src/components/EnquiryModal';
import { ShareModal } from './src/components/ShareModal';
import { Toast } from './src/components/Toast';

// Auth Screens
import { SignInScreen } from './src/screens/SignInScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';

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
import { colors } from './src/styles/theme';

function MainApp() {
  const { currentRoute, isAuthenticated, isLoadingAuth } = useApp();

  // Loading indicator while checking stored session
  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Authentication Flow
  const isAuthRoute =
    currentRoute === 'sign_in' ||
    currentRoute === 'sign_up' ||
    currentRoute === 'forgot_password';

  if (!isAuthenticated || isAuthRoute) {
    const renderAuthScreen = () => {
      switch (currentRoute) {
        case 'sign_up':
          return <SignUpScreen />;
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
    <SafeAreaProvider>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </SafeAreaProvider>
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
