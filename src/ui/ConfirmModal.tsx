/** Themed confirmation dialog replacing the OS Alert for destructive actions.
 *  A dimmed scrim (frosted-dark, no native blur dependency) sits behind a
 *  card that scales + fades in. Tap the scrim or Cancel to dismiss. */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { palette } from '../theme/theme';
import Icon, { IconName } from './Icon';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  icon?: IconName;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  icon = 'alert',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, a]);

  const accent = destructive ? palette.coral : palette.leaf;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onCancel}>
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
          {/* Stop scrim-press from bubbling through the card */}
          <Pressable onPress={() => {}}>
            <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
              <Icon name={icon} size={24} color={accent} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.8}
                onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: accent }]}
                activeOpacity={0.85}
                onPress={onConfirm}>
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
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
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: palette.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 8,
  },
  message: {
    color: palette.textDim,
    fontSize: 14,
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.leafSoft,
  },
  cancelText: {
    color: palette.mint,
    fontSize: 15,
    fontWeight: '800',
  },
  confirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: palette.bg,
    fontSize: 15,
    fontWeight: '800',
  },
});
