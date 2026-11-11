import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../providers/AuthProvider';

export default function IndexRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#9270FF" />
      </View>
    );
  }

  return session
    ? <Redirect href="/(tabs)" />
    : <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#090B16',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
