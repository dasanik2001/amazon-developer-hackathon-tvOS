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
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/client';
import Icon from '../../components/Icon';

interface OtpVerificationScreenProps {
  challengeId: string;
  otpHint?: string;
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

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

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
      const digits = value.replace(/\D/g, '').split('').slice(0, 6);
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();

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
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="link">
          <Icon name="arrow-back" size={18} color={Colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.lockBadge}>
            <Icon name="shield-checkmark" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>EMAIL VERIFICATION</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit verification code sent to{'\n'}
            <Text style={styles.identifierText}>{identifier || 'your email'}</Text>
          </Text>
        </View>

        {currentHint && (
          <Animated.View style={[styles.hintBox, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.hintLabelRow}>
              <Icon name="flask-outline" size={13} color={Colors.info} />
              <Text style={styles.hintLabel}>Dev Mode Code</Text>
            </View>
            <Text style={styles.hintCode}>{currentHint}</Text>
          </Animated.View>
        )}

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
              maxLength={6}
              textContentType="oneTimeCode"
              autoFocus={index === 0}
              accessibilityLabel={`Digit ${index + 1}`}
            />
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox} accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Icon name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
          onPress={() => handleVerify()}
          disabled={isLoading}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Verify & Authorize</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlinePill}
          onPress={() => {
            const fillCode = currentHint || '123456';
            const digits = fillCode.split('').slice(0, 6);
            setCode(digits);
            handleVerify(fillCode);
          }}
          disabled={isLoading}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.outlinePillRow}>
            <Icon name="flash" size={14} color={Colors.primary} />
            <Text style={styles.outlinePillText}>1-Tap Fill Test Code ({currentHint || '123456'})</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resendCountdown > 0} accessibilityRole="button">
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
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: Spacing.lg,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 40,
    ...Shadows.card,
  },
  backText: {
    color: Colors.primary,
    fontSize: FontSizes.body,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  lockBadge: {
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
  title: {
    fontSize: FontSizes.headline,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2.5,
  },
  subtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  identifierText: {
    color: Colors.primary,
    fontWeight: '800',
  },
  hintBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  hintLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  hintLabel: {
    fontSize: FontSizes.caption,
    color: Colors.info,
    fontWeight: '700',
  },
  hintCode: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 6,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tintBlue,
  },
  otpInputError: {
    borderColor: Colors.danger,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.tintRed,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: FontSizes.body,
    fontWeight: '600',
    flexShrink: 1,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
    marginBottom: Spacing.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.bodyLarge,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  outlinePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.full,
    minHeight: 46,
    justifyContent: 'center',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  outlinePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  outlinePillText: {
    color: Colors.primary,
    fontSize: FontSizes.caption,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendPrompt: {
    color: Colors.textSecondary,
    fontSize: FontSizes.body,
  },
  resendLink: {
    color: Colors.primary,
    fontSize: FontSizes.body,
    fontWeight: '800',
  },
  resendLinkDisabled: {
    color: Colors.textMuted,
  },
});
