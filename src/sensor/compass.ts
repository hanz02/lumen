/** Thin JS wrapper around the native CompassModule (rotation-vector azimuth
 *  stream). Emits MAGNETIC-north azimuth; true-north correction happens in
 *  the capture flow once LocationModule provides the local declination. */

import { DeviceEventEmitter, NativeModules } from 'react-native';

const { CompassModule } = NativeModules;

const EVENT_NAME = 'PlantAR_CompassSample';

export type CompassAccuracy = 'high' | 'medium' | 'low' | 'unreliable';

export interface CompassSample {
  magneticAzimuthDeg: number;
  accuracy: CompassAccuracy;
  /** Degrees the phone is held away from lying flat (0 = flat, ~90 = upright,
   *  as when tilted up to read the screen). The dominant real-world source of
   *  heading error — see CompassModule.kt for why this is computed from the
   *  rotation matrix rather than pitch/roll. */
  tiltDeg: number;
}

export interface CompassStream {
  stop: () => void;
}

export async function startCompassStream(
  onSample: (sample: CompassSample) => void,
): Promise<CompassStream> {
  await CompassModule.start();
  const subscription = DeviceEventEmitter.addListener(
    EVENT_NAME,
    (event: CompassSample) => onSample(event),
  );
  return {
    stop: () => {
      subscription.remove();
      CompassModule.stop();
    },
  };
}
