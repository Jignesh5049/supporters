import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/query-client';
import { AppProvider } from '../src/context/AppContext';
import { Toast } from '../src/components/Toast';
import { DrawerMenu } from '../src/components/DrawerMenu';
import { CreateModal } from '../src/components/CreateModal';
import { EnquiryModal } from '../src/components/EnquiryModal';
import { ShareModal } from '../src/components/ShareModal';
import {
  registerForPushNotificationsAsync,
  handleNotificationResponse,
} from '../src/lib/push/notifications';
import { RealtimeBridge } from '../src/features/messages/components/RealtimeBridge';

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync().catch(() => {});

    const subResponse = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    return () => {
      subResponse.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <RealtimeBridge />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#F8FAFC' },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="business/[slug]" options={{ headerShown: false }} />
            <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="service/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="messages/[conversationId]" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="saved" options={{ headerShown: false }} />
            <Stack.Screen name="requirements" options={{ headerShown: false }} />
            <Stack.Screen name="hub" options={{ headerShown: false }} />
            <Stack.Screen name="wallet" options={{ headerShown: false }} />
            <Stack.Screen name="referral" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
          </Stack>

          {/* Global Modals & Overlays */}
          <DrawerMenu />
          <CreateModal />
          <EnquiryModal />
          <ShareModal />
          <Toast />
        </AppProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
