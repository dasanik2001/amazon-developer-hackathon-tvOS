import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../theme/colors';
import { authApi } from '../../api/client';
import Icon, { IconName } from '../../components/Icon';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [step, setStep] = useState<'request' | 'verify' | 'done'>('request');
  const [identifier, setIdentifier] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestReset = async () => {
    if (!identifier.trim()) { setError('Please enter your email or phone'); return; }
    setError('');
    setIsLoading(true);
    try {
      const result = await authApi.forgotPassword(identifier.trim());
      if (result.success) {
        setChallengeId(result.challenge_id);
        setOtpHint(result.otp_hint || '');
        setStep('verify');
      } else {
        setError(result.error || 'Failed to send reset code');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode.trim()) { setError('Please enter the verification code'); return; }
    if (!newPassword) { setError('Please enter a new password'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError('');
    setIsLoading(true);
    try {
      const result = await authApi.resetPassword(challengeId, otpCode.trim(), newPassword);
      if (result.success) {
        setStep('done');
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const headerIcon: IconName = step === 'done' ? 'checkmark-circle' : 'key';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="link">
          <Icon name="arrow-back" size={18} color={Colors.primary} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconBadge, step === 'done' && styles.iconBadgeSuccess]}>
            <Icon
              name={headerIcon}
              size={32}
              color={step === 'done' ? Colors.success : Colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {step === 'request' ? 'Forgot Password' : step === 'verify' ? 'Reset Password' : 'Password Reset'}
          </Text>
        </View>

        <View style={styles.formCard}>
          {step === 'request' && (
            <>
              <Text style={styles.desc}>Enter your email or phone number to receive a reset code.</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email or Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="parent@example.com or +91..."
                  placeholderTextColor={Colors.textPlaceholder}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  accessibilityLabel="Email or phone"
                />
              </View>
              {error ? (
                <View style={styles.errorRow} accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
                  <Icon name="alert-circle" size={15} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.btn, isLoading && styles.btnDisabled]}
                onPress={handleRequestReset}
                disabled={isLoading}
                accessibilityRole="button"
              >
                {isLoading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.btnText}>Send Reset Code</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'verify' && (
            <>
              <Text style={styles.desc}>Enter the code sent to {identifier} and your new password.</Text>

              {otpHint ? (
                <View style={styles.hintBox}>
                  <View style={styles.hintLabelRow}>
                    <Icon name="flask-outline" size={13} color={Colors.info} />
                    <Text style={styles.hintLabel}>Dev Mode OTP</Text>
                  </View>
                  <Text style={styles.hintCode}>{otpHint}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="6-digit code"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  accessibilityLabel="Verification code"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Min 8 chars, uppercase, digit, symbol"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  accessibilityLabel="New password"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  accessibilityLabel="Confirm new password"
                />
              </View>
              {error ? (
                <View style={styles.errorRow} accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
                  <Icon name="alert-circle" size={15} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.btn, isLoading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
                accessibilityRole="button"
              >
                {isLoading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.btnText}>Reset Password</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <Text style={styles.successText}>Your password has been reset successfully.</Text>
              <TouchableOpacity style={styles.btn} onPress={onBack} accessibilityRole="button">
                <Text style={styles.btnText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl },
  backBtn: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingRight: 8,
  },
  backText: { color: Colors.primary, fontSize: FontSizes.bodyLarge, fontWeight: '700' },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: Colors.tintBlue,
    borderWidth: 1.5,
    borderColor: Colors.tintBlueStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  iconBadgeSuccess: {
    backgroundColor: Colors.tintGreen,
    borderColor: 'rgba(5, 150, 105, 0.3)',
  },
  title: { fontSize: FontSizes.title, fontWeight: '800', color: Colors.textPrimary },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  desc: { fontSize: FontSizes.body, color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: 'center', lineHeight: 21 },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: {
    fontSize: FontSizes.caption,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.bgSurface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    fontSize: FontSizes.bodyLarge,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 6,
    fontWeight: '800',
    fontSize: 20,
  },
  hintBox: {
    backgroundColor: Colors.tintBlue,
    borderWidth: 1,
    borderColor: Colors.tintBlueStrong,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  hintLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintLabel: { fontSize: FontSizes.caption, color: Colors.info, fontWeight: '700' },
  hintCode: { fontSize: 28, fontWeight: '900', color: Colors.primary, letterSpacing: 6, marginTop: 4 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  errorText: { color: Colors.danger, fontSize: FontSizes.body, fontWeight: '600', flexShrink: 1 },
  successText: {
    color: '#047857',
    fontSize: FontSizes.bodyLarge,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: FontSizes.bodyLarge, fontWeight: '700' },
});
