import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../theme/colors';
import Icon, { IconName } from './Icon';

interface StateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
  compact?: boolean;
}

function StateBlock({
  icon = 'information-circle',
  title,
  description,
  actionLabel,
  onAction,
  tone = 'neutral',
  compact,
}: StateProps) {
  const isError = tone === 'error';
  return (
    <View style={[styles.block, compact && styles.blockCompact]} accessibilityRole="summary">
      <View style={[styles.badge, isError ? styles.badgeError : styles.badgeNeutral]}>
        <Icon name={icon} size={compact ? 20 : 26} color={isError ? Colors.danger : Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.btn, isError && styles.btnError]}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Icon name="refresh" size={16} color={isError ? Colors.danger : '#FFFFFF'} />
          <Text style={[styles.btnText, isError && styles.btnTextError]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ErrorState(props: StateProps) {
  return <StateBlock {...props} tone={props.tone ?? 'error'} icon={props.icon ?? 'cloud-offline'} />;
}

export function EmptyState(props: StateProps) {
  return <StateBlock {...props} tone={props.tone ?? 'neutral'} icon={props.icon ?? 'sparkles'} />;
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.block} accessibilityRole="progressbar" accessibilityLabel={label || 'Loading'}>
      <ActivityIndicator size="small" color={Colors.primary} />
      <Text style={styles.desc}>{label || 'Loading'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  blockCompact: {
    paddingVertical: Spacing.lg,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  badgeNeutral: { backgroundColor: Colors.tintBlue, borderWidth: 1, borderColor: Colors.tintBlueStrong },
  badgeError: { backgroundColor: Colors.tintRed, borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.25)' },
  title: {
    fontSize: FontSizes.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  desc: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    ...Shadows.glow,
  },
  btnError: {
    backgroundColor: Colors.tintRed,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: { color: '#FFFFFF', fontSize: FontSizes.body, fontWeight: '800' },
  btnTextError: { color: Colors.danger },
});
