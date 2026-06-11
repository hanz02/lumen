/** Thin JS wrapper around the native LightSensorModule (TYPE_LIGHT stream).
 *  All reduction logic lives in plateau.ts so it stays unit-testable; this
 *  file only owns the bridge plumbing. */

import { DeviceEventEmitter, NativeModules } from 'react-native';
import type { LightSample } from './plateau';

const { LightSensorModule } = NativeModules;

const EVENT_NAME = 'PlantAR_LightSample';

export interface LightSensorInfo {
  sensorName: string;
  maxRangeLux: number;
}

export interface LightStream {
  info: LightSensorInfo;
  stop: () => void;
}

/** Starts the native TYPE_LIGHT stream. Samples are timestamped with
 *  Date.now() at arrival so the capture controller works on one clock
 *  (the native boot-relative timestamp is for evaluation logs only).
 *  Rejects with E_NO_LIGHT_SENSOR / E_ALREADY_RUNNING from the native side. */
export async function startLightStream(
  onSample: (sample: LightSample) => void,
): Promise<LightStream> {
  const info: LightSensorInfo = await LightSensorModule.start();
  const subscription = DeviceEventEmitter.addListener(
    EVENT_NAME,
    (event: { timestampMs: number; lux: number }) => {
      onSample({ tMs: Date.now(), lux: event.lux });
    },
  );
  return {
    info,
    stop: () => {
      subscription.remove();
      LightSensorModule.stop();
    },
  };
}
