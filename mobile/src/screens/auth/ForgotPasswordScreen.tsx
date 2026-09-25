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
import { Colors, Spacing, FontSizes, BorderRadius } from '../../theme/colors';
import { authApi } from '../../api/client';

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.icon}>{step === 'done' ? '✅' : '🔑'}</Text>
          <Text style={styles.title}>
            {step === 'request' ? 'Forgot Password' : step === 'verify' ? 'Reset Password' : 'Password Reset!'}
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
                  placeholderTextColor={Colors.textMuted}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                />
              </View>
              {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}
              <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleRequestReset} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'verify' && (
            <>
              <Text style={styles.desc}>Enter the code sent to {identifier} and your new password.</Text>

              {otpHint ? (
                <View style={styles.hintBox}>
                  <Text style={styles.hintLabel}>🧪 Dev Mode OTP:</Text>
                  <Text style={styles.hintCode}>{otpHint}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor={Colors.textMuted}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Min 8 chars, uppercase, digit, symbol"
                  placeholderTextColor={Colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
              {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}
              <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleResetPassword} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Reset Password</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'done' && (
            <>
              <Text style={styles.successText}>Your password has been reset successfully!</Text>
              <TouchableOpacity style={styles.btn} onPress={onBack}>
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
  backBtn: { position: 'absolute', top: 60, left: Spacing.lg, zIndex: 10 },
  backText: { color: Colors.accent, fontSize: FontSizes.bodyLarge, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  icon: { fontSize: 56, marginBottom: Spacing.sm },
  title: { fontSize: FontSizes.title, fontWeight: '800', color: Colors.textPrimary },
  formCard: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  desc: { fontSize: FontSizes.body, color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: 'center' },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontSize: FontSizes.caption, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md - 2, fontSize: FontSizes.bodyLarge, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  hintBox: { backgroundColor: 'rgba(108, 92, 231, 0.2)', borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg },
  hintLabel: { fontSize: FontSizes.caption, color: Colors.primaryLight },
  hintCode: { fontSize: 28, fontWeight: '900', color: Colors.accentOrange, letterSpacing: 6 },
  errorText: { color: Colors.danger, fontSize: FontSizes.body, textAlign: 'center', marginBottom: Spacing.md },
  successText: { color: Colors.success, fontSize: FontSizes.bodyLarge, textAlign: 'center', marginBottom: Spacing.lg, fontWeight: '600' },
  btn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.textPrimary, fontSize: FontSizes.bodyLarge, fontWeight: '700' },
});
