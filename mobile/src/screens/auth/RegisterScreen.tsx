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
import { useAuth } from '../../context/AuthContext';
import BrandEmblem from '../../components/BrandEmblem';

interface RegisterScreenProps {
  onNavigateLogin: () => void;
  onNavigateOtp: (challengeId: string, otpHint?: string, identifier?: string) => void;
}

export default function RegisterScreen({ onNavigateLogin, onNavigateOtp }: RegisterScreenProps) {
  const { register, login } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
  const strengthColors = ['#F87171', '#FBBF24', '#38BDF8', '#34D399'];

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
      if (result.success) {
        const loginResult = await login(identifier.trim(), password);
        if (loginResult.success && loginResult.challenge_id) {
          onNavigateOtp(loginResult.challenge_id, loginResult.otp_hint, identifier.trim());
        }
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError('Network error. Please check your connection.');
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero */}
        <View style={styles.header}>
          <BrandEmblem size={76} />
          <Text style={styles.title}>CREATE ACCOUNT</Text>
          <Text style={styles.subtitle}>Set up your Family TV Guardian parent profile</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Display Name Capsule */}
          <View style={styles.capsuleInputWrapper}>
            <Text style={styles.inputPrefixIcon}>👤</Text>
            <TextInput
              style={styles.capsuleInput}
              placeholder="Your Full Name"
              placeholderTextColor={Colors.textPlaceholder}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          {/* Segmented Mode Selector */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentBtn, !isPhoneMode && styles.segmentBtnActive]}
              onPress={() => { setIsPhoneMode(false); setIdentifier(''); }}
            >
              <Text style={[styles.segmentText, !isPhoneMode && styles.segmentTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, isPhoneMode && styles.segmentBtnActive]}
              onPress={() => { setIsPhoneMode(true); setIdentifier(''); }}
            >
              <Text style={[styles.segmentText, isPhoneMode && styles.segmentTextActive]}>Mobile</Text>
            </TouchableOpacity>
          </View>

          {/* Identifier Capsule */}
          <View style={styles.capsuleInputWrapper}>
            <Text style={styles.inputPrefixIcon}>{isPhoneMode ? '📱' : '📧'}</Text>
            <TextInput
              style={styles.capsuleInput}
              placeholder={isPhoneMode ? '+1 555 123 4567' : 'parent@example.com'}
              placeholderTextColor={Colors.textPlaceholder}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType={isPhoneMode ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
            />
          </View>

          {/* Password Capsule */}
          <View style={styles.capsuleInputWrapper}>
            <Text style={styles.inputPrefixIcon}>🔒</Text>
            <TextInput
              style={[styles.capsuleInput, { paddingRight: 36 }]}
              placeholder="Min 8 chars, uppercase, digit, symbol"
              placeholderTextColor={Colors.textPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.capsuleEyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
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
                      backgroundColor: strengthColors[strength - 1] || Colors.danger,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.strengthLabel,
                  { color: strengthColors[strength - 1] || Colors.danger },
                ]}
              >
                {strengthLabels[strength - 1] || 'Very Weak'}
              </Text>
            </View>
          )}

          {/* Confirm Password Capsule */}
          <View style={styles.capsuleInputWrapper}>
            <Text style={styles.inputPrefixIcon}>🛡️</Text>
            <TextInput
              style={styles.capsuleInput}
              placeholder="Confirm Password"
              placeholderTextColor={Colors.textPlaceholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={styles.mismatchText}>⚠️ Passwords do not match</Text>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Hero Pink CTA Button */}
          <TouchableOpacity
            style={[styles.heroPinkBtn, isLoading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.heroPinkBtnText}>Complete Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateLogin}>
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
    backgroundColor: '#351B68',
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
    fontSize: FontSizes.headline,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: Spacing.md,
  },
  capsuleInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: Spacing.md,
    height: 52,
    marginBottom: Spacing.md,
  },
  inputPrefixIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  capsuleInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: FontSizes.bodyLarge,
  },
  capsuleEyeBtn: {
    position: 'absolute',
    right: 16,
  },
  eyeIcon: {
    fontSize: 18,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.pill,
    padding: 3,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.pill,
  },
  segmentBtnActive: {
    backgroundColor: '#FA2E67',
  },
  segmentText: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
    marginBottom: Spacing.md,
    gap: 8,
    paddingHorizontal: Spacing.sm,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
  mismatchText: {
    color: '#FFA8A8',
    fontSize: FontSizes.caption,
    marginTop: -8,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
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
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
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
    color: '#FA2E67',
    fontSize: FontSizes.body,
    fontWeight: '800',
  },
});
