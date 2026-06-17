/** Full-screen botanical gradient wash with a soft halo near the top, sitting
 *  behind all content. Replaces the flat dark background with depth. */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { gradients } from '../theme/theme';

export default function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.screen as unknown as string[]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={gradients.halo as unknown as string[]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.halo}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  halo: {
    position: 'absolute',
    top: -60,
    left: -40,
    right: -40,
    height: 320,
    opacity: 0.7,
  },
});
