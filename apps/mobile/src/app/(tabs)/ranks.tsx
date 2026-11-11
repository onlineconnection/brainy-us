import { Redirect } from 'expo-router';
import LeaderboardScreen from '../../screens/LeaderboardScreen';
import { useAuth } from '../../providers/AuthProvider';

export default function RanksRoute() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <LeaderboardScreen />;
}
