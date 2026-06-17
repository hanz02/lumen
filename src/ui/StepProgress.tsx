/** Locked step rail. Completed steps show a leaf check, the current step is
 *  ringed, reachable steps are numbered and tappable, and steps the user has
 *  not unlocked yet show a padlock and cannot be opened — this is the visual
 *  contract that each capture must happen before the next. */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { palette } from '../theme/theme';
import Icon from './Icon';

export type Step = { key: string; label: string };

type Props = {
  steps: Step[];
  /** 0-based index of the step on screen. */
  current: number;
  /** Per-step completion (a logged skip counts as complete). */
  completed: boolean[];
  /** Highest index the user is allowed to open. */
  maxReachable: number;
  onJump: (index: number) => void;
};

export default function StepProgress({
  steps,
  current,
  completed,
  maxReachable,
  onJump,
}: Props) {
  return (
    <View style={styles.rail}>
      {steps.map((step, i) => {
        const isDone = completed[i];
        const isCurrent = i === current;
        const locked = i > maxReachable;

        return (
          <TouchableOpacity
            key={step.key}
            style={styles.col}
            activeOpacity={0.7}
            disabled={locked}
            onPress={() => onJump(i)}>
            <View style={styles.connectorRow}>
              <View
                style={[
                  styles.line,
                  i === 0 && styles.lineHidden,
                  completed[i - 1] && styles.lineFilled,
                ]}
              />
              <View
                style={[
                  styles.node,
                  isDone && styles.nodeDone,
                  isCurrent && !isDone && styles.nodeCurrent,
                  locked && styles.nodeLocked,
                ]}>
                {isDone ? (
                  <Icon name="check" size={15} color={palette.bg} strokeWidth={2.8} />
                ) : locked ? (
                  <Icon name="lock" size={13} color={palette.textFaint} />
                ) : (
                  <Text
                    style={[styles.num, isCurrent && styles.numCurrent]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.line,
                  i === steps.length - 1 && styles.lineHidden,
                  completed[i] && styles.lineFilled,
                ]}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                isCurrent && styles.labelCurrent,
                isDone && styles.labelDone,
              ]}>
              {step.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const NODE = 30;

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  connectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: palette.hairline,
  },
  lineHidden: {
    backgroundColor: 'transparent',
  },
  lineFilled: {
    backgroundColor: palette.leaf,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.hairline,
  },
  nodeDone: {
    backgroundColor: palette.leaf,
    borderColor: palette.leaf,
  },
  nodeCurrent: {
    borderColor: palette.leaf,
    backgroundColor: palette.leafSoft,
  },
  nodeLocked: {
    backgroundColor: palette.inset,
    borderColor: palette.hairline,
  },
  num: {
    color: palette.textDim,
    fontSize: 13,
    fontWeight: '800',
  },
  numCurrent: {
    color: palette.mint,
  },
  label: {
    marginTop: 7,
    fontSize: 10.5,
    fontWeight: '700',
    color: palette.textFaint,
    textAlign: 'center',
  },
  labelCurrent: {
    color: palette.mint,
  },
  labelDone: {
    color: palette.textDim,
  },
});
