import { mapRowToPlant, type PlantDbRow } from '../mapPlant';
import { ZZ_PLANT } from '../../engine/__tests__/fixtures';

/** ZZ Plant exactly as PlantDataModule bridges it from plant_db.sqlite. */
const ZZ_ROW: PlantDbRow = {
  plant_id: 'ZZ_PLANT',
  scientific_name_accepted: 'Zamioculcas zamiifolia',
  common_name_main: 'ZZ Plant',
  family: 'Araceae',
  shade_category: 'partial_shade',
  aspect_orientation: 'north_facing;east_facing;south_facing;west_facing',
  direct_sun_tolerance: 'none',
  final_confidence: 'high',
  value_status: 'direct',
  maintenance_lux_min: 269,
  maintenance_lux_max: null,
  preferred_lux_min: null,
  preferred_lux_max: null,
};

describe('mapRowToPlant', () => {
  it('maps a real DB row to the engine fixture shape', () => {
    const plant = mapRowToPlant(ZZ_ROW);
    // fixtures.ts mirrors plant_db.sqlite, so the mapped row must agree with
    // the fixture on every field the engine consumes
    expect(plant.plant_id).toBe(ZZ_PLANT.plant_id);
    expect(plant.maintenance_lux_min).toBe(ZZ_PLANT.maintenance_lux_min);
    expect(plant.maintenance_lux_max).toBeNull();
    expect(plant.preferred_lux_min).toBeNull();
    expect(plant.shade_category).toBe(ZZ_PLANT.shade_category);
    expect(plant.aspect_orientation).toBe(ZZ_PLANT.aspect_orientation);
    expect(plant.direct_sun_tolerance).toBe('none');
    expect(plant.final_confidence).toBe('high');
    expect(plant.value_status).toBe('direct');
  });

  it('preserves sparse thresholds as null, never 0 or undefined', () => {
    const plant = mapRowToPlant({ ...ZZ_ROW, maintenance_lux_min: null });
    expect(plant.maintenance_lux_min).toBeNull();
    expect(plant.maintenance_lux_max).toBeNull();
  });

  it('degrades unrecognised codes to the weakest value, not garbage', () => {
    const plant = mapRowToPlant({
      ...ZZ_ROW,
      direct_sun_tolerance: 'full_blast_sun',
      final_confidence: 'very_high',
    });
    expect(plant.direct_sun_tolerance).toBe('unknown');
    expect(plant.final_confidence).toBe('provisional');
  });

  it('treats missing optional text fields as null', () => {
    const plant = mapRowToPlant({
      plant_id: 'X',
      scientific_name_accepted: 'X y',
      common_name_main: 'X',
    });
    expect(plant.family).toBeNull();
    expect(plant.shade_category).toBeNull();
    expect(plant.aspect_orientation).toBeNull();
    expect(plant.value_status).toBeNull();
    expect(plant.direct_sun_tolerance).toBe('unknown');
    expect(plant.final_confidence).toBe('provisional');
  });

  it('rejects non-finite lux values from a corrupt bridge payload', () => {
    const plant = mapRowToPlant({ ...ZZ_ROW, maintenance_lux_min: NaN });
    expect(plant.maintenance_lux_min).toBeNull();
  });
});
