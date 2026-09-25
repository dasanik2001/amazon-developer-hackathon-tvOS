import React, { useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onNavigateRegister: () => void;
  onNavigateForgot: () => void;
  onNavigateOtp: (challengeId: string, otpHint?: string, identifier?: string) => void;
}

export default function LoginScreen({ onNavigateRegister, onNavigateForgot, onNavigateOtp }: LoginScreenProps) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please fill in all fields');
      shake();
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(identifier.trim(), password);
      if (result.success && result.challenge_id) {
        onNavigateOtp(result.challenge_id, result.otp_hint, identifier.trim());
      } else {
        setError(result.error || 'Login failed');
        shake();
      }
    } catch {
      setError('Network error. Please check your connection.');
      shake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoIcon}>🛡️</Text>
          <Text style={styles.logoText}>Family TV Guardian</Text>
          <Text style={styles.tagline}>AI Viewing Intelligence for Parents</Text>
        </View>

        {/* Login Form */}
        <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to monitor your child's viewing</Text>

          {/* Email / Phone Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !isPhoneMode && styles.toggleBtnActive]}
              onPress={() => { setIsPhoneMode(false); setIdentifier(''); }}
            >
              <Text style={[styles.toggleText, !isPhoneMode && styles.toggleTextActive]}>📧 Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, isPhoneMode && styles.toggleBtnActive]}
              onPress={() => { setIsPhoneMode(true); setIdentifier(''); }}
            >
              <Text style={[styles.toggleText, isPhoneMode && styles.toggleTextActive]}>📱 Phone</Text>
            </TouchableOpacity>
          </View>

          {/* Identifier Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{isPhoneMode ? 'Phone Number' : 'Email Address'}</Text>
            <TextInput
              style={styles.input}
              placeholder={isPhoneMode ? '+1 234 567 8900' : 'parent@example.com'}
              placeholderTextColor={Colors.textMuted}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType={isPhoneMode ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              autoComplete={isPhoneMode ? 'tel' : 'email'}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity onPress={onNavigateForgot} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In with 2FA 🔐</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateRegister}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Footer */}
        <Text style={styles.footer}>Protected by 2-Factor Authentication</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoIcon: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  logoText: {
    fontSize: FontSizes.headline,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  formCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: FontSizes.title,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSurface,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: FontSizes.body,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: Colors.textPrimary,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    fontSize: FontSizes.bodyLarge,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  eyeText: {
    fontSize: 20,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotText: {
    color: Colors.accent,
    fontSize: FontSizes.body,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSizes.body,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.bodyLarge,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    color: Colors.textSecondary,
    fontSize: FontSizes.body,
  },
  registerLink: {
    color: Colors.accent,
    fontSize: FontSizes.body,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSizes.caption,
    marginTop: Spacing.xl,
  },
});
