/** In-app themed toast — a floating notification card that slides down, fades
 *  in, and auto-dismisses, replacing the OS Alert for informational messages.
 *  Tap it (or the ✕) to dismiss early. */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { palette } from '../theme/theme';
import Icon, { IconName } from './Icon';

export type ToastVariant = 'info' | 'error' | 'success';

export interface ToastData {
  id: number;
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

/** Owns the current toast + a stable `show(...)` that re-triggers animation
 *  even when the same message fires twice (each gets a fresh id). */
export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const show = useCallback((t: Omit<ToastData, 'id'>) => {
    setToast({ ...t, id: Date.now() });
  }, []);
  const hide = useCallback(() => setToast(null), []);
  return { toast, show, hide };
}

const ACCENT: Record<ToastVariant, string> = {
  info: palette.mint,
  error: palette.coral,
  success: palette.leaf,
};

const ICON: Record<ToastVariant, IconName> = {
  info: 'alert',
  error: 'alert',
  success: 'check',
};

export default function Toast({
  toast,
  onHide,
}: {
  toast: ToastData | null;
  onHide: () => void;
}) {
  const a = useRef(new Animated.Value(0)).current;

  const animateOut = useCallback(
    (after: () => void) => {
      Animated.timing(a, {
        toValue: 0,
        duration: 190,
        useNativeDriver: true,
      }).start(after);
    },
    [a],
  );

  useEffect(() => {
    if (toast == null) return;
    a.setValue(0);
    Animated.spring(a, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
    const timer = setTimeout(
      () => animateOut(onHide),
      toast.durationMs ?? 3400,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  if (toast == null) return null;

  const variant = toast.variant ?? 'info';
  const accent = ACCENT[variant];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          opacity: a,
          transform: [
            {
              translateY: a.interpolate({
                inputRange: [0, 1],
                outputRange: [-26, 0],
              }),
            },
          ],
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => animateOut(onHide)}
        style={[styles.card, { borderColor: accent }]}>
        <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
          <Icon name={ICON[variant]} size={20} color={accent} />
        </View>
        <View style={styles.body}>
          {toast.title != null && <Text style={styles.title}>{toast.title}</Text>}
          <Text style={styles.message}>{toast.message}</Text>
        </View>
        <Icon name="close" size={16} color={palette.textFaint} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.raised,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  message: {
    color: palette.textDim,
    fontSize: 13,
    lineHeight: 19,
  },
});
