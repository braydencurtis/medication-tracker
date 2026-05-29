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
  const { user, displayName, inviteCode, familyId, isOwner, signOut, refreshFamily } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [refreshingCode, setRefreshingCode] = useState(false);

  const approved = members.filter((m) => m.status === 'approved');
  const pending = members.filter((m) => m.status === 'pending');

  useEffect(() => {
    if (!familyId) return;
    fetchMembers();

    // Owner gets real-time updates when someone requests to join
    const channel = supabase
      .channel(`family-members-${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family_members' },
        () => fetchMembers(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [familyId]);

  async function fetchMembers() {
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at');
    if (data) setMembers(data);
  }

  async function handleApprove(member: FamilyMember) {
    const { error } = await supabase.rpc('approve_member', {
      p_member_id: member.id,
    });
    if (error) Alert.alert('Error', error.message);
    else fetchMembers();
  }

  function confirmReject(member: FamilyMember) {
    Alert.alert(
      `Remove ${member.display_name}?`,
      'They will no longer have access to your family.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('reject_member', {
              p_member_id: member.id,
            });
            if (error) Alert.alert('Error', error.message);
            else fetchMembers();
          },
        },
      ],
    );
  }

  function confirmRefreshCode() {
    Alert.alert(
      'Regenerate invite code?',
      'The old code will stop working immediately. Anyone mid-join with the old code will need the new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setRefreshingCode(true);
            const { error } = await supabase.rpc('refresh_invite_code');
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              await refreshFamily();
            }
            setRefreshingCode(false);
          },
        },
      ],
    );
  }

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

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your account</Text>
          <View style={styles.card}>
            <InfoRow label="Name" value={displayName ?? '—'} />
            <View style={styles.divider} />
            <InfoRow label="Email" value={user?.email ?? '—'} />
          </View>
        </View>

        {/* Pending requests — owner only */}
        {isOwner && pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending requests · {pending.length}
            </Text>
            <View style={styles.card}>
              {pending.map((m, i) => (
                <React.Fragment key={m.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.pendingRow}>
                    <MemberAvatar name={m.display_name} />
                    <Text style={styles.memberName}>{m.display_name}</Text>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => confirmReject(m)}
                    >
                      <Ionicons name="close" size={16} color={theme.colors.danger} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(m)}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Family members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Family members · {approved.length}
          </Text>
          <View style={styles.card}>
            {approved.length === 0 ? (
              <View style={styles.memberRow}>
                <Text style={styles.emptyText}>No members yet</Text>
              </View>
            ) : (
              approved.map((m, i) => (
                <React.Fragment key={m.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.memberRow}>
                    <MemberAvatar name={m.display_name} />
                    <Text style={styles.memberName}>{m.display_name}</Text>
                    <View style={styles.badges}>
                      {m.user_id === user?.id && (
                        <Text style={styles.youBadge}>You</Text>
                      )}
                      {isOwner && m.user_id === user?.id && (
                        <Text style={styles.ownerBadge}>Owner</Text>
                      )}
                    </View>
                    {isOwner && m.user_id !== user?.id && (
                      <TouchableOpacity
                        onPress={() => confirmReject(m)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="person-remove-outline"
                          size={16}
                          color={theme.colors.textLight}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </React.Fragment>
              ))
            )}
          </View>
        </View>

        {/* Invite code */}
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
            Share this code so others can request to join your family.
          </Text>
          {isOwner && (
            <TouchableOpacity
              style={styles.refreshCodeButton}
              onPress={confirmRefreshCode}
              disabled={refreshingCode}
              activeOpacity={0.7}
            >
              <Ionicons
                name="refresh-outline"
                size={14}
                color={theme.colors.danger}
              />
              <Text style={styles.refreshCodeText}>
                {refreshingCode ? 'Regenerating…' : 'Regenerate code'}
              </Text>
            </TouchableOpacity>
          )}
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

function MemberAvatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
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
  divider: { height: 1, backgroundColor: theme.colors.border },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 15, color: theme.colors.textSecondary, fontWeight: '500' },
  infoValue: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    gap: 10,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  memberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  emptyText: { fontSize: 14, color: theme.colors.textSecondary },
  badges: { flexDirection: 'row', gap: 6 },
  youBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ownerBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
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
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: 13, color: theme.colors.primary, fontWeight: '500' },
  inviteHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
  },
  refreshCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  refreshCodeText: {
    fontSize: 13,
    color: theme.colors.danger,
    fontWeight: '500',
  },
  signOutButton: {
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: theme.colors.danger },
});
