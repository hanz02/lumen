/** Capture state machine for one guided spot-light reading: start the native
 *  TYPE_LIGHT stream, buffer samples for CAPTURE_DURATION_MS while reporting
 *  live lux + steadiness to the UI, then reduce with extractPlateauReading.
 *  A capture that never stabilises fails honestly instead of guessing. */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  extractPlateauReading,
  isSteady,
  type LightSample,
  type PlateauReading,
} from './plateau';
import { startLightStream, type LightStream } from './lightSensor';

export const CAPTURE_DURATION_MS = 10000;

export type LightCaptureState =
  | { phase: 'idle' }
  | { phase: 'capturing'; liveLux: number | null; steady: boolean; elapsedMs: number }
  | { phase: 'done'; reading: PlateauReading }
  | { phase: 'failed'; reason: string };

export function useLightCapture(captureMs: number = CAPTURE_DURATION_MS) {
  const [state, setState] = useState<LightCaptureState>({ phase: 'idle' });
  const samplesRef = useRef<LightSample[]>([]);
  const streamRef = useRef<LightStream | null>(null);
  const timersRef = useRef<{
    tick?: ReturnType<typeof setInterval>;
    end?: ReturnType<typeof setTimeout>;
  }>({});

  const cleanup = useCallback(() => {
    if (timersRef.current.tick) clearInterval(timersRef.current.tick);
    if (timersRef.current.end) clearTimeout(timersRef.current.end);
    timersRef.current = {};
    streamRef.current?.stop();
    streamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    samplesRef.current = [];
    const startedAt = Date.now();

    try {
      streamRef.current = await startLightStream((s) =>
        samplesRef.current.push(s),
      );
    } catch (error: any) {
      setState({
        phase: 'failed',
        reason: error?.message ?? 'Light sensor unavailable.',
      });
      return;
    }

    setState({ phase: 'capturing', liveLux: null, steady: false, elapsedMs: 0 });

    timersRef.current.tick = setInterval(() => {
      const now = Date.now();
      const samples = samplesRef.current;
      const last = samples.length > 0 ? samples[samples.length - 1].lux : null;
      setState({
        phase: 'capturing',
        liveLux: last,
        steady: isSteady(samples, now),
        elapsedMs: now - startedAt,
      });
    }, 250);

    timersRef.current.end = setTimeout(() => {
      const endMs = Date.now();
      const samples = samplesRef.current;
      cleanup();
      const reading = extractPlateauReading(samples, endMs);
      if (reading) {
        setState({ phase: 'done', reading });
      } else {
        setState({
          phase: 'failed',
          reason:
            samples.length === 0
              ? 'No light readings arrived from the sensor — try again.'
              : 'The reading never stabilised. Hold the phone flat and still at the spot, then retry.',
        });
      }
    }, captureMs);
  }, [captureMs, cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setState({ phase: 'idle' });
  }, [cleanup]);

  return { state, start, reset };
}
