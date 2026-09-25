import React, { useState, useRef, useEffect } from 'react';
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
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import BrandEmblem from '../../components/BrandEmblem';
import Icon, { IconName } from '../../components/Icon';

interface RegisterScreenProps {
  onNavigateLogin: () => void;
}

export default function RegisterScreen({ onNavigateLogin }: RegisterScreenProps) {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#DC2626', '#D97706', '#0284C7', '#059669'];

  const handleRegister = async () => {
    setError('');

    if (!displayName.trim()) { setError('Please enter your name'); return; }
    if (!identifier.trim()) { setError(`Please enter your ${isPhoneMode ? 'phone number' : 'email'}`); return; }
    if (!password) { setError('Please create a password'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (strength < 4) { setError('Password must meet all strength requirements'); return; }

    setIsLoading(true);
    try {
      const result = await register(identifier.trim(), password, displayName.trim());
      if (!result.success) {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const identifierIcon: IconName = isPhoneMode ? 'phone-portrait' : 'mail';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <BrandEmblem size={72} />
          <Text style={styles.title}>CREATE ACCOUNT</Text>
          <Text style={styles.subtitle}>Set up your Family TV Guardian profile</Text>
        </Animated.View>

        <View style={styles.formContainer}>
          {/* Display Name */}
          <View style={styles.inputWrapper}>
            <Icon name="person-outline" size={18} color={Colors.textMuted} style={styles.inputPrefixIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your Full Name"
              placeholderTextColor={Colors.textPlaceholder}
              value={displayName}
              onChangeText={(t) => { setDisplayName(t); setError(''); }}
              autoCapitalize="words"
              accessibilityLabel="Full name"
            />
          </View>

          {/* Segmented Mode Selector */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentBtn, !isPhoneMode && styles.segmentBtnActive]}
              onPress={() => { setIsPhoneMode(false); setIdentifier(''); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: !isPhoneMode }}
            >
              <Text style={[styles.segmentText, !isPhoneMode && styles.segmentTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, isPhoneMode && styles.segmentBtnActive]}
              onPress={() => { setIsPhoneMode(true); setIdentifier(''); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isPhoneMode }}
            >
              <Text style={[styles.segmentText, isPhoneMode && styles.segmentTextActive]}>Mobile</Text>
            </TouchableOpacity>
          </View>

          {/* Identifier */}
          <View style={styles.inputWrapper}>
            <Icon name={identifierIcon} size={18} color={Colors.textMuted} style={styles.inputPrefixIcon} />
            <TextInput
              style={styles.input}
              placeholder={isPhoneMode ? '+1 555 123 4567' : 'parent@example.com'}
              placeholderTextColor={Colors.textPlaceholder}
              value={identifier}
              onChangeText={(t) => { setIdentifier(t); setError(''); }}
              keyboardType={isPhoneMode ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              accessibilityLabel={isPhoneMode ? 'Phone number' : 'Email address'}
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Icon name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputPrefixIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 36 }]}
              placeholder="Min 8 chars, uppercase, digit, symbol"
              placeholderTextColor={Colors.textPlaceholder}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Password Strength Meter */}
          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBarBg}>
                <View
                  style={[
                    styles.strengthBarFill,
                    {
                      width: `${(strength / 4) * 100}%`,
                      backgroundColor: strengthColors[strength - 1] || '#DC2626',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.strengthLabel,
                  { color: strengthColors[strength - 1] || '#DC2626' },
                ]}
              >
                {strengthLabels[strength - 1] || 'Very Weak'}
              </Text>
            </View>
          )}

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Icon name="shield-checkmark-outline" size={18} color={Colors.textMuted} style={styles.inputPrefixIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={Colors.textPlaceholder}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleRegister}
              returnKeyType="go"
              accessibilityLabel="Confirm password"
            />
          </View>

          {confirmPassword.length > 0 && password !== confirmPassword && (
            <View style={styles.mismatchRow}>
              <Icon name="alert-circle" size={13} color={Colors.danger} />
              <Text style={styles.mismatchText}>Passwords do not match</Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="alert-circle" size={17} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateLogin} accessibilityRole="link">
              <Text style={styles.registerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 3.5,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 54,
    marginBottom: Spacing.md,
  },
  inputPrefixIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: FontSizes.bodyLarge,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSurface,
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    minHeight: 40,
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  segmentText: {
    fontSize: FontSizes.body,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: Spacing.md,
    gap: 8,
    paddingHorizontal: Spacing.xs,
  },
  strengthBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.bgSurface,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  strengthBarFill: {
    height: 6,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: FontSizes.caption,
    fontWeight: '700',
    minWidth: 68,
    textAlign: 'right',
  },
  mismatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  mismatchText: {
    color: Colors.danger,
    fontSize: FontSizes.caption,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    flexShrink: 1,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
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
    color: Colors.primary,
    fontSize: FontSizes.body,
    fontWeight: '800',
  },
});
