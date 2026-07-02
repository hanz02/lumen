/** Pure row→Plant mapping for the bundled plant DB (no react-native imports,
 *  unit-testable like the engine). The integrity gate in
 *  tools/export_to_sqlite.py guarantees LOOKUP-compliant codes, but the
 *  narrowing here is still defensive: an unrecognised code degrades to the
 *  weakest value ('unknown' tolerance / 'provisional' confidence) instead of
 *  silently passing an invalid string into the engine. */

import type {
  Confidence,
  DirectSunTolerance,
  Plant,
  PlantReference,
} from '../engine/types';

/** Shape of one row as bridged from PlantDataModule.getPlants(). */
export interface PlantDbRow {
  plant_id: string;
  scientific_name_accepted: string;
  common_name_main: string;
  family?: string | null;
  shade_category?: string | null;
  aspect_orientation?: string | null;
  direct_sun_tolerance?: string | null;
  final_confidence?: string | null;
  value_status?: string | null;
  maintenance_lux_min?: number | null;
  maintenance_lux_max?: number | null;
  preferred_lux_min?: number | null;
  preferred_lux_max?: number | null;
  // Display-only scientific enrichment (never scored).
  dli_min?: number | null;
  dli_max?: number | null;
  photoperiod_min?: number | null;
  photoperiod_max?: number | null;
  maintenance_ppfd_min?: number | null;
  maintenance_ppfd_max?: number | null;
  preferred_ppfd_min?: number | null;
  preferred_ppfd_max?: number | null;
}

const SUN_TOLERANCES: ReadonlySet<string> = new Set([
  'none',
  'some',
  'tolerant',
  'unknown',
]);

const CONFIDENCES: ReadonlySet<string> = new Set([
  'high',
  'medium',
  'low',
  'provisional',
]);

function sunTolerance(v: string | null | undefined): DirectSunTolerance {
  return v != null && SUN_TOLERANCES.has(v)
    ? (v as DirectSunTolerance)
    : 'unknown';
}

function confidence(v: string | null | undefined): Confidence {
  return v != null && CONFIDENCES.has(v) ? (v as Confidence) : 'provisional';
}

function lux(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Build the display-only reference object, or null when the plant has no
 *  DLI/photoperiod/PPFD evidence at all (so the UI can skip the panel cleanly). */
function reference(row: PlantDbRow): PlantReference | null {
  const ref: PlantReference = {
    dliMin: lux(row.dli_min),
    dliMax: lux(row.dli_max),
    photoperiodMin: lux(row.photoperiod_min),
    photoperiodMax: lux(row.photoperiod_max),
    maintenancePpfdMin: lux(row.maintenance_ppfd_min),
    maintenancePpfdMax: lux(row.maintenance_ppfd_max),
    preferredPpfdMin: lux(row.preferred_ppfd_min),
    preferredPpfdMax: lux(row.preferred_ppfd_max),
  };
  const hasAny = Object.values(ref).some((v) => v != null);
  return hasAny ? ref : null;
}

export function mapRowToPlant(row: PlantDbRow): Plant {
  return {
    plant_id: row.plant_id,
    scientific_name_accepted: row.scientific_name_accepted,
    common_name_main: row.common_name_main,
    family: row.family ?? null,
    maintenance_lux_min: lux(row.maintenance_lux_min),
    maintenance_lux_max: lux(row.maintenance_lux_max),
    preferred_lux_min: lux(row.preferred_lux_min),
    preferred_lux_max: lux(row.preferred_lux_max),
    shade_category: row.shade_category ?? null,
    aspect_orientation: row.aspect_orientation ?? null,
    direct_sun_tolerance: sunTolerance(row.direct_sun_tolerance),
    final_confidence: confidence(row.final_confidence),
    value_status: row.value_status ?? null,
    reference: reference(row),
  };
}
