import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { PremiumStatusView } from '../features/premium/PremiumStatusView';
import { spacing } from '../styles/theme';

/** The prototype's subscription tab: Premium status only. Purchases happen on the web. */
export function SubscriptionScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PremiumStatusView />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: spacing.md, paddingBottom: 60 },
});
