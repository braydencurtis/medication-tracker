import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Clipboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { theme } from '../../constants/theme';
import type { FamilyMember } from '../../types';

export default function SettingsScreen() {
  const { user, displayName, inviteCode, familyId, signOut } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    if (!familyId) return;
    supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at')
      .then(({ data }) => {
        if (data) setMembers(data);
      });
  }, [familyId]);

  function copyInviteCode() {
    if (!inviteCode) return;
    Clipboard.setString(inviteCode);
    Alert.alert('Copied!', `Invite code ${inviteCode} copied to clipboard.`);
  }

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your account</Text>
          <View style={styles.card}>
            <Row label="Name" value={displayName ?? '—'} />
            <View style={styles.divider} />
            <Row label="Email" value={user?.email ?? '—'} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Family members · {members.length}
          </Text>
          <View style={styles.card}>
            {members.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>No members yet</Text>
              </View>
            ) : (
              members.map((m, i) => (
                <React.Fragment key={m.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {m.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.memberName}>{m.display_name}</Text>
                    {m.user_id === user?.id && (
                      <Text style={styles.youBadge}>You</Text>
                    )}
                  </View>
                </React.Fragment>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite code</Text>
          <TouchableOpacity
            style={styles.inviteCard}
            onPress={copyInviteCode}
            activeOpacity={0.75}
          >
            <Text style={styles.inviteCode}>{inviteCode ?? '—'}</Text>
            <View style={styles.copyRow}>
              <Ionicons name="copy-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.copyText}>Tap to copy</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.inviteHint}>
            Share this code so others can join and see the same pets and medications.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={confirmSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value !== undefined && (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 48 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    gap: 10,
  },
  rowLabel: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  youBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  inviteCard: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  inviteCode: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 6,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  inviteHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
  },
  signOutButton: {
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.danger,
  },
});
