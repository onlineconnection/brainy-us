import { Redirect } from 'expo-router';
import BattlesScreen from '../../screens/BattlesScreen';
import { useAuth } from '../../providers/AuthProvider';

export default function BattlesRoute() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <BattlesScreen userId={session.user.id} />;
}
