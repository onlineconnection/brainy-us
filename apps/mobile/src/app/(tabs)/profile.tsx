import { Redirect } from 'expo-router';
import ProfileScreen from '../../screens/ProfileScreen';
import { useAuth } from '../../providers/AuthProvider';

export default function ProfileRoute() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <ProfileScreen
      userId={session.user.id}
      email={session.user.email ?? ''}
    />
  );
}
