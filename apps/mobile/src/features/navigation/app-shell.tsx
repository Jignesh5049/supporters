import { useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreateModal } from '../../components/CreateModal';
import { DrawerMenu } from '../../components/DrawerMenu';
import { EnquiryModal } from '../../components/EnquiryModal';
import { ShareModal } from '../../components/ShareModal';
import { Toast } from '../../components/Toast';
import { useApp } from '../../context/AppContext';
import { useSessionStore } from '../../stores/session-store';
import { colors } from '../../styles/theme';
import { UpdateRequiredScreen } from '../auth/update-required-screen';
import { RootStack } from './root-stack';

/** Everything around the routes: the 426 gate, the session restore spinner and the overlays. */
export function AppShell() {
  const { isAuthenticated, isLoadingAuth } = useApp();
  const isUpgradeRequired = useSessionStore((state) => state.isUpgradeRequired);
  const segments = useSegments();
  const isAuthScreen = segments[0] === '(auth)';

  // The API refused this app version (426): nothing else is usable until it is updated.
  if (isUpgradeRequired) {
    return <UpdateRequiredScreen />;
  }

  // Wait for the stored session, so a deep link to a protected screen is not redirected early.
  if (isLoadingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={isAuthScreen ? styles.authSafeArea : styles.safeArea}
      edges={isAuthScreen ? ['top', 'bottom'] : ['top']}
    >
      <StatusBar style="dark" />
      <RootStack isSignedIn={isAuthenticated} />
      {!isAuthScreen && (
        <>
          <DrawerMenu />
          <CreateModal />
          <EnquiryModal />
          <ShareModal />
        </>
      )}
      <Toast />
    </SafeAreaView>
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
  safeArea: {
    flex: 1,
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
});
