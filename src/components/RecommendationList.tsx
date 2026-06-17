/** Ranked recommendation list for one captured spot. Explainability is the
 *  point: every survivor shows its plain-language "why", every eliminated
 *  plant its gate reason, and the raw/calibrated lux pair stays visible for
 *  evaluation transcription. Plant tiles are code-drawn monograms (no photo
 *  assets) — deterministic tint per plant_id so the list reads visually. */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { Recommendation, RecommendResult } from '../engine';
import { cardBase, palette, radii } from '../theme/theme';
import CardHeader from '../ui/CardHeader';
import Icon from '../ui/Icon';

/** Leaf-tinted ramp behind the #1 pick so it reads as the headline result. */
const HERO_GRADIENT = ['#1F4A31', '#12301E'] as const;

const pct = (score: number) =>
  `${Math.min(100, Math.max(0, score))}%` as `${number}%`;

type Props = {
  result: RecommendResult;
  /** Which optional inputs fed this result, e.g.
   *  "light ✓ · distance ✓ · direct sun not captured". */
  inputsLine?: string | null;
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

function HeroCard({ r }: { r: Recommendation }) {
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
    </LinearGradient>
  );
}

function CompactRow({ r }: { r: Recommendation }) {
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
    </View>
  );
}

export default function RecommendationList({ result, inputsLine }: Props) {
  const [showEliminated, setShowEliminated] = useState(false);
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

      {inputsLine != null && (
        <Text style={styles.inputsLine}>Inputs: {inputsLine}</Text>
      )}

      {recommended.length === 0 && (
        <Text style={styles.emptyText}>
          No plant in the dataset suits this spot — the measured light is below
          every survival threshold.
        </Text>
      )}

      {top && <HeroCard r={top} />}

      {rest.length > 0 && (
        <>
          <Text style={styles.othersHeading}>Other good matches</Text>
          {rest.map((r) => (
            <CompactRow key={r.plant_id} r={r} />
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
