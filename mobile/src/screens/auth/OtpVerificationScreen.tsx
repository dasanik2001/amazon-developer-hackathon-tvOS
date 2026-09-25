import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/client';

interface OtpVerificationScreenProps {
  challengeId: string;
  otpHint?: string;      // Dev-mode: the actual OTP code
  identifier?: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function OtpVerificationScreen({
  challengeId,
  otpHint,
  identifier,
  onVerified,
  onBack,
}: OtpVerificationScreenProps) {
  const { verify2FA } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [currentChallengeId, setCurrentChallengeId] = useState(challengeId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);
  const [currentHint, setCurrentHint] = useState(otpHint);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Pulse animation for dev hint
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste: distribute digits across inputs
      const digits = value.replace(/\D/g, '').split('').slice(0, 6);
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();

      // Auto-submit if all 6 digits filled
      if (newCode.every(d => d !== '')) {
        handleVerify(newCode.join(''));
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = value.replace(/\D/g, '');
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.every(d => d !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const codeStr = otpCode || code.join('');
    if (codeStr.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const result = await verify2FA(currentChallengeId, codeStr);
      if (result.success) {
        onVerified();
      } else {
        setError(result.error || 'Invalid verification code');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;

    try {
      const result = await authApi.resendOtp(currentChallengeId);
      if (result.success) {
        setCurrentChallengeId(result.challenge_id);
        setCurrentHint(result.otp_hint);
        setResendCountdown(30);
        setError('');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Failed to resend code');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.lockIcon}>🔐</Text>
          <Text style={styles.title}>Two-Factor Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.identifierText}>{identifier || 'your registered contact'}</Text>
          </Text>
        </View>

        {/* Dev Mode Hint */}
        {currentHint && (
          <Animated.View style={[styles.hintBox, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.hintLabel}>🧪 Dev Mode — Your OTP Code:</Text>
            <Text style={styles.hintCode}>{currentHint}</Text>
          </Animated.View>
        )}

        {/* OTP Input Grid */}
        <View style={styles.otpRow}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
                error && styles.otpInputError,
              ]}
              value={digit}
              onChangeText={(val) => handleCodeChange(index, val)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={6} // Allow paste
              textContentType="oneTimeCode"
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyBtn, isLoading && styles.verifyBtnDisabled]}
          onPress={() => handleVerify()}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify & Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resendCountdown > 0}>
            <Text style={[styles.resendLink, resendCountdown > 0 && styles.resendLinkDisabled]}>
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  backBtn: { position: 'absolute', top: 60, left: Spacing.lg, zIndex: 10 },
  backText: { color: Colors.accent, fontSize: FontSizes.bodyLarge, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  lockIcon: { fontSize: 56, marginBottom: Spacing.sm },
  title: { fontSize: FontSizes.title, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSizes.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22 },
  identifierText: { color: Colors.accent, fontWeight: '700' },
  hintBox: {
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  hintLabel: { fontSize: FontSizes.caption, color: Colors.primaryLight, marginBottom: Spacing.xs },
  hintCode: { fontSize: 32, fontWeight: '900', color: Colors.accentOrange, letterSpacing: 8 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: Colors.bgInput,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.bgCardHover,
  },
  otpInputError: {
    borderColor: Colors.danger,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: { color: Colors.danger, fontSize: FontSizes.body, textAlign: 'center' },
  verifyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnText: { color: Colors.textPrimary, fontSize: FontSizes.bodyLarge, fontWeight: '700' },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendPrompt: { color: Colors.textSecondary, fontSize: FontSizes.body },
  resendLink: { color: Colors.accent, fontSize: FontSizes.body, fontWeight: '700' },
  resendLinkDisabled: { color: Colors.textMuted },
});
