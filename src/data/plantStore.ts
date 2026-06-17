/** Bridge wrapper for PlantDataModule: loads the bundled plant rows once per
 *  JS session and maps them to engine Plant objects. Mapping logic lives in
 *  mapPlant.ts so it stays unit-testable without the native side. */

import { NativeModules } from 'react-native';
import type { Plant } from '../engine/types';
import { mapRowToPlant, type PlantDbRow } from './mapPlant';

const { PlantDataModule } = NativeModules;

export interface PlantDbMeta {
  schema_version: string;
  generated_at: string;
  plant_rows: string;
  evidence_rows: string;
  [key: string]: string;
}

let cache: Plant[] | null = null;

/** Loads (and caches) all plants from the bundled SQLite. Rejects with
 *  E_DB_UNAVAILABLE from the native side if the database cannot be read. */
export async function loadPlants(): Promise<Plant[]> {
  if (cache) return cache;
  const rows: PlantDbRow[] = await PlantDataModule.getPlants();
  cache = rows.map(mapRowToPlant);
  return cache;
}

/** Database provenance (schema_version, generated_at, row counts) — shown in
 *  the UI footer and recorded with evaluation logs. Async so a missing native
 *  module rejects instead of throwing synchronously. */
export async function loadPlantDbMeta(): Promise<PlantDbMeta> {
  return PlantDataModule.getMeta();
}
