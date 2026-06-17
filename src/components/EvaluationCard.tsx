/** Ch 4 evaluation capture card: optional reference-instrument inputs (tape
 *  distance, UT383 lux) saved alongside the app's own measurements as one CSV
 *  row, plus export (share sheet) / clear of the accumulated log. */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { buttonBase, cardBase, inputBase, palette } from '../theme/theme';
import CardHeader from '../ui/CardHeader';
import GradientButton from '../ui/GradientButton';
import ConfirmModal from '../ui/ConfirmModal';

export interface EvalRefs {
  tapeCm: string;
  meterLux: string;
  note: string;
}

type Props = {
  /** A recommendation result exists to snapshot. */
  canSave: boolean;
  /** Data rows currently in the log (header excluded). */
  rowCount: number;
  onSave: (refs: EvalRefs) => Promise<void>;
  onExport: () => Promise<void>;
  onClear: () => Promise<void>;
};

export default function EvaluationCard({
  canSave,
  rowCount,
  onSave,
  onExport,
  onClear,
}: Props) {
  const [tapeCm, setTapeCm] = useState('');
  const [meterLux, setMeterLux] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showClear, setShowClear] = useState(false);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await onSave({
        tapeCm: tapeCm.trim(),
        meterLux: meterLux.trim(),
        note: note.trim(),
      });
      setTapeCm('');
      setMeterLux('');
      setNote('');
      setStatus('Saved ✓');
    } catch (error: any) {
      setStatus(error?.message ?? 'Could not save the row.');
    } finally {
      setBusy(false);
    }
  };

  const exportLog = async () => {
    setStatus(null);
    try {
      await onExport();
    } catch (error: any) {
      setStatus(error?.message ?? 'Could not export the log.');
    }
  };

  const confirmClear = async () => {
    setShowClear(false);
    try {
      await onClear();
      setStatus('Log cleared.');
    } catch (error: any) {
      setStatus(error?.message ?? 'Could not clear the log.');
    }
  };

  return (
    <View style={styles.card}>
      <CardHeader
        icon="clipboard"
        title="Evaluation log"
        kicker="AR-vs-tape · phone-vs-UT383"
      />

      <Text style={styles.bodyText}>
        Saves this session (lux, AR distance, window size, aspect, sun
        estimate, top recommendations) as a CSV row. Add the tape and UT383
        readings for the reference comparisons.
      </Text>

      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.inputLabel}>Tape distance (cm)</Text>
          <TextInput
            style={styles.input}
            value={tapeCm}
            onChangeText={setTapeCm}
            keyboardType="numeric"
            placeholder="optional"
            placeholderTextColor={palette.textFaint}
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={styles.inputLabel}>UT383 lux</Text>
          <TextInput
            style={styles.input}
            value={meterLux}
            onChangeText={setMeterLux}
            keyboardType="numeric"
            placeholder="optional"
            placeholderTextColor={palette.textFaint}
          />
        </View>
      </View>

      <Text style={styles.inputLabel}>Note</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="room / window / conditions (optional)"
        placeholderTextColor={palette.textFaint}
      />

      <GradientButton
        title={canSave ? 'Save session row' : 'Complete the steps first'}
        icon={canSave ? 'check' : undefined}
        disabled={!canSave || busy}
        onPress={save}
        style={styles.saveButton}
      />

      {status != null && <Text style={styles.statusText}>{status}</Text>}

      <View style={styles.logRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, styles.logButton]}
          activeOpacity={0.82}
          disabled={rowCount === 0}
          onPress={exportLog}>
          <Text style={styles.secondaryButtonText}>Export ({rowCount})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, styles.logButton]}
          activeOpacity={0.82}
          disabled={rowCount === 0}
          onPress={() => setShowClear(true)}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={showClear}
        icon="clipboard"
        destructive
        title="Clear evaluation log?"
        message={`This deletes all ${rowCount} logged row(s) from the phone. Export first if you need them.`}
        confirmLabel="Clear"
        cancelLabel="Cancel"
        onConfirm={confirmClear}
        onCancel={() => setShowClear(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  bodyText: {
    color: palette.textDim,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    color: palette.textDim,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    ...inputBase,
    marginBottom: 14,
  },
  saveButton: { marginTop: 4 },
  statusText: {
    color: palette.amber,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  logRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  logButton: {
    flex: 1,
  },
  secondaryButton: { ...buttonBase.secondary },
  secondaryButtonText: { ...buttonBase.secondaryText },
  clearButtonText: {
    color: palette.coral,
    fontSize: 15,
    fontWeight: '900',
  },
});
