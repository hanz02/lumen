/** Required window-size step (evaluation protocol, not an engine input):
 *  width, height, and sill height, each AR-measured (approximate — ARCore on
 *  vertical/reflective surfaces is the least reliable mode) or typed from a
 *  tape measure. Floor-to-ceiling windows have no sill — a toggle records
 *  sill = 0. If the window can't be measured at all, the step is skipped with
 *  a logged reason — that failure record is itself Ch 4 evidence. */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { buttonBase, cardBase, inputBase, palette, radii } from '../theme/theme';
import CardHeader from '../ui/CardHeader';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/Icon';

export type WindowDimKey = 'width' | 'height' | 'sill';

export interface WindowDim {
  cm: number;
  source: 'ar' | 'manual';
  /** AR overallQuality when source === 'ar'. */
  quality: string | null;
}

export interface WindowDims {
  width: WindowDim | null;
  height: WindowDim | null;
  sill: WindowDim | null;
  skipReason: string | null;
}

export const EMPTY_WINDOW_DIMS: WindowDims = {
  width: null,
  height: null,
  sill: null,
  skipReason: null,
};

export function windowStepComplete(dims: WindowDims): boolean {
  return (
    (dims.width != null && dims.height != null && dims.sill != null) ||
    (dims.skipReason != null && dims.skipReason !== '')
  );
}

const DIM_LABELS: Record<WindowDimKey, string> = {
  width: 'Width',
  height: 'Height',
  sill: 'Sill height',
};

/** Leading glyph that makes each measurement instantly scannable. */
const DIM_ICONS: Record<WindowDimKey, IconName> = {
  width: 'widthArrows',
  height: 'heightArrows',
  sill: 'sillArrows',
};

/** The two AR points, in brief — shown until a value is captured. */
const DIM_HINTS: Record<WindowDimKey, string> = {
  width: 'edge to edge',
  height: 'top to bottom',
  sill: 'floor to sill',
};

/** Quick-pick sill heights (cm) for small sills where AR is unreliable. */
const SILL_PRESETS = [5, 10, 15, 20, 25, 30];

type Props = {
  dims: WindowDims;
  /** Launches the AR window-measure session for one dimension. */
  onMeasureAR: (key: WindowDimKey) => void;
  /** Commits a tape-measured value (cm). */
  onManual: (key: WindowDimKey, cm: number) => void;
  /** Floor-to-ceiling toggle: true sets sill = 0, false clears it. */
  onToggleNoSill: (noSill: boolean) => void;
  /** reason string to skip; null to undo the skip. */
  onSkip: (reason: string | null) => void;
  /** AR buttons greyed out — device confirmed not to support ARCore. */
  arUnsupported?: boolean;
};

function DimRow({
  dimKey,
  dim,
  onMeasureAR,
  onManual,
  arUnsupported = false,
}: {
  dimKey: WindowDimKey;
  dim: WindowDim | null;
  onMeasureAR: (key: WindowDimKey) => void;
  onManual: (key: WindowDimKey, cm: number) => void;
  arUnsupported?: boolean;
}) {
  const [text, setText] = useState(dim != null ? String(dim.cm) : '');

  // AR result (or external reset) updates the field
  useEffect(() => {
    setText(dim != null ? String(dim.cm) : '');
  }, [dim]);

  const commitManual = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v) && v > 0) {
      onManual(dimKey, Math.round(v * 10) / 10);
    } else if (dim == null) {
      setText('');
    } else {
      setText(String(dim.cm)); // revert bad edit
    }
  };

  return (
    <View style={styles.dimRow}>
      <View style={styles.dimIconTile}>
        <Icon name={DIM_ICONS[dimKey]} size={20} color={palette.mint} />
      </View>
      <View style={styles.dimLabelBox}>
        <Text style={styles.dimLabel}>{DIM_LABELS[dimKey]}</Text>
        <Text style={styles.dimSource}>
          {dim != null
            ? dim.source === 'ar'
              ? `AR · ${formatQuality(dim.quality)}`
              : 'tape / manual'
            : DIM_HINTS[dimKey]}
        </Text>
      </View>
      <TextInput
        style={styles.dimInput}
        value={text}
        onChangeText={setText}
        onEndEditing={commitManual}
        keyboardType="numeric"
        placeholder="cm"
        placeholderTextColor={palette.textFaint}
      />
      {arUnsupported ? (
        <View style={styles.arButtonDisabled}>
          <Icon name="scan" size={16} color={palette.textFaint} />
          <Text style={styles.arButtonDisabledText}>AR</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.arButton}
          activeOpacity={0.82}
          onPress={() => onMeasureAR(dimKey)}>
          <Icon name="scan" size={16} color={palette.bg} />
          <Text style={styles.arButtonText}>AR</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatQuality(quality: string | null): string {
  if (quality === 'PLANE') return 'high';
  if (quality === 'DEPTH') return 'medium';
  if (quality === 'FEATURE_POINT') return 'low';
  if (quality === 'INSTANT_PLACEMENT') return 'estimated';
  return 'unknown';
}

export default function WindowMeasureCard({
  dims,
  onMeasureAR,
  onManual,
  onToggleNoSill,
  onSkip,
  arUnsupported = false,
}: Props) {
  const [showSkip, setShowSkip] = useState(false);
  const [skipText, setSkipText] = useState('');
  const [showSmallSill, setShowSmallSill] = useState(false);
  const complete = windowStepComplete(dims);
  const skipped = dims.skipReason != null && dims.skipReason !== '';
  const noSill = dims.sill != null && dims.sill.cm === 0;

  return (
    <View style={styles.card}>
      <CardHeader
        icon="window"
        title="Window size"
        kicker="width · height · sill height"
        done={complete}
      />

      {arUnsupported ? (
        <Text style={styles.bodyText}>
          AR is not available on this device — type each measurement from a tape
          below. Recorded for the evaluation dataset.
        </Text>
      ) : (
        <Text style={styles.bodyText}>
          Tap <Text style={styles.bodyEm}>AR</Text> to measure each one, or type
          a tape reading. AR is approximate on glass and frames — a typed value
          is treated as tape-measured. Recorded for the evaluation dataset.
        </Text>
      )}

      {skipped ? (
        <>
          <Text style={styles.skippedText}>
            Skipped — “{dims.skipReason}”. This is recorded in the evaluation
            log.
          </Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.82}
            onPress={() => {
              onSkip(null);
              setShowSkip(false);
              setSkipText('');
            }}>
            <Text style={styles.secondaryButtonText}>Undo skip</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <DimRow
            dimKey="width"
            dim={dims.width}
            onMeasureAR={onMeasureAR}
            onManual={onManual}
            arUnsupported={arUnsupported}
          />
          <DimRow
            dimKey="height"
            dim={dims.height}
            onMeasureAR={onMeasureAR}
            onManual={onManual}
            arUnsupported={arUnsupported}
          />
          {noSill ? (
            <View style={styles.dimRow}>
              <View style={styles.dimIconTile}>
                <Icon name="sillArrows" size={20} color={palette.mint} />
              </View>
              <View style={styles.dimLabelBox}>
                <Text style={styles.dimLabel}>Sill height</Text>
                <Text style={styles.dimSource}>floor-to-ceiling</Text>
              </View>
              <Text style={styles.noSillValue}>0 cm</Text>
            </View>
          ) : (
            <>
              <DimRow
                dimKey="sill"
                dim={dims.sill}
                onMeasureAR={onMeasureAR}
                onManual={onManual}
                arUnsupported={arUnsupported}
              />
              <Text style={styles.hintText}>
                Sill height = floor to the bottom of the glass. For AR, snap both
                points on the wall below the window.
              </Text>

              {!showSmallSill ? (
                <TouchableOpacity onPress={() => setShowSmallSill(true)}>
                  <Text style={styles.skipLink}>Small or hard-to-measure sill?</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.smallSillBox}>
                  <Text style={styles.smallSillHint}>
                    AR is unreliable for short distances — tap a common height
                    below, or type your own in the field above. A small sill
                    barely changes the result, so a close estimate is fine.
                  </Text>
                  <View style={styles.presetRow}>
                    {SILL_PRESETS.map((cm) => {
                      const active =
                        dims.sill?.cm === cm && dims.sill?.source === 'manual';
                      return (
                        <TouchableOpacity
                          key={cm}
                          style={[
                            styles.presetChip,
                            active && styles.presetChipOn,
                          ]}
                          activeOpacity={0.82}
                          onPress={() => onManual('sill', cm)}>
                          <Text
                            style={[
                              styles.presetText,
                              active && styles.presetTextOn,
                            ]}>
                            {cm} cm
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity onPress={() => setShowSmallSill(false)}>
                    <Text style={styles.skipLink}>Hide</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.checkRow}
            activeOpacity={0.82}
            onPress={() => onToggleNoSill(!noSill)}>
            <View style={[styles.checkbox, noSill && styles.checkboxOn]}>
              {noSill && <Icon name="check" size={14} color={palette.bg} />}
            </View>
            <Text style={styles.checkLabel}>
              Floor-to-ceiling window (no sill)
            </Text>
          </TouchableOpacity>
          {noSill && (
            <Text style={styles.hintText}>
              Height is measured from the floor to the top of the glass.
            </Text>
          )}

          {!showSkip ? (
            <TouchableOpacity onPress={() => setShowSkip(true)}>
              <Text style={styles.skipLink}>
                Can't measure this window at all?
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.skipExplainText}>
                Use this only when a tape measure is also impossible (e.g.
                window is outside reach, blocked by a fixed obstruction). A
                reflective frame only affects AR — you can still type a tape
                reading in the fields above.
              </Text>
              <TextInput
                style={styles.input}
                value={skipText}
                onChangeText={setSkipText}
                placeholder="why can't you measure it at all? (e.g. inaccessible, no floor access)"
                placeholderTextColor={palette.textFaint}
              />
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  skipText.trim() === '' && styles.disabled,
                ]}
                activeOpacity={0.82}
                disabled={skipText.trim() === ''}
                onPress={() => onSkip(skipText.trim())}>
                <Text style={styles.skipConfirmText}>
                  Skip window measurement (logged)
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  bodyText: {
    color: palette.textDim,
    fontSize: 13.5,
    lineHeight: 21,
    marginBottom: 18,
  },
  bodyEm: {
    color: palette.mint,
    fontWeight: '800',
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  dimIconTile: {
    width: 34,
    height: 34,
    borderRadius: radii.chip,
    backgroundColor: palette.raised,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimLabelBox: {
    flex: 1,
  },
  dimLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dimSource: {
    color: palette.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  dimInput: {
    ...inputBase,
    width: 88,
    paddingHorizontal: 10,
    textAlign: 'right',
  },
  arButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.leaf,
    borderRadius: radii.pill,
    height: 46,
    paddingHorizontal: 12,
  },
  arButtonText: {
    color: palette.bg,
    fontSize: 14,
    fontWeight: '900',
  },
  arButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.inset,
    borderRadius: radii.pill,
    height: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  arButtonDisabledText: {
    color: palette.textFaint,
    fontSize: 14,
    fontWeight: '900',
  },
  hintText: {
    color: palette.textFaint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 12,
  },
  noSillValue: {
    color: palette.mint,
    fontSize: 14,
    fontWeight: '800',
  },
  smallSillBox: {
    backgroundColor: palette.inset,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  smallSillHint: {
    color: palette.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  presetChip: {
    backgroundColor: palette.raised,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  presetChipOn: {
    backgroundColor: palette.leafSoft,
    borderColor: palette.leaf,
  },
  presetText: {
    color: palette.mint,
    fontSize: 13,
    fontWeight: '800',
  },
  presetTextOn: {
    color: palette.text,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: palette.leaf,
    borderColor: palette.leaf,
  },
  checkLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  skipLink: {
    color: palette.textDim,
    fontSize: 13,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  skipExplainText: {
    color: palette.textFaint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    ...inputBase,
    marginTop: 10,
    marginBottom: 12,
  },
  secondaryButton: { ...buttonBase.secondary },
  secondaryButtonText: { ...buttonBase.secondaryText },
  skipConfirmText: {
    color: palette.coral,
    fontSize: 14,
    fontWeight: '900',
  },
  skippedText: {
    color: palette.amber,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  disabled: {
    opacity: 0.45,
  },
});
