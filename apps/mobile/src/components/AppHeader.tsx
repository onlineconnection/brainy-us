import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { UserRound } from 'lucide-react-native';

const C = {
  surface2: '#171E34',
  border: '#252D47',
  purple: '#9270FF',
  white: '#F7F7FC',
  muted: '#929BB5',
};

export default function AppHeader() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>
          BRAINY <Text style={styles.brandAccent}>US</Text>
        </Text>
        <Text style={styles.brandSub}>THINK. COMPETE. DOMINATE.</Text>
      </View>

      <Pressable
        onPress={() => router.navigate('/(tabs)/profile')}
        style={styles.avatar}
      >
        <UserRound color={C.white} size={21} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 76,
    paddingHorizontal: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1B2034',
    backgroundColor: '#090B16',
  },
  brand: {
    color: C.white,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  brandAccent: {
    color: C.purple,
  },
  brandSub: {
    color: C.muted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 2.1,
    marginTop: 3,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
