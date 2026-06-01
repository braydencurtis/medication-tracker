import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPetPhotoUrl } from '../lib/storage';
import type { TodayDose, Pet } from '../types';

interface Props {
  dose: TodayDose;
  pet: Pet | null;
  onGive: () => Promise<void>;
  onUndo: () => Promise<void>;
}

// Card palette changes with state
const PALETTE = {
  default: { bg: '#5B21B6', text: '#fff', sub: 'rgba(255,255,255,0.6)', chip: 'rgba(255,255,255,0.15)' },
  overdue:  { bg: '#9F1239', text: '#fff', sub: 'rgba(255,255,255,0.6)', chip: 'rgba(255,255,255,0.15)' },
  given:    { bg: '#064E3B', text: '#fff', sub: 'rgba(255,255,255,0.6)', chip: 'rgba(255,255,255,0.15)' },
};
const BUTTON_COLOR  = '#FBBF24';   // amber — same regardless of state
const BUTTON_TEXT   = '#1C1917';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function formatReminderTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function isOverdue(t: string | undefined) {
  if (!t) return false;
  const [h, m] = t.split(':').map(Number);
  const now = new Date(), r = new Date();
  r.setHours(h, m, 0, 0);
  return now > r;
}

const CIRCLE_D = 200;
const CIRCLE_R = CIRCLE_D / 2;

export function MedicationDoseCard({ dose, pet, onGive, onUndo }: Props) {
  const [saving, setSaving] = React.useState(false);
  const { medication, doseNumber, log } = dose;
  const reminderTime = medication.reminder_times[doseNumber - 1];
  const isGiven = log?.given_at != null;
  const overdue  = !isGiven && isOverdue(reminderTime);

  const palette  = isGiven ? PALETTE.given : overdue ? PALETTE.overdue : PALETTE.default;
  const petName  = pet?.name ?? medication.pet_name ?? 'Unknown';
  const photoUrl = getPetPhotoUrl(pet?.profile_photo_path);
  const initial  = petName.charAt(0).toUpperCase();

  async function handleGive()  { setSaving(true); await onGive();  setSaving(false); }
  async function handleUndo()  { setSaving(true); await onUndo();  setSaving(false); }

  return (
    // Outer wrapper reserves space above the card for the circle overflow
    <View style={styles.outer}>

      {/* ── Main card ── */}
      <View style={[styles.card, { backgroundColor: palette.bg }]}>

        {/* Circle photo — absolutely positioned to break out of the card top */}
        <View style={styles.circleAnchor}>
          <View style={styles.circleRing}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.circlePhoto} resizeMode="cover" />
            ) : (
              <View style={[styles.circlePhoto, styles.circleFallback]}>
                <Text style={styles.circleLetter}>{initial}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Status sticker — top-right */}
        {(isGiven || overdue) && (
          <View style={[
            styles.sticker,
            isGiven ? styles.stickerGiven : styles.stickerOverdue,
          ]}>
            <Ionicons
              name={isGiven ? 'checkmark' : 'time'}
              size={11}
              color={isGiven ? '#065F46' : '#9F1239'}
            />
            <Text style={[styles.stickerText, { color: isGiven ? '#065F46' : '#9F1239' }]}>
              {isGiven ? 'Given' : 'Overdue'}
            </Text>
          </View>
        )}

        {/* Pet name — large, dominates the card */}
        <Text style={[styles.petName, { color: palette.text }]}>{petName}</Text>

        {/* ── Med info row ── */}
        <View style={styles.medRow}>
          <Text style={[styles.medName, { color: palette.text }]} numberOfLines={1}>
            {medication.name}
          </Text>
          {medication.dosage ? (
            <View style={[styles.chip, { backgroundColor: palette.chip }]}>
              <Text style={[styles.chipText, { color: palette.text }]}>{medication.dosage}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Meta chips ── */}
        <View style={styles.metaRow}>
          {medication.frequency > 1 && (
            <View style={[styles.chip, { backgroundColor: palette.chip }]}>
              <Text style={[styles.chipText, { color: palette.sub }]}>
                Dose {doseNumber}/{medication.frequency}
              </Text>
            </View>
          )}
          {reminderTime && (
            <View style={[styles.chip, { backgroundColor: palette.chip }]}>
              <Ionicons name="time-outline" size={11} color={palette.sub} />
              <Text style={[styles.chipText, { color: palette.sub }]}>
                {formatReminderTime(reminderTime)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Action ── */}
        {isGiven ? (
          <View style={styles.givenRow}>
            <Ionicons name="checkmark-circle" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={styles.givenText}>
              {log.given_by} · {formatTime(log.given_at!)}
            </Text>
            <TouchableOpacity onPress={handleUndo} disabled={saving}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.undoText}>Undo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.giveBtn, saving && { opacity: 0.7 }]}
            onPress={handleGive}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={BUTTON_TEXT} size="small" />
            ) : (
              <>
                <Ionicons name="medical" size={17} color={BUTTON_TEXT} />
                <Text style={styles.giveBtnText}>Give Dose</Text>
              </>
            )}
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Wrapper — paddingTop reserves room for the circle to overflow upward
  outer: {
    paddingTop: CIRCLE_R,
    marginBottom: 20,
  },

  card: {
    borderRadius: 28,
    // paddingTop makes room for the circle that overflows from above
    paddingTop: CIRCLE_R + 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },

  // Circle breaks out of the card top
  circleAnchor: {
    position: 'absolute',
    top: -CIRCLE_R,
    left: 24,
    zIndex: 10,
  },
  circleRing: {
    width: CIRCLE_D + 8,
    height: CIRCLE_D + 8,
    borderRadius: (CIRCLE_D + 8) / 2,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  circlePhoto: {
    width: CIRCLE_D,
    height: CIRCLE_D,
  },
  circleFallback: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLetter: {
    fontSize: 52,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
  },

  // Status sticker (top-right corner of card)
  sticker: {
    position: 'absolute',
    top: 14,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  stickerGiven:   { backgroundColor: '#D1FAE5' },
  stickerOverdue: { backgroundColor: '#FFE4E6' },
  stickerText: { fontSize: 12, fontWeight: '700' },

  // Pet name — headline of the card
  petName: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },

  // Medication row
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },

  // Chips
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: -4,
  },

  // Given confirmation row
  givenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  givenText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  undoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  },

  // Give Dose button — bright amber, stands out on dark card
  giveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BUTTON_COLOR,
    borderRadius: 999,
    paddingVertical: 15,
    marginTop: 4,
  },
  giveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: BUTTON_TEXT,
    letterSpacing: 0.2,
  },
});
