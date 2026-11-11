import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'register' | 'reset';

const C = {
  bg: '#090B16',
  surface: '#111629',
  border: '#252D47',
  purple: '#9270FF',
  white: '#F7F7FC',
  muted: '#929BB5',
};

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isRegister = mode === 'register';
  const isReset = mode === 'reset';

  async function handleSubmit() {
    setMessage('');

    if (isRegister && username.trim().length < 3) {
      Alert.alert('Invalid username', 'Username must contain at least 3 characters.');
      return;
    }

    if (isRegister && !phone.trim()) {
      Alert.alert('Phone required', 'Please enter your phone number.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }

    if (!isReset && password.length < 8) {
      Alert.alert('Invalid password', 'Password must contain at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
              display_name: username.trim(),
              phone_number: phone.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage('Account created successfully. Welcome to Brainy US!');
        } else {
          setMessage('Registration submitted. Check your email to confirm your account before signing in.');
        }
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

        if (error) throw error;

        setMessage('If an account exists for this email, a password reset link will be sent.');
      }
    } catch (error) {
      Alert.alert(
        'Authentication failed',
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMode(next: AuthMode) {
    setMode(next);
    setMessage('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#211B43', '#14182D', '#101426']}
          style={styles.card}
        >
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>B</Text>
          </View>

          <Text style={styles.brand}>
            BRAINY <Text style={styles.brandAccent}>US</Text>
          </Text>
          <Text style={styles.tagline}>SMART MINDS. BIG BATTLES.</Text>

          <Text style={styles.heading}>
            {isRegister ? 'CREATE YOUR ACCOUNT' : isReset ? 'RESET PASSWORD' : 'WELCOME BACK'}
          </Text>

          <Text style={styles.description}>
            {isRegister
              ? 'Join the competition. Your next victory starts here.'
              : isReset
                ? 'Enter your email to receive a password reset link.'
                : 'Sign in and get back into the arena.'}
          </Text>

          {isRegister && (
            <>
              <Text style={styles.label}>USERNAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor={C.muted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                maxLength={24}
              />

              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor={C.muted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </>
          )}

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={C.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {!isReset && (
            <>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={C.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          )}

          {!!message && <Text style={styles.message}>{message}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.submit,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.submitText}>
                {isRegister ? 'CREATE ACCOUNT' : isReset ? 'SEND RESET LINK' : 'SIGN IN'}
              </Text>
            )}
          </Pressable>

          {mode === 'login' && (
            <Pressable onPress={() => changeMode('reset')} style={styles.textButton}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isReset
                ? 'Remember your password?'
                : isRegister
                  ? 'Already have an account?'
                  : "Don't have an account?"}
            </Text>
            <Pressable
              onPress={() => changeMode(isReset ? 'login' : isRegister ? 'login' : 'register')}
            >
              <Text style={styles.link}>
                {isReset ? ' Sign in' : isRegister ? ' Sign in' : ' Create account'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>© 2026 BRAINY US</Text>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  card: {
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#39305E',
    padding: 25,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  brandLetter: { color: C.white, fontSize: 29, fontWeight: '900' },
  brand: { color: C.white, fontSize: 23, fontWeight: '900', textAlign: 'center' },
  brandAccent: { color: C.purple },
  tagline: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginTop: 6 },
  heading: { color: C.white, fontSize: 21, fontWeight: '900', marginTop: 36 },
  description: { color: C.muted, fontSize: 12, lineHeight: 19, marginTop: 9, marginBottom: 25 },
  label: { color: '#C7CBE0', fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 8, marginTop: 15 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    color: C.white,
    fontSize: 13,
  },
  submit: {
    backgroundColor: C.purple,
    borderRadius: 13,
    padding: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    minHeight: 53,
  },
  submitText: { color: C.white, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  message: { color: '#8FE1C0', fontSize: 11, lineHeight: 18, marginTop: 16 },
  textButton: { alignSelf: 'flex-end', marginTop: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 23 },
  switchText: { color: C.muted, fontSize: 11 },
  link: { color: '#BDAAFF', fontSize: 11, fontWeight: '800' },
  footer: { color: '#626B84', fontSize: 9, textAlign: 'center', marginTop: 30, letterSpacing: 1 },
});
