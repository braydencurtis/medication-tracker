import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../constants/theme';

type Mode = 'choose' | 'create' | 'join';

export default function FamilySetupScreen() {
  const { refreshFamily } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choose');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!displayName.trim()) return;
    setLoading(true);
    const { error } = await supabase.rpc('create_family', {
      p_display_name: displayName.trim(),
    });
    setLoading(false);
    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }
    await refreshFamily();
    router.replace('/(tabs)');
  }

  async function handleJoin() {
    if (!displayName.trim() || !inviteCode.trim()) return;
    setLoading(true);
    const { error } = await supabase.rpc('join_family', {
      p_invite_code: inviteCode.trim().toUpperCase(),
      p_display_name: displayName.trim(),
    });
    if (error) {
      setLoading(false);
      Alert.alert(
        'Could not join',
        error.message.includes('Invalid invite code')
          ? "That invite code wasn't found. Double-check and try again."
          : error.message,
      );
      return;
    }
    await refreshFamily();
    router.replace('/(tabs)');
  }

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🏠</Text>
          <Text style={styles.title}>Set up your family</Text>
          <Text style={styles.subtitle}>
            Create a new family or join one with an invite code.
          </Text>
          <View style={styles.options}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setMode('create')}
              activeOpacity={0.8}
            >
              <Text style={styles.optionEmoji}>✨</Text>
              <Text style={styles.optionTitle}>Create a family</Text>
              <Text style={styles.optionDesc}>
                Start fresh. You'll get an invite code to share.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setMode('join')}
              activeOpacity={0.8}
            >
              <Text style={styles.optionEmoji}>🔗</Text>
              <Text style={styles.optionTitle}>Join a family</Text>
              <Text style={styles.optionDesc}>
                Enter a code from someone already using the app.
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setMode('choose')}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {mode === 'create' ? 'Create a family' : 'Join a family'}
          </Text>

          <View style={styles.form}>
            <View>
              <Text style={styles.fieldLabel}>Your name in the app</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Brayden"
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="words"
              />
            </View>

            {mode === 'join' && (
              <View>
                <Text style={styles.fieldLabel}>Invite code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={inviteCode}
                  onChangeText={(v) => setInviteCode(v.toUpperCase())}
                  placeholder="ABC123"
                  placeholderTextColor={theme.colors.textLight}
                  autoCapitalize="characters"
                  maxLength={6}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={mode === 'create' ? handleCreate : handleJoin}
              disabled={
                loading ||
                !displayName.trim() ||
                (mode === 'join' && inviteCode.trim().length < 6)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading
                  ? mode === 'create'
                    ? 'Creating…'
                    : 'Joining…'
                  : mode === 'create'
                    ? 'Create family'
                    : 'Join family'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  inner: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
  },
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
  options: { gap: 12 },
  optionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 4,
  },
  optionEmoji: { fontSize: 28, marginBottom: 4 },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  optionDesc: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
  backButton: { marginBottom: theme.spacing.lg },
  backText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  form: { gap: theme.spacing.md },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
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
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
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
});
