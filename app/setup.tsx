import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { theme } from '../constants/theme';

export default function SetupScreen() {
  const [name, setName] = useState('');
  const { saveName } = useUser();

  async function handleStart() {
    if (!name.trim()) return;
    await saveName(name);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>🐱</Text>
          <Text style={styles.title}>Welcome to{'\n'}Penny's Meds</Text>
          <Text style={styles.subtitle}>
            Track Penny's diabetes medication and never miss a dose.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>What's your name?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textLight}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
            <TouchableOpacity
              style={[
                styles.button,
                !name.trim() && styles.buttonDisabled,
              ]}
              onPress={handleStart}
              disabled={!name.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Get started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  inner: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
