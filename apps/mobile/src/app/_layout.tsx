import '../../global.css';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';
import { AppShell } from '../features/navigation/app-shell';
import { queryClient } from '../lib/query-client';

// Deep links open on top of the tabs, so back always has somewhere to go.
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
        {/* Dialogs and other overlays from @supporters/ui-native render here. */}
        <PortalHost />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
