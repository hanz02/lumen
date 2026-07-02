/** Shown once before the first spot-light capture: a daytime check (via
 *  solarPosition, using NIGHT_THRESHOLD_ELEVATION_DEG — civil twilight, a
 *  separate constant from the SPA's direct-sun-beam floor) plus a reminder
 *  checklist for a clean reading. Advisory only — "Yes, I understand" always
 *  proceeds, even at night / without a position fix. */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme/theme';
import GradientButton from '../ui/GradientButton';
import Icon, { IconName } from '../ui/Icon';

export type DaylightStatus = 'checking' | 'day' | 'night' | 'unknown';

type Props = {
  visible: boolean;
  status: DaylightStatus;
  elevationDeg: number | null;
  onAcknowledge: () => void;
};

/** Sun/moon icon with a pulsing halo — reflects the detected day/night state. */
function DaylightHeader({ status, elevationDeg }: { status: DaylightStatus; elevationDeg: number | null }) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.25,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const isNight = status === 'night';
  const icon: IconName = isNight ? 'moon' : 'sun';
  const color = isNight ? palette.mint : palette.amber;

  const title =
    status === 'checking'
      ? 'Checking the sun’s position…'
      : status === 'day'
      ? 'Daytime detected'
      : status === 'night'
      ? 'It looks like night-time'
      : 'Couldn’t check the time of day';

  const sub =
    status === 'day'
      ? 'Good time to measure — readings reflect outdoor light.'
      : status === 'night'
      ? 'Any light right now is likely from ceiling lights, lamps, screens, or streetlight — not daylight.'
      : status === 'unknown'
      ? 'Make sure you’re measuring during daylight hours.'
      : 'This only takes a moment.';

  return (
    <View style={styles.headerWrap}>
      <View style={styles.haloWrap}>
        <Animated.View
          style={[styles.halo, { opacity: glow, backgroundColor: color }]}
        />
        <Icon name={icon} size={36} color={color} />
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
      <Text style={styles.headerSub}>{sub}</Text>
      {elevationDeg != null && status !== 'checking' && (
        <Text style={styles.headerElevation}>
          Sun elevation ≈ {Math.round(elevationDeg)}°
        </Text>
      )}
    </View>
  );
}

/** Bulb glow pulses up then fades to near-dark, looping — "turn it off". */
function BulbHint() {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(350),
        Animated.timing(t, { toValue: 0, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(450),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const glow = t.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.85] });

  return (
    <View style={styles.rowIconWrap}>
      <Animated.View style={[styles.bulbGlow, { opacity: glow }]} />
      <Icon name="bulb" size={24} color={palette.amber} />
    </View>
  );
}

/** Two "curtain" panels slide open from the centre to reveal the window. */
function CurtainHint() {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(450),
        Animated.timing(t, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(300),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const leftX = t.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const rightX = t.interpolate({ inputRange: [0, 1], outputRange: [0, 7] });

  return (
    <View style={styles.rowIconWrap}>
      <Icon name="window" size={24} color={palette.mint} />
      <Animated.View style={[styles.curtainLeft, { transform: [{ translateX: leftX }] }]} />
      <Animated.View style={[styles.curtainRight, { transform: [{ translateX: rightX }] }]} />
    </View>
  );
}

/** A box slides aside and fades — "clear it out of the way". */
function ObstacleHint() {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(t, { toValue: 1, duration: 750, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(550),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, 16] });
  const opacity = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <View style={styles.rowIconWrap}>
      <Animated.View style={{ transform: [{ translateX }], opacity }}>
        <Icon name="box" size={22} color={palette.coral} />
      </Animated.View>
    </View>
  );
}

function ChecklistRow({ hint, text }: { hint: React.ReactNode; text: string }) {
  return (
    <View style={styles.row}>
      {hint}
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

export default function LightConditionsModal({
  visible,
  status,
  elevationDeg,
  onAcknowledge,
}: Props) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, a]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onAcknowledge}
      statusBarTranslucent>
      <View style={styles.scrim}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: a,
              transform: [
                { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              ],
            },
          ]}>
          <DaylightHeader status={status} elevationDeg={elevationDeg} />

          <View style={styles.divider} />

          <Text style={styles.checklistLabel}>FOR A CLEAN READING</Text>
          <ChecklistRow hint={<BulbHint />} text="Turn off indoor lights at the spot" />
          <ChecklistRow hint={<CurtainHint />} text="Open curtains or blinds wide" />
          <ChecklistRow hint={<ObstacleHint />} text="Clear obstacles in front of the spot" />

          <GradientButton title="Yes, I understand" icon="check" onPress={onAcknowledge} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(4, 10, 7, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: palette.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 24,
  },
  headerWrap: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  haloWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  halo: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  headerTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSub: {
    color: palette.textDim,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  headerElevation: {
    color: palette.textFaint,
    fontSize: 11,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: palette.hairline,
    marginVertical: 16,
  },
  checklistLabel: {
    color: palette.textFaint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    color: palette.textDim,
    fontSize: 13,
    lineHeight: 19,
  },
  bulbGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.amber,
  },
  curtainLeft: {
    position: 'absolute',
    left: 2,
    top: 3,
    width: 7,
    height: 18,
    borderRadius: 2,
    backgroundColor: palette.bg,
  },
  curtainRight: {
    position: 'absolute',
    right: 2,
    top: 3,
    width: 7,
    height: 18,
    borderRadius: 2,
    backgroundColor: palette.bg,
  },
});
