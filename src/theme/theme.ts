/** Shared design tokens for the whole app — one botanical dark theme so the
 *  step cards, results, and evaluation UI read as a single product. Pure
 *  constants (no react-native imports) so anything can use them. */

export const palette = {
  /** Screen background — near-black green. */
  bg: '#0B1A11',
  /** Default card surface. */
  surface: '#14291B',
  /** Slightly raised surface (chips, icon bubbles, toggles). */
  raised: '#1C3A26',
  /** Sunken surface (text inputs, progress tracks). */
  inset: '#0E2013',
  /** 1px card / divider borders. */
  hairline: '#25422E',

  text: '#F2F7F0',
  textDim: '#94B09C',
  textFaint: '#5F7A67',

  /** Primary action / success accent. */
  leaf: '#56C17F',
  /** Tinted accent surface (badges, monogram tiles). */
  leafSoft: '#27513A',
  /** Bright accent for values worth reading aloud. */
  mint: '#A9E8C3',
  /** Caution — fair quality, approximate values. */
  amber: '#F4C84B',
  /** Failure / destructive. */
  coral: '#E97A66',
} as const;

export const radii = {
  card: 26,
  control: 16,
  chip: 18,
  pill: 999,
} as const;

/** Gradient ramps (LinearGradient `colors`). Kept here so the gradient look is
 *  tunable in one place alongside the flat palette. */
export const gradients = {
  /** App background — deep botanical wash, lighter through the middle. */
  screen: ['#0A1710', '#102A1A', '#0A1710'] as const,
  /** Primary action button — bright leaf to deep leaf. */
  leaf: ['#6FDCA0', '#43A86A'] as const,
  /** Hero / feature surface tint. */
  surface: ['#163524', '#10271A'] as const,
  /** Accent halo behind the hero artwork. */
  halo: ['#2E6B47', 'rgba(46,107,71,0)'] as const,
  /** Warm accent (sun / highlight values). */
  sun: ['#F6D461', '#E7A93C'] as const,
} as const;

/** Base card chrome — spread into a StyleSheet entry. */
export const cardBase = {
  backgroundColor: palette.surface,
  borderRadius: radii.card,
  borderWidth: 1,
  borderColor: palette.hairline,
  padding: 22,
} as const;

/** Pill buttons: bright leaf primary with dark text, outlined secondary. */
export const buttonBase = {
  primary: {
    backgroundColor: palette.leaf,
    borderRadius: radii.pill,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: palette.bg,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.leafSoft,
  },
  secondaryText: {
    color: palette.mint,
    fontSize: 15,
    fontWeight: '800',
  },
} as const;

/** Card header: icon bubble beside the title, optional kicker line under it. */
export const headerBase = {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  bubble: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: palette.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: {
    fontSize: 22,
  },
  title: {
    color: palette.text,
    fontSize: 19,
    fontWeight: '800',
  },
  kicker: {
    color: palette.textFaint,
    fontSize: 12,
    marginTop: 2,
  },
} as const;

export const metaBase = {
  divider: {
    height: 1,
    backgroundColor: palette.hairline,
    marginVertical: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: palette.textDim,
    fontSize: 14,
  },
  value: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
} as const;

export const inputBase = {
  backgroundColor: palette.inset,
  borderRadius: radii.control,
  borderWidth: 1,
  borderColor: palette.hairline,
  color: palette.text,
  paddingHorizontal: 14,
  height: 46,
} as const;

/** Semantic colors for AR hit quality / capture quality dots. */
export function qualityColor(quality: string | null | undefined): string {
  if (quality === 'PLANE' || quality === 'good') return palette.leaf;
  if (quality === 'DEPTH' || quality === 'fair') return palette.amber;
  if (quality === 'FEATURE_POINT') return palette.coral;
  return palette.textFaint; // INSTANT_PLACEMENT / unknown
}

export function qualityLabel(quality: string | null | undefined): string {
  if (quality === 'PLANE') return 'High';
  if (quality === 'DEPTH') return 'Medium';
  if (quality === 'FEATURE_POINT') return 'Low';
  if (quality === 'INSTANT_PLACEMENT') return 'Estimated';
  return quality ?? 'Unknown';
}
