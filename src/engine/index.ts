/** Public entrypoint for the recommendation engine. */
export * from './types';
export { recommend } from './recommend';
export type { RecommendResult } from './recommend';
export { applyGates, spotHasDirectSun } from './gates';
export { scorePlant, distanceZone, plantLightClass } from './scoring';
export { classifyBand, lightFitScore, preferredFloor } from './lightFit';
export { applyLuxCalibration } from './calibration';
export type { LuxCalibration } from './calibration';
export { WEIGHTS, LUX_CALIBRATION } from './config';
