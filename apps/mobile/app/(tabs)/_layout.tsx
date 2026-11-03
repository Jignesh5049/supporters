import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Header } from '../../src/components/Header';
import { BottomTabBar } from '../../src/components/BottomTabBar';

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Header />
      <Tabs
        tabBar={() => <BottomTabBar />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
        <Tabs.Screen name="create" options={{ title: 'Create' }} />
        <Tabs.Screen name="messages/index" options={{ title: 'Messages' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
