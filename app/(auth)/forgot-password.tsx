import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { theme } from '../../constants/theme';

type Step = 'email' | 'code';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>('email');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setStep('code');
  }

  async function verifyCode() {
    if (!code.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Invalid code', "That code didn't work — check your email and try again.");
      return;
    }
    // OTP verified — user is now signed in. Navigate to the password-reset
    // screen (outside the auth group so the routing guard won't redirect us).
    router.replace('/reset-password');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.emoji}>{step === 'email' ? '🔑' : '📬'}</Text>

          {step === 'email' ? (
            <>
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a 6-digit code to sign in and set a new password.
              </Text>
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                  returnKeyType="send"
                  onSubmitEditing={sendCode}
                />
                <TouchableOpacity
                  style={[styles.button, (loading || !email.trim()) && styles.buttonDisabled]}
                  onPress={sendCode}
                  disabled={loading || !email.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Sending…' : 'Send code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{' '}
                <Text style={styles.emailHighlight}>{email}</Text>.
              </Text>
              <View style={styles.form}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={setCode}
                  placeholder="000000"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="number-pad"
                  maxLength={8}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={verifyCode}
                />
                <TouchableOpacity
                  style={[styles.button, (loading || code.length < 6) && styles.buttonDisabled]}
                  onPress={verifyCode}
                  disabled={loading || code.length < 1}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Verifying…' : 'Verify code'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resend}
                  onPress={() => { setCode(''); sendCode(); }}
                >
                  <Text style={styles.resendText}>Resend code</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  inner: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  back: { position: 'absolute', top: theme.spacing.md, left: 0 },
  backText: { fontSize: 15, color: theme.colors.primary, fontWeight: '600' },

  emoji: { fontSize: 56, textAlign: 'center', marginBottom: theme.spacing.md },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  emailHighlight: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },

  form: { gap: 12 },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  codeInput: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resend: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  resendText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
