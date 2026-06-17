/** Primary call-to-action: a leaf gradient pill with dark text and an optional
 *  trailing icon. Drop-in for the old solid `buttonBase.primary` button. */

import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { gradients, palette, radii } from '../theme/theme';
import Icon, { IconName } from './Icon';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** Trailing icon, drawn in the dark button-text colour. */
  icon?: IconName;
  colors?: readonly string[];
  style?: StyleProp<ViewStyle>;
};

export default function GradientButton({
  title,
  onPress,
  disabled = false,
  icon,
  colors = gradients.leaf,
  style,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.shadow, disabled && styles.disabled, style]}>
      <LinearGradient
        colors={colors as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}>
        <View style={styles.row}>
          <Text style={styles.text}>{title}</Text>
          {icon != null && <Icon name={icon} size={19} color={palette.bg} strokeWidth={2.2} />}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radii.pill,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  disabled: {
    opacity: 0.4,
  },
  button: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  text: {
    color: palette.bg,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
