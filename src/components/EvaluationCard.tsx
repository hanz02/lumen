/** Ch 4 evaluation capture card: optional reference-instrument inputs (tape
 *  measurements for all four AR-fallible dimensions, 5 repeated UT383
 *  readings) saved alongside the app's own measurements as one CSV row, plus
 *  export (share sheet) / clear of the accumulated log.
 *
 *  Four separate tape fields (distance / width / height / sill) rather than
 *  one generic field: the AR side independently measures all four, so one
 *  saved row can unambiguously validate every dimension at once instead of
 *  needing four separate sessions. Five lux fields mirror the original field-
 *  collection protocol (tools/analyze_spot_observations.py reads 5 phone + 5
 *  meter columns per observation) — a single instrument glance is noisier
 *  than a median of five; the phone side doesn't need this because the
 *  10 s plateau capture already does the equivalent robustness work
 *  automatically. */

import React, { useMemo, useState } from 'react';
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
  tapeDistanceCm: string;
  tapeWidthCm: string;
  tapeHeightCm: string;
  tapeSillCm: string;
  meterLux1: string;
  meterLux2: string;
  meterLux3: string;
  meterLux4: string;
  meterLux5: string;
  /** Median of whichever of the 5 fields were filled in; null if none were. */
  meterLuxMedian: number | null;
  /** User-tapped sky condition at capture (context only, never an engine input). */
  skyCondition: string;
  note: string;
}

/** Median of whatever numeric values are present — ignores blank/invalid
 *  entries so a partial set of readings (e.g. only 3 of 5) still works. */
function median(values: string[]): number | null {
  const nums = values
    .map((v) => parseFloat(v.trim()))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Sky-condition options for the capture context (code → label). */
const SKY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'sunny', label: 'Sunny' },
  { code: 'partly_cloudy', label: 'Partly cloudy' },
  { code: 'overcast', label: 'Overcast' },
  { code: 'indoor_lit', label: 'Indoor-lit' },
];

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
  const [tapeDistanceCm, setTapeDistanceCm] = useState('');
  const [tapeWidthCm, setTapeWidthCm] = useState('');
  const [tapeHeightCm, setTapeHeightCm] = useState('');
  const [tapeSillCm, setTapeSillCm] = useState('');
  const [meterLux1, setMeterLux1] = useState('');
  const [meterLux2, setMeterLux2] = useState('');
  const [meterLux3, setMeterLux3] = useState('');
  const [meterLux4, setMeterLux4] = useState('');
  const [meterLux5, setMeterLux5] = useState('');
  const [skyCondition, setSkyCondition] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showClear, setShowClear] = useState(false);

  const meterReadings = [meterLux1, meterLux2, meterLux3, meterLux4, meterLux5];
  const meterLuxMedian = useMemo(() => median(meterReadings), [meterReadings]);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await onSave({
        tapeDistanceCm: tapeDistanceCm.trim(),
        tapeWidthCm: tapeWidthCm.trim(),
        tapeHeightCm: tapeHeightCm.trim(),
        tapeSillCm: tapeSillCm.trim(),
        meterLux1: meterLux1.trim(),
        meterLux2: meterLux2.trim(),
        meterLux3: meterLux3.trim(),
        meterLux4: meterLux4.trim(),
        meterLux5: meterLux5.trim(),
        meterLuxMedian,
        skyCondition,
        note: note.trim(),
      });
      setTapeDistanceCm('');
      setTapeWidthCm('');
      setTapeHeightCm('');
      setTapeSillCm('');
      setMeterLux1('');
      setMeterLux2('');
      setMeterLux3('');
      setMeterLux4('');
      setMeterLux5('');
      setSkyCondition('');
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
        estimate, top recommendations) as a CSV row. Add tape measurements for
        any of the four AR dimensions, and UT383 readings, for the reference
        comparisons — all optional.
      </Text>

      <Text style={styles.sectionLabel}>TAPE MEASUREMENTS (CM)</Text>
      <View style={styles.tapeGrid}>
        <View style={styles.tapeCell}>
          <Text style={styles.inputLabel}>Plant distance</Text>
          <TextInput
            style={styles.input}
            value={tapeDistanceCm}
            onChangeText={setTapeDistanceCm}
            keyboardType="numeric"
            placeholder="optional"
            placeholderTextColor={palette.textFaint}
          />
        </View>
        <View style={styles.tapeCell}>
          <Text style={styles.inputLabel}>Window width</Text>
          <TextInput
            style={styles.input}
            value={tapeWidthCm}
            onChangeText={setTapeWidthCm}
            keyboardType="numeric"
            placeholder="optional"
            placeholderTextColor={palette.textFaint}
          />
        </View>
        <View style={styles.tapeCell}>
          <Text style={styles.inputLabel}>Window height</Text>
          <TextInput
            style={styles.input}
            value={tapeHeightCm}
            onChangeText={setTapeHeightCm}
            keyboardType="numeric"
            placeholder="optional"
            placeholderTextColor={palette.textFaint}
          />
        </View>
        <View style={styles.tapeCell}>
          <Text style={styles.inputLabel}>Sill height</Text>
          <TextInput
            style={styles.input}
            value={tapeSillCm}
            onChangeText={setTapeSillCm}
            keyboardType="numeric"
            placeholder="optional"
            placeholderTextColor={palette.textFaint}
          />
        </View>
      </View>

      <View style={styles.meterHeaderRow}>
        <Text style={styles.sectionLabel}>UT383 LUX — 5 READINGS</Text>
        {meterLuxMedian != null && (
          <Text style={styles.medianText}>median {Math.round(meterLuxMedian)} lx</Text>
        )}
      </View>
      <View style={styles.meterRow}>
        <TextInput
          style={styles.meterInput}
          value={meterLux1}
          onChangeText={setMeterLux1}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor={palette.textFaint}
        />
        <TextInput
          style={styles.meterInput}
          value={meterLux2}
          onChangeText={setMeterLux2}
          keyboardType="numeric"
          placeholder="2"
          placeholderTextColor={palette.textFaint}
        />
        <TextInput
          style={styles.meterInput}
          value={meterLux3}
          onChangeText={setMeterLux3}
          keyboardType="numeric"
          placeholder="3"
          placeholderTextColor={palette.textFaint}
        />
        <TextInput
          style={styles.meterInput}
          value={meterLux4}
          onChangeText={setMeterLux4}
          keyboardType="numeric"
          placeholder="4"
          placeholderTextColor={palette.textFaint}
        />
        <TextInput
          style={styles.meterInput}
          value={meterLux5}
          onChangeText={setMeterLux5}
          keyboardType="numeric"
          placeholder="5"
          placeholderTextColor={palette.textFaint}
        />
      </View>

      <Text style={styles.inputLabel}>Sky condition (optional)</Text>
      <View style={styles.skyRow}>
        {SKY_OPTIONS.map((o) => {
          const on = skyCondition === o.code;
          return (
            <TouchableOpacity
              key={o.code}
              activeOpacity={0.82}
              onPress={() => setSkyCondition(on ? '' : o.code)}
              style={[styles.skyChip, on && styles.skyChipOn]}>
              <Text style={[styles.skyChipText, on && styles.skyChipTextOn]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  sectionLabel: {
    color: palette.textFaint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tapeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  tapeCell: {
    flexBasis: '46%',
    flexGrow: 1,
  },
  meterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 14,
    marginBottom: 8,
  },
  medianText: {
    color: palette.mint,
    fontSize: 12,
    fontWeight: '800',
  },
  meterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  meterInput: {
    ...inputBase,
    flex: 1,
    paddingHorizontal: 6,
    textAlign: 'center',
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
  skyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  skyChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: palette.inset,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  skyChipOn: {
    backgroundColor: palette.raised,
    borderColor: palette.leaf,
  },
  skyChipText: {
    color: palette.textDim,
    fontSize: 13,
    fontWeight: '700',
  },
  skyChipTextOn: {
    color: palette.mint,
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
