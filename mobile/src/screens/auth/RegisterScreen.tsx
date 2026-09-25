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
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

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

  // Password strength
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
  const strengthColors = [Colors.danger, Colors.warning, Colors.info, Colors.success];

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
        // Auto-login after registration
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
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoIcon}>🛡️</Text>
          <Text style={styles.logoText}>Create Account</Text>
          <Text style={styles.tagline}>Set up your Family TV Guardian parent account</Text>
        </View>

        <View style={styles.formCard}>
          {/* Display Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Priya Sharma"
              placeholderTextColor={Colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

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

          {/* Identifier */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{isPhoneMode ? 'Phone Number' : 'Email Address'}</Text>
            <TextInput
              style={styles.input}
              placeholder={isPhoneMode ? '+91 98765 43210' : 'parent@example.com'}
              placeholderTextColor={Colors.textMuted}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType={isPhoneMode ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Create Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Min 8 chars, uppercase, digit, symbol"
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
                <Text style={{ fontSize: 20 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Password Strength Meter */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarBg}>
                  <View
                    style={[
                      styles.strengthBarFill,
                      { width: `${(strength / 4) * 100}%`, backgroundColor: strengthColors[strength - 1] || Colors.danger },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColors[strength - 1] || Colors.danger }]}>
                  {strengthLabels[strength - 1] || 'Very Weak'}
                </Text>
              </View>
            )}

            {/* Requirements Checklist */}
            {password.length > 0 && (
              <View style={styles.requirementsList}>
                <Text style={[styles.req, password.length >= 8 && styles.reqMet]}>
                  {password.length >= 8 ? '✅' : '⬜'} At least 8 characters
                </Text>
                <Text style={[styles.req, /[A-Z]/.test(password) && styles.reqMet]}>
                  {/[A-Z]/.test(password) ? '✅' : '⬜'} One uppercase letter
                </Text>
                <Text style={[styles.req, /[0-9]/.test(password) && styles.reqMet]}>
                  {/[0-9]/.test(password) ? '✅' : '⬜'} One digit
                </Text>
                <Text style={[styles.req, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) && styles.reqMet]}>
                  {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✅' : '⬜'} One special character
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.mismatchText}>Passwords don't match</Text>
            )}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account 🚀</Text>
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
  container: { flex: 1, backgroundColor: Colors.bgDark },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  logoIcon: { fontSize: 48, marginBottom: Spacing.xs },
  logoText: { fontSize: FontSizes.title, fontWeight: '800', color: Colors.textPrimary },
  tagline: { fontSize: FontSizes.body, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  formCard: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontSize: FontSizes.caption, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md - 2, fontSize: FontSizes.bodyLarge, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  toggleRow: { flexDirection: 'row', backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.md, padding: 3, marginBottom: Spacing.lg },
  toggleBtn: { flex: 1, paddingVertical: Spacing.sm + 2, alignItems: 'center', borderRadius: BorderRadius.sm },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: FontSizes.body, color: Colors.textMuted, fontWeight: '600' },
  toggleTextActive: { color: Colors.textPrimary },
  passwordRow: { position: 'relative' as const },
  eyeBtn: { position: 'absolute' as const, right: 12, top: 12 },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: 8 },
  strengthBarBg: { flex: 1, height: 4, backgroundColor: Colors.bgSurface, borderRadius: 2, overflow: 'hidden' as const },
  strengthBarFill: { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: FontSizes.caption, fontWeight: '600' },
  requirementsList: { marginTop: Spacing.sm, gap: 2 },
  req: { fontSize: FontSizes.caption, color: Colors.textMuted },
  reqMet: { color: Colors.success },
  mismatchText: { color: Colors.danger, fontSize: FontSizes.caption, marginTop: Spacing.xs },
  errorBox: { backgroundColor: 'rgba(255, 107, 107, 0.15)', borderRadius: BorderRadius.sm, padding: Spacing.sm + 2, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.3)' },
  errorText: { color: Colors.danger, fontSize: FontSizes.body, textAlign: 'center' },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', marginBottom: Spacing.md },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: Colors.textPrimary, fontSize: FontSizes.bodyLarge, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerPrompt: { color: Colors.textSecondary, fontSize: FontSizes.body },
  registerLink: { color: Colors.accent, fontSize: FontSizes.body, fontWeight: '700' },
});
