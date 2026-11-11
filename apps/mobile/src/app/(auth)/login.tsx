import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AuthScreen from '../../screens/AuthScreen';
import { useAuth } from '../../providers/AuthProvider';

export default function LoginRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#9270FF" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <AuthScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#090B16',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
