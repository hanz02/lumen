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

/** Error thrown when the user selected "never ask again" for location.
 *  Callers should open Settings rather than re-prompting. */
export class LocationPermissionPermanentlyDeniedError extends Error {
  readonly permanentlyDenied = true;
  constructor() {
    super(
      'Location permission permanently denied — enable it in App Settings to get the sun estimate.',
    );
  }
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
      const neverAsk = Object.values(statuses).some(
        (s) => s === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      );
      if (neverAsk) throw new LocationPermissionPermanentlyDeniedError();
      throw new Error(
        'Location permission denied — the direct-sun estimate needs a city-level position.',
      );
    }
  }
  return LocationModule.getCurrentPosition();
}
