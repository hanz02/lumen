/** Real PLANT_MASTER rows (from the generated plant_db.sqlite) used as engine
 *  test fixtures, so tests exercise the actual sparse-threshold shapes. */

import type { Plant } from '../types';

export const ZZ_PLANT: Plant = {
  plant_id: 'ZZ_PLANT',
  scientific_name_accepted: 'Zamioculcas zamiifolia',
  common_name_main: 'ZZ Plant',
  maintenance_lux_min: 269,
  maintenance_lux_max: null,
  preferred_lux_min: null,
  preferred_lux_max: null,
  shade_category: 'partial_shade',
  aspect_orientation: 'north_facing;east_facing;south_facing;west_facing',
  direct_sun_tolerance: 'none',
  final_confidence: 'high',
  value_status: 'direct',
};

export const SNAKE_PLANT: Plant = {
  plant_id: 'SNAKE_PLANT',
  scientific_name_accepted: 'Dracaena trifasciata',
  common_name_main: "Snake Plant / Mother-in-Law's Tongue",
  maintenance_lux_min: 807,
  maintenance_lux_max: null,
  preferred_lux_min: null,
  preferred_lux_max: null,
  shade_category: 'bright_filtered_light',
  aspect_orientation: 'north_facing;east_facing;south_facing;west_facing',
  direct_sun_tolerance: 'some',
  final_confidence: 'medium',
  value_status: 'direct',
};

export const SWISS_CHEESE: Plant = {
  plant_id: 'SWISS_CHEESE',
  scientific_name_accepted: 'Monstera deliciosa',
  common_name_main: 'Swiss Cheese Plant / Monstera',
  maintenance_lux_min: 2153,
  maintenance_lux_max: null,
  preferred_lux_min: 4306,
  preferred_lux_max: null,
  shade_category: 'indirect_sunlight;partial_shade',
  aspect_orientation: 'east_facing;south_facing;west_facing',
  direct_sun_tolerance: 'some',
  final_confidence: 'low',
  value_status: 'direct',
};

export const AFRICAN_VIOLET: Plant = {
  plant_id: 'AFRICAN_VIOLET',
  scientific_name_accepted: 'Streptocarpus ionanthus',
  common_name_main: 'African Violet',
  maintenance_lux_min: 1615,
  maintenance_lux_max: null,
  preferred_lux_min: null,
  preferred_lux_max: 10764,
  shade_category: 'bright_indirect_light;partial_shade',
  aspect_orientation: 'north_facing;east_facing;south_facing',
  direct_sun_tolerance: 'none',
  final_confidence: 'medium',
  value_status: 'direct_plus_preferred_support',
};

export const REX_BEGONIA: Plant = {
  plant_id: 'REX_BEGONIA_GROUP',
  scientific_name_accepted: 'Begonia rex-cultorum',
  common_name_main: 'Rex begonia',
  maintenance_lux_min: 16146,
  maintenance_lux_max: 23681,
  preferred_lux_min: null,
  preferred_lux_max: null,
  shade_category: 'bright_indirect_light;partial_shade',
  aspect_orientation: 'east_facing;south_facing;west_facing',
  direct_sun_tolerance: 'none',
  final_confidence: 'medium',
  value_status: 'direct_group',
};

export const ALL_PLANTS: Plant[] = [
  ZZ_PLANT,
  SNAKE_PLANT,
  SWISS_CHEESE,
  AFRICAN_VIOLET,
  REX_BEGONIA,
];
