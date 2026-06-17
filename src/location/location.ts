/** Coarse position for the SPA direct-sun estimate: runtime permission
 *  request (RN core PermissionsAndroid — no added dependency) + the native
 *  LocationModule one-shot. City-level accuracy is all the sun math needs. */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { LocationModule } = NativeModules;

export interface GeoFix {
  latitude: number;
  longitude: number;
  /** Magnetic declination at the fix (deg, +E) — magnetic + declination = true. */
  declinationDeg: number;
  ageMs: number;
  source: string;
}

export async function getPositionWithPermission(): Promise<GeoFix> {
  if (Platform.OS === 'android') {
    const statuses = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    const granted = Object.values(statuses).some(
      (s) => s === PermissionsAndroid.RESULTS.GRANTED,
    );
    if (!granted) {
      throw new Error(
        'Location permission denied — the direct-sun estimate needs a city-level position.',
      );
    }
  }
  return LocationModule.getCurrentPosition();
}
