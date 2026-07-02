/** Ranked recommendation list for one captured spot. Explainability is the
 *  point: every survivor shows its plain-language "why", every eliminated
 *  plant its gate reason, and the raw/calibrated lux pair stays visible for
 *  evaluation transcription. Plant tiles are code-drawn monograms (no photo
 *  assets) — deterministic tint per plant_id so the list reads visually. */

import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { Recommendation, RecommendResult } from '../engine';
import { WEIGHTS } from '../engine/config';
import { cardBase, palette, radii } from '../theme/theme';
import CardHeader from '../ui/CardHeader';
import Icon from '../ui/Icon';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** The four weighted factors, in display order, with their plain-language label
 *  and the engine weight (so the percentages shown are the real ones). */
const FACTOR_ROWS: Array<{
  key: 'light' | 'directSun' | 'distance' | 'confidence';
  label: string;
}> = [
  { key: 'light', label: 'Light fit' },
  { key: 'directSun', label: 'Sun comfort' },
  { key: 'distance', label: 'Distance fit' },
  { key: 'confidence', label: 'Evidence quality' },
];

/** Green / amber / red by sub-score, mirroring the confidence colour scale. */
function barColor(value: number): string {
  if (value >= 0.8) return palette.leaf;
  if (value >= 0.5) return palette.amber;
  return palette.coral;
}

/** Expandable per-plant breakdown: one bar per weighted factor, each labelled
 *  with its real weight and a plain-language note. Factors that were not captured
 *  (e.g. no sun estimate) say so instead of showing a misleading 0 bar. */
function FactorBreakdown({ r }: { r: Recommendation }) {
  return (
    <View style={styles.breakdown}>
      {FACTOR_ROWS.map(({ key, label }) => {
        const f = r.factors[key];
        const weightPct = Math.round(WEIGHTS[key] * 100);
        const scorePct = Math.round(f.value * 100);
        return (
          <View key={key} style={styles.factorRow}>
            <View style={styles.factorHead}>
              <Text style={styles.factorLabel}>{label}</Text>
              <Text style={styles.factorWeight}>
                {f.available ? `${scorePct} / 100` : '—'} · {weightPct}% of score
              </Text>
            </View>
            {f.available ? (
              <View style={styles.factorTrack}>
                <View
                  style={[
                    styles.factorFill,
                    { width: pct(scorePct), backgroundColor: barColor(f.value) },
                  ]}
                />
              </View>
            ) : null}
            <Text style={styles.factorNote}>
              {f.available
                ? f.note
                : 'Not captured — dropped from the score, and the other factors were reweighted to make up 100%.'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** "See score breakdown ▾ / Hide score breakdown ▴" toggle. */
function BreakdownToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.breakdownToggle}
      activeOpacity={0.8}
      onPress={onToggle}>
      <Text style={styles.breakdownToggleText}>
        {expanded ? 'Hide score breakdown ▴' : 'See score breakdown ▾'}
      </Text>
    </TouchableOpacity>
  );
}

/** Formats a numeric range as "X–Y unit", a single bound, or null when absent. */
function formatRange(
  min: number | null,
  max: number | null,
  unit: string,
): string | null {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (min != null && max != null) {
    return min === max
      ? `${fmt(min)} ${unit}`
      : `${fmt(min)}–${fmt(max)} ${unit}`;
  }
  if (min != null) return `≥ ${fmt(min)} ${unit}`;
  if (max != null) return `≤ ${fmt(max)} ${unit}`;
  return null;
}

/** Plain-language rows derived from a plant's display-only reference data.
 *  Absent metrics are skipped entirely (never shown as 0/—). */
function buildScienceRows(
  ref: NonNullable<Recommendation['reference']>,
): Array<{ label: string; value: string; hint: string }> {
  const rows: Array<{ label: string; value: string; hint: string }> = [];

  const dli = formatRange(ref.dliMin, ref.dliMax, 'mol/m²/day');
  if (dli != null) {
    rows.push({
      label: 'Daily light budget (DLI)',
      value: dli,
      hint: 'Roughly how much light this plant likes to receive over a whole day. Higher means it wants a brighter, sunnier home.',
    });
  }

  const photo = formatRange(ref.photoperiodMin, ref.photoperiodMax, 'hours');
  if (photo != null) {
    rows.push({
      label: 'Daily light hours',
      value: photo,
      hint: 'How many hours of light per day suit it best.',
    });
  }

  const preferredPpfd = formatRange(
    ref.preferredPpfdMin,
    ref.preferredPpfdMax,
    'µmol/m²/s',
  );
  const maintenancePpfd = formatRange(
    ref.maintenancePpfdMin,
    ref.maintenancePpfdMax,
    'µmol/m²/s',
  );
  if (preferredPpfd != null) {
    rows.push({
      label: 'Plant-usable light to thrive (PPFD)',
      value: preferredPpfd,
      hint: 'The plant-useful part of light that scientists measure instead of lux — this range is for healthy growth.',
    });
  }
  if (maintenancePpfd != null) {
    rows.push({
      label: 'Plant-usable light to survive (PPFD)',
      value: maintenancePpfd,
      hint:
        preferredPpfd != null
          ? 'The lower range that keeps it merely alive.'
          : 'The plant-useful part of light that scientists measure instead of lux — this range keeps it alive.',
    });
  }

  return rows;
}

/** Separate, independently-toggled panel showing the plant's DLI / photoperiod /
 *  PPFD reference data in plain language. Strictly display-only — the disclaimer
 *  states these are not measured and not used to rank (CLAUDE.md §1, §12). */
function LightSciencePanel({
  reference,
}: {
  reference: NonNullable<Recommendation['reference']>;
}) {
  const rows = buildScienceRows(reference);
  if (rows.length === 0) return null;
  return (
    <View style={styles.science}>
      <Text style={styles.scienceDisclaimer}>
        Reference values from plant-science research. The app doesn't measure
        these and doesn't use them to rank plants — your result is based on the
        actual light measured at your spot.
      </Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.scienceRow}>
          <View style={styles.scienceHead}>
            <Text style={styles.scienceLabel}>{row.label}</Text>
            <Text style={styles.scienceValue}>{row.value}</Text>
          </View>
          <Text style={styles.scienceHint}>{row.hint}</Text>
        </View>
      ))}
    </View>
  );
}

/** "Light science (reference) ▾ / ▴" toggle — separate from the score breakdown. */
function ScienceToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.breakdownToggle}
      activeOpacity={0.8}
      onPress={onToggle}>
      <Text style={styles.scienceToggleText}>
        {expanded ? 'Hide light science ▴' : 'Light science (reference) ▾'}
      </Text>
    </TouchableOpacity>
  );
}

/** Leaf-tinted ramp behind the #1 pick so it reads as the headline result. */
const HERO_GRADIENT = ['#1F4A31', '#12301E'] as const;

const pct = (score: number) =>
  `${Math.min(100, Math.max(0, score))}%` as `${number}%`;

type Props = {
  result: RecommendResult;
  /** Which optional inputs fed this result, e.g.
   *  "light ✓ · distance ✓ · direct sun not captured". */
  inputsLine?: string | null;
  /** The light reading was taken at night (civil twilight or later) — the lux
   *  may be a lamp/artificial source, not daylight. The thesis only validates
   *  daylight light-thresholds, so this caveat must sit on the recommendations
   *  themselves, not just on the separate sun-estimate card further down. */
  capturedAtNight?: boolean;
};

function confidenceColor(
  c: Recommendation['recommendationConfidence'],
): string {
  if (c === 'high') return palette.leaf;
  if (c === 'medium') return palette.amber;
  if (c === 'low' || c === 'provisional') return palette.coral;
  return palette.textDim; // reduced
}

function confidenceLabel(
  c: Recommendation['recommendationConfidence'],
): string {
  if (c === 'reduced') return 'Reduced';
  return c.charAt(0).toUpperCase() + c.slice(1);
}

/** Up to two initials from the common name, e.g. "ZZ Plant" → "ZP". */
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase();
}

/** Deterministic tile tint per plant id — botanical hues, stable across
 *  renders so the same plant always looks the same. */
const TILE_TINTS = ['#27513A', '#1F4A45', '#3B5230', '#23445A'];
function tileTint(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return TILE_TINTS[h % TILE_TINTS.length];
}

function HeroCard({
  r,
  expanded,
  onToggle,
  scienceExpanded,
  onToggleScience,
}: {
  r: Recommendation;
  expanded: boolean;
  onToggle: () => void;
  scienceExpanded: boolean;
  onToggleScience: () => void;
}) {
  return (
    <LinearGradient
      colors={HERO_GRADIENT as unknown as string[]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}>
      <View style={styles.bestBadge}>
        <Icon name="sparkle" size={12} color={palette.bg} />
        <Text style={styles.bestBadgeText}>BEST MATCH</Text>
      </View>

      <View style={styles.heroTopRow}>
        <View style={[styles.heroTile, { backgroundColor: tileTint(r.plant_id) }]}>
          <Text style={styles.heroTileText}>{monogram(r.common_name)}</Text>
        </View>
        <View style={styles.heroHeadText}>
          <Text style={styles.heroName}>{r.common_name}</Text>
          <Text style={styles.heroLight}>{r.displayLightLabel}</Text>
        </View>
      </View>

      <View style={styles.heroScoreRow}>
        <Text style={styles.heroScore}>{Math.round(r.score)}</Text>
        <Text style={styles.heroScoreOut}>/100 match</Text>
      </View>
      <View style={styles.heroTrack}>
        <View style={[styles.heroFill, { width: pct(r.score) }]} />
      </View>

      <View style={styles.confidenceRow}>
        <View
          style={[
            styles.confidenceDot,
            { backgroundColor: confidenceColor(r.recommendationConfidence) },
          ]}
        />
        <Text style={styles.metaText}>
          {confidenceLabel(r.recommendationConfidence)} confidence
        </Text>
      </View>

      <Text style={styles.heroExplanation}>{r.explanation}</Text>
      {r.displayWarning != null && (
        <Text style={styles.warning}>⚠ {r.displayWarning}</Text>
      )}

      <BreakdownToggle expanded={expanded} onToggle={onToggle} />
      {expanded && <FactorBreakdown r={r} />}
      {r.reference != null && (
        <>
          <ScienceToggle
            expanded={scienceExpanded}
            onToggle={onToggleScience}
          />
          {scienceExpanded && <LightSciencePanel reference={r.reference} />}
        </>
      )}
    </LinearGradient>
  );
}

function CompactRow({
  r,
  expanded,
  onToggle,
  scienceExpanded,
  onToggleScience,
}: {
  r: Recommendation;
  expanded: boolean;
  onToggle: () => void;
  scienceExpanded: boolean;
  onToggleScience: () => void;
}) {
  return (
    <View style={styles.item}>
      <View style={styles.itemRow}>
        <View style={[styles.tile, { backgroundColor: tileTint(r.plant_id) }]}>
          <Text style={styles.tileText}>{monogram(r.common_name)}</Text>
        </View>

        <View style={styles.itemBody}>
          <Text style={styles.itemName}>{r.common_name}</Text>
          <Text style={styles.metaText}>{r.displayLightLabel}</Text>
        </View>

        <View style={styles.scoreBox}>
          <Text style={styles.itemScore}>{Math.round(r.score)}</Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
      </View>

      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: pct(r.score) }]} />
      </View>

      <View style={styles.confidenceRow}>
        <View
          style={[
            styles.confidenceDot,
            { backgroundColor: confidenceColor(r.recommendationConfidence) },
          ]}
        />
        <Text style={styles.metaText}>
          {confidenceLabel(r.recommendationConfidence)} confidence
        </Text>
      </View>

      <Text style={styles.explanation}>{r.explanation}</Text>
      {r.displayWarning != null && (
        <Text style={styles.warning}>⚠ {r.displayWarning}</Text>
      )}

      <BreakdownToggle expanded={expanded} onToggle={onToggle} />
      {expanded && <FactorBreakdown r={r} />}
      {r.reference != null && (
        <>
          <ScienceToggle
            expanded={scienceExpanded}
            onToggle={onToggleScience}
          />
          {scienceExpanded && <LightSciencePanel reference={r.reference} />}
        </>
      )}
    </View>
  );
}

export default function RecommendationList({
  result,
  inputsLine,
  capturedAtNight,
}: Props) {
  const [showEliminated, setShowEliminated] = useState(false);
  // Which plant's score breakdown is open — only one at a time.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleBreakdown = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((cur) => (cur === id ? null : id));
  };
  // Which plant's "Light science (reference)" panel is open — independent of
  // the score breakdown, one at a time.
  const [scienceId, setScienceId] = useState<string | null>(null);
  const toggleScience = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setScienceId((cur) => (cur === id ? null : id));
  };
  const { recommended, eliminated } = result;
  const any = recommended[0] ?? eliminated[0];
  const top = recommended[0];
  const rest = recommended.slice(1);

  return (
    <View style={styles.card}>
      <CardHeader
        icon="sparkle"
        title="Plants for this spot"
        kicker="ranked for your measured light"
      />

      {any && (
        <Text style={styles.luxLine}>
          Scored at {any.luxUsed} lx (calibrated from {any.luxRaw} lx phone
          reading)
        </Text>
      )}

      {capturedAtNight && (
        <View style={styles.nightWarning}>
          <Text style={styles.nightWarningText}>
            🌙 This light reading was taken at night — it may be a lamp or
            other artificial source, not daylight. Daylight at this spot could
            be very different; re-measure during the day for a reliable match.
          </Text>
        </View>
      )}

      {inputsLine != null && (
        <Text style={styles.inputsLine}>Inputs: {inputsLine}</Text>
      )}

      {recommended.length === 0 && (
        <Text style={styles.emptyText}>
          No plant in the dataset suits this spot — the measured light is below
          every survival threshold.
        </Text>
      )}

      {top && (
        <HeroCard
          r={top}
          expanded={expandedId === top.plant_id}
          onToggle={() => toggleBreakdown(top.plant_id)}
          scienceExpanded={scienceId === top.plant_id}
          onToggleScience={() => toggleScience(top.plant_id)}
        />
      )}

      {rest.length > 0 && (
        <>
          <Text style={styles.othersHeading}>Other good matches</Text>
          {rest.map((r) => (
            <CompactRow
              key={r.plant_id}
              r={r}
              expanded={expandedId === r.plant_id}
              onToggle={() => toggleBreakdown(r.plant_id)}
              scienceExpanded={scienceId === r.plant_id}
              onToggleScience={() => toggleScience(r.plant_id)}
            />
          ))}
        </>
      )}

      {eliminated.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.eliminatedToggle}
            activeOpacity={0.82}
            onPress={() => setShowEliminated((v) => !v)}>
            <Text style={styles.eliminatedToggleText}>
              {showEliminated ? 'Hide' : 'Show'} unsuitable plants (
              {eliminated.length})
            </Text>
          </TouchableOpacity>

          {showEliminated &&
            eliminated.map((r) => (
              <View key={r.plant_id} style={styles.eliminatedItem}>
                <Text style={styles.eliminatedName}>{r.common_name}</Text>
                <Text style={styles.eliminatedReason}>{r.gateReason}</Text>
              </View>
            ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...cardBase },
  cardTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  luxLine: {
    color: palette.textDim,
    fontSize: 12,
    marginBottom: 4,
  },
  inputsLine: {
    color: palette.textFaint,
    fontSize: 12,
    marginBottom: 12,
  },
  emptyText: {
    color: palette.coral,
    fontSize: 14,
    lineHeight: 22,
  },
  nightWarning: {
    backgroundColor: palette.raised,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: palette.amber,
    padding: 14,
    marginBottom: 14,
  },
  nightWarningText: {
    color: palette.amber,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  item: {
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    paddingTop: 16,
    marginTop: 8,
    paddingBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  tile: {
    width: 52,
    height: 52,
    borderRadius: radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    color: palette.mint,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  itemBody: {
    flex: 1,
  },
  hero: {
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: palette.leaf,
    padding: 18,
    marginTop: 14,
    marginBottom: 4,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: palette.leaf,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  bestBadgeText: {
    color: palette.bg,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  heroTile: {
    width: 60,
    height: 60,
    borderRadius: radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTileText: {
    color: palette.mint,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroHeadText: {
    flex: 1,
  },
  heroName: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '900',
  },
  heroLight: {
    color: palette.mint,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heroScore: {
    color: palette.text,
    fontSize: 46,
    fontWeight: '900',
  },
  heroScoreOut: {
    color: palette.textDim,
    fontSize: 14,
    fontWeight: '700',
  },
  heroTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.inset,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 12,
  },
  heroFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.leaf,
  },
  heroExplanation: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  othersHeading: {
    color: palette.textDim,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 22,
  },
  itemName: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  metaText: {
    color: palette.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  itemScore: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '900',
  },
  scoreOutOf: {
    color: palette.textFaint,
    fontSize: 11,
    fontWeight: '700',
  },
  scoreTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.inset,
    overflow: 'hidden',
    marginBottom: 10,
  },
  scoreFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.leaf,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  explanation: {
    color: '#C9D8CD',
    fontSize: 13,
    lineHeight: 20,
  },
  warning: {
    color: palette.amber,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  breakdownToggle: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  breakdownToggleText: {
    color: palette.mint,
    fontSize: 13,
    fontWeight: '800',
  },
  breakdown: {
    marginTop: 12,
    gap: 12,
  },
  factorRow: {},
  factorHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  factorLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
  },
  factorWeight: {
    color: palette.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  factorTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.inset,
    overflow: 'hidden',
    marginBottom: 5,
  },
  factorFill: {
    height: 6,
    borderRadius: 3,
  },
  factorNote: {
    color: palette.textDim,
    fontSize: 12,
    lineHeight: 18,
  },
  scienceToggleText: {
    color: palette.textDim,
    fontSize: 13,
    fontWeight: '800',
  },
  science: {
    marginTop: 12,
    backgroundColor: palette.inset,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 14,
    gap: 12,
  },
  scienceDisclaimer: {
    color: palette.textFaint,
    fontSize: 11.5,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  scienceRow: {},
  scienceHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 3,
  },
  scienceLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  scienceValue: {
    color: palette.mint,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  scienceHint: {
    color: palette.textDim,
    fontSize: 12,
    lineHeight: 18,
  },
  eliminatedToggle: {
    marginTop: 14,
    backgroundColor: palette.raised,
    borderRadius: radii.pill,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eliminatedToggleText: {
    color: palette.textDim,
    fontSize: 14,
    fontWeight: '800',
  },
  eliminatedItem: {
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    paddingTop: 10,
    marginTop: 10,
  },
  eliminatedName: {
    color: palette.textDim,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  eliminatedReason: {
    color: palette.textFaint,
    fontSize: 12,
    lineHeight: 18,
  },
});
