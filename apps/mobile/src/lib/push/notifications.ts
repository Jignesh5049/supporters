import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers the device for Expo Push Notifications and configures Android channels.
 * Returns the Expo push token if successful, or null if denied / simulator.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E3192',
    });

    // Android channels per docs/specs/mobile-spec.md line 131
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('enquiries', {
      name: 'Enquiries',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('activity', {
      name: 'Activity',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('account', {
      name: 'Account',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      'c22125f1-cdea-411e-894e-49a50e37257a';

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    token = pushTokenData.data;
  } catch (error) {
    // Graceful fallback on simulators or network restrictions
    console.warn('Failed to obtain push token:', error);
  }

  return token;
}

/**
 * Handles incoming push notification taps and routes the user to the target screen.
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as {
    url?: string;
    type?: string;
    id?: string;
    conversationId?: string;
    requirementId?: string;
    businessSlug?: string;
  };

  if (!data) return;

  if (data.url) {
    // Direct path routing
    try {
      router.push(data.url as any);
      return;
    } catch {
      // Fallback to pattern matching
    }
  }

  if (data.type === 'message' && (data.conversationId || data.id)) {
    router.push(`/messages/${data.conversationId || data.id}` as any);
  } else if (data.type === 'enquiry') {
    router.push('/hub/enquiries' as any);
  } else if (data.type === 'requirement' && (data.requirementId || data.id)) {
    router.push(`/requirements/${data.requirementId || data.id}` as any);
  } else if (data.type === 'business' && data.businessSlug) {
    router.push(`/business/${data.businessSlug}` as any);
  } else if (data.type === 'wallet' || data.type === 'withdrawal') {
    router.push('/wallet/history' as any);
  } else {
    router.push('/notifications' as any);
  }
}
