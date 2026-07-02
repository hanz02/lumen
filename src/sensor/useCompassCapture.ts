/** Window-aspect capture state machine. Protocol (shown in the UI): hold the
 *  phone flat with its top edge pointing out through the window, wait for the
 *  live heading to settle, tap Capture. The captured value is the CIRCULAR
 *  MEAN of the last ~12 samples (single compass readouts jitter by several
 *  degrees), and it is the MAGNETIC azimuth — App.tsx adds the declination
 *  from the location fix to get true north for the SPA estimate. */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startCompassStream,
  type CompassAccuracy,
  type CompassSample,
  type CompassStream,
} from './compass';

const SMOOTHING_WINDOW = 12;

export type CompassCaptureState =
  | { phase: 'idle' }
  | {
      phase: 'reading';
      azimuthDeg: number | null;
      accuracy: CompassAccuracy;
      tiltDeg: number | null;
    }
  | {
      phase: 'captured';
      magneticAzimuthDeg: number;
      accuracy: CompassAccuracy;
      tiltDeg: number;
    }
  | { phase: 'failed'; reason: string };

/** Circular mean of bearings in degrees (a plain average breaks at the
 *  359°/1° wrap). */
export function circularMeanDeg(bearings: number[]): number {
  let x = 0;
  let y = 0;
  for (const b of bearings) {
    x += Math.cos((b * Math.PI) / 180);
    y += Math.sin((b * Math.PI) / 180);
  }
  const mean = (Math.atan2(y, x) * 180) / Math.PI;
  return (mean + 360) % 360;
}

export function useCompassCapture() {
  const [state, setState] = useState<CompassCaptureState>({ phase: 'idle' });
  const bufferRef = useRef<CompassSample[]>([]);
  const streamRef = useRef<CompassStream | null>(null);

  const cleanup = useCallback(() => {
    streamRef.current?.stop();
    streamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    bufferRef.current = [];
    try {
      streamRef.current = await startCompassStream((sample) => {
        const buf = bufferRef.current;
        buf.push(sample);
        if (buf.length > SMOOTHING_WINDOW) buf.shift();
        setState({
          phase: 'reading',
          azimuthDeg: circularMeanDeg(buf.map((s) => s.magneticAzimuthDeg)),
          accuracy: sample.accuracy,
          tiltDeg: sample.tiltDeg,
        });
      });
      setState({ phase: 'reading', azimuthDeg: null, accuracy: 'low', tiltDeg: null });
    } catch (error: any) {
      setState({
        phase: 'failed',
        reason: error?.message ?? 'Compass unavailable.',
      });
    }
  }, []);

  const capture = useCallback(() => {
    const buf = bufferRef.current;
    if (buf.length === 0) return;
    cleanup();
    setState({
      phase: 'captured',
      magneticAzimuthDeg: circularMeanDeg(buf.map((s) => s.magneticAzimuthDeg)),
      accuracy: buf[buf.length - 1].accuracy,
      tiltDeg: buf[buf.length - 1].tiltDeg,
    });
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setState({ phase: 'idle' });
  }, [cleanup]);

  return { state, start, capture, reset };
}
