/** Bridge wrapper for EvalLogModule (append-only CSV in app storage +
 *  share-sheet export). Row formatting lives in evalRow.ts so it stays
 *  unit-testable. All functions are async so a missing native module in the
 *  Jest environment rejects instead of throwing synchronously. */

import { NativeModules } from 'react-native';
import { EVAL_LOG_HEADER } from './evalRow';

const { EvalLogModule } = NativeModules;

export interface EvalLogStat {
  exists: boolean;
  bytes: number;
  lines: number;
}

export async function getEvalLogStat(): Promise<EvalLogStat> {
  return EvalLogModule.stat();
}

/** Appends a data row, writing the header line first on an empty log. An
 *  existing log with a DIFFERENT header (column set changed between app
 *  versions) refuses the append instead of silently misaligning columns. */
export async function saveEvalRow(row: string): Promise<void> {
  const stat: EvalLogStat = await EvalLogModule.stat();
  if (!stat.exists || stat.lines === 0) {
    await EvalLogModule.append(EVAL_LOG_HEADER);
  } else {
    const text: string = await EvalLogModule.readAll();
    const firstLine = text.split(/\r?\n/, 1)[0];
    if (firstLine !== EVAL_LOG_HEADER) {
      throw new Error(
        'Evaluation log uses an older column format — Export it, then Clear, before saving new rows.',
      );
    }
  }
  await EvalLogModule.append(row);
}

/** Opens the Android share sheet with the whole CSV. */
export async function exportEvalLog(): Promise<void> {
  return EvalLogModule.share();
}

export async function clearEvalLog(): Promise<void> {
  return EvalLogModule.clear();
}
