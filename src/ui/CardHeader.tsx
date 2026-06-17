/** Shared card header: a gradient icon tile, a title with an optional kicker
 *  line, and a leaf "done" check on the right when the step is complete. One
 *  component so every step card reads identically. */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { gradients, palette, radii } from '../theme/theme';
import Icon, { IconName } from './Icon';

type Props = {
  icon: IconName;
  title: string;
  kicker?: string;
  done?: boolean;
};

export default function CardHeader({ icon, title, kicker, done }: Props) {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={gradients.surface as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tile}>
        <Icon name={icon} size={24} color={palette.mint} />
      </LinearGradient>

      <View style={styles.textBox}>
        <Text style={styles.title}>{title}</Text>
        {kicker != null && <Text style={styles.kicker}>{kicker}</Text>}
      </View>

      {done && (
        <View style={styles.checkBubble}>
          <Icon name="check" size={16} color={palette.bg} strokeWidth={2.6} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  tile: {
    width: 50,
    height: 50,
    borderRadius: radii.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  textBox: { flex: 1 },
  title: {
    color: palette.text,
    fontSize: 19,
    fontWeight: '800',
  },
  kicker: {
    color: palette.textFaint,
    fontSize: 12,
    marginTop: 3,
  },
  checkBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.leaf,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
