import React from 'react';
import { View, StyleSheet } from 'react-native';
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
  const { currentRoute } = useApp();

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
      <View style={styles.contentArea}>
        {renderCurrentScreen()}
      </View>

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
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
