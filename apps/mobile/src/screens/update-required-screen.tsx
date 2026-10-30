import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { Linking, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ANDROID_PACKAGE = 'com.supporters.app';

/** Shown when the API answers 426: this app version is no longer supported. */
export function UpdateRequiredScreen() {
  const handleUpdate = () => {
    // TODO(mobile): add the App Store link once the iOS app id exists.
    Linking.openURL(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`);
  };

  return (
    // SafeAreaView is not a NativeWind-styled component, so the classes go on the inner View.
    <SafeAreaView style={{ flex: 1 }}>
      <View className="bg-background w-full max-w-md flex-1 justify-center gap-4 self-center px-6">
        <Text variant="h3" className="text-center">
          Update Supporters
        </Text>
        <Text variant="muted" className="text-center">
          This version of the app is no longer supported. Update to the latest version to keep using
          Supporters.
        </Text>
        {Platform.OS === 'android' && (
          <Button size="lg" onPress={handleUpdate} accessibilityHint="Opens the Play Store">
            <Text>Update the app</Text>
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}
