import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../theme/colors';
import Icon, { IconName } from './Icon';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  tone?: ToastTone;
  /** Extra space above the bottom edge (e.g. tab bar height + insets). */
  bottom?: number;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  duration?: number;
}

const TONE: Record<ToastTone, { icon: IconName; bg: string; tint: string }> = {
  success: { icon: 'checkmark-circle', bg: Colors.bgToast, tint: '#34D399' },
  error: { icon: 'alert-circle', bg: Colors.bgToastError, tint: '#FCA5A5' },
  info: { icon: 'information-circle', bg: Colors.bgToast, tint: '#93C5FD' },
};

/**
 * Bottom-anchored snackbar. Unlike inline banners it stays visible while the
 * user scrolls, so remote-command feedback is never lost mid-interaction.
 */
export default function Toast({
  visible,
  message,
  tone = 'info',
  bottom = Spacing.lg,
  actionLabel,
  onAction,
  onDismiss,
  duration = 3200,
}: ToastProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const cfg = TONE[tone];

  useEffect(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 9,
        tension: 90,
      }).start();
      hideTimer.current = setTimeout(() => dismissRef.current?.(), duration);
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [visible, message, anim, duration]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.wrap,
        {
          bottom,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          ],
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={[styles.bar, { backgroundColor: cfg.bg }]}>
        <Icon name={cfg.icon} size={18} color={cfg.tint} />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
        {actionLabel && onAction ? (
          <TouchableOpacity
            onPress={() => {
              onAction();
              onDismiss?.();
            }}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    alignItems: 'stretch',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.14)',
    ...Shadows.raised,
  },
  text: {
    flex: 1,
    color: Colors.textOnToast,
    fontSize: FontSizes.body,
    fontWeight: '600',
    lineHeight: 20,
  },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(248, 250, 252, 0.14)',
  },
  actionText: {
    color: Colors.textOnToast,
    fontSize: FontSizes.caption,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
