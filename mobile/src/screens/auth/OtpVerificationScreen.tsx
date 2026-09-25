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
        {/* Back Button */}
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Lock Screen Header (Matches Screen 5 in Reference Image) */}
        <View style={styles.header}>
          <View style={styles.lockBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          <Text style={styles.title}>TWO-FACTOR PIN</Text>
          <Text style={styles.subtitle}>
            Enter 6-digit verification code sent to{'\n'}
            <Text style={styles.identifierText}>{identifier || 'your registered contact'}</Text>
          </Text>
        </View>

        {/* Dev Mode Hint */}
        {currentHint && (
          <Animated.View style={[styles.hintBox, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.hintLabel}>🧪 Dev Mode Code:</Text>
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
              maxLength={6}
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

        {/* Radiant Hot Pink CTA Button */}
        <TouchableOpacity
          style={[styles.heroPinkBtn, isLoading && styles.btnDisabled]}
          onPress={() => handleVerify()}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.heroPinkBtnText}>Verify & Authorize</Text>
          )}
        </TouchableOpacity>

        {/* 1-Tap Fill Test Code (Reference Outline Pill) */}
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
        >
          <Text style={styles.outlinePillText}>⚡ 1-Tap Fill Test Code ({currentHint || '123456'})</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#351B68',
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: FontSizes.body,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  lockBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.pinkGlow,
  },
  lockIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: FontSizes.headline,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  identifierText: {
    color: '#FA2E67',
    fontWeight: '800',
  },
  hintBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.pill,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  hintLabel: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  hintCode: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FBBF24',
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  otpInputFilled: {
    borderColor: '#FA2E67',
    backgroundColor: 'rgba(250, 46, 103, 0.2)',
  },
  otpInputError: {
    borderColor: Colors.danger,
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  errorText: {
    color: '#FFA8A8',
    fontSize: FontSizes.body,
    textAlign: 'center',
  },
  heroPinkBtn: {
    backgroundColor: '#FA2E67',
    borderRadius: BorderRadius.pill,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.pinkGlow,
    marginBottom: Spacing.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  heroPinkBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.bodyLarge,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  outlinePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: BorderRadius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  outlinePillText: {
    color: '#FFFFFF',
    fontSize: FontSizes.caption,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    color: '#FA2E67',
    fontSize: FontSizes.body,
    fontWeight: '800',
  },
  resendLinkDisabled: {
    color: Colors.textMuted,
  },
});
