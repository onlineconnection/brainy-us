import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import {
  House,
  Swords,
  Trophy,
  UserRound,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AppHeader from '../../components/AppHeader';
import { useAuth } from '../../providers/AuthProvider';

const C = {
  bg: '#090B16',
  surface: '#0D1020',
  purple: '#9270FF',
  muted: '#929BB5',
  border: '#20263B',
};

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={C.purple} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.purple,
          tabBarInactiveTintColor: C.muted,
          tabBarStyle: {
            height: 72 + insets.bottom,
            backgroundColor: C.surface,
            borderTopColor: C.border,
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: 8 + insets.bottom,
          },
          tabBarLabelStyle: {
            fontSize: 8,
            fontWeight: '800',
            letterSpacing: 0.8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'HOME',
            tabBarIcon: ({ color, size }) => (
              <House color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="battles"
          options={{
            title: 'BATTLES',
            tabBarIcon: ({ color, size }) => (
              <Swords color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="ranks"
          options={{
            title: 'RANKS',
            tabBarIcon: ({ color, size }) => (
              <Trophy color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'PROFILE',
            tabBarIcon: ({ color, size }) => (
              <UserRound color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="online"
          options={{
            title: 'ONLINE',
            tabBarIcon: ({ color, size }) => (
              <Swords color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loading: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
