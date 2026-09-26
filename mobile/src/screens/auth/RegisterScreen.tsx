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
  Modal,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import BrandEmblem from '../../components/BrandEmblem';
import Icon, { IconName } from '../../components/Icon';
import { getBaseUrl, setCustomServerUrl, testServerConnection } from '../../api/client';

interface RegisterScreenProps {
  onNavigateLogin: () => void;
  onNavigateOtp?: (data: { challengeId: string; otpHint?: string; identifier: string }) => void;
}

export default function RegisterScreen({ onNavigateLogin, onNavigateOtp }: RegisterScreenProps) {
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

  // Server Host Config State
  const [serverUrl, setServerUrl] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverStatus, setServerStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [serverLatency, setServerLatency] = useState<number | undefined>();
  const [serverErrorMsg, setServerErrorMsg] = useState('');

  useEffect(() => {
    loadServerConfig();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadServerConfig = async () => {
    const url = await getBaseUrl();
    setServerUrl(url);
    const check = await testServerConnection(url);
    if (check.success) {
      setServerStatus('connected');
      setServerLatency(check.latencyMs);
    } else {
      setServerStatus('error');
    }
  };

  const handleTestPing = async () => {
    setServerStatus('checking');
    setServerErrorMsg('');
    const res = await testServerConnection(serverUrl);
    if (res.success) {
      setServerStatus('connected');
      setServerLatency(res.latencyMs);
    } else {
      setServerStatus('error');
      setServerErrorMsg(res.error || 'Failed to connect');
    }
  };

  const handleSaveServer = async () => {
    await setCustomServerUrl(serverUrl);
    setShowServerModal(false);
    handleTestPing();
  };

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
      if (result.success) {
        if (result.requires_otp && result.challenge_id && onNavigateOtp) {
          onNavigateOtp({
            challengeId: result.challenge_id,
            otpHint: result.otp_hint,
            identifier: identifier.trim(),
          });
          return;
        }
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError(`Cannot reach backend server. Tap the server settings pill above to verify connection.`);
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
        {/* Dynamic Server Host Pill */}
        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => setShowServerModal(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Backend host settings"
        >
          <View
            style={[
              styles.statusDot,
              serverStatus === 'connected' && styles.statusDotGreen,
              serverStatus === 'error' && styles.statusDotRed,
            ]}
          />
          <Text style={styles.serverPillText} numberOfLines={1}>
            {serverUrl ? serverUrl.replace(/^https?:\/\//, '') : 'Set Server Host'}
            {serverLatency ? ` (${serverLatency}ms)` : ''}
          </Text>
          <Icon name="settings" size={13} color={Colors.textMuted} />
        </TouchableOpacity>

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
            <View style={styles.errorBox} accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
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

      {/* ─── Server Configuration Modal ─────────────────────────────────── */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalTitleIcon}>
                <Icon name="globe-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Backend Host Settings</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Connect over local Wi-Fi or cloud tunnel.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.0.100:3001"
              placeholderTextColor={Colors.textPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Backend host URL"
            />

            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestPing}
              disabled={serverStatus === 'checking'}
              accessibilityRole="button"
            >
              {serverStatus === 'checking' ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <View style={styles.inlineCenter}>
                  <Icon
                    name={serverStatus === 'connected' ? 'checkmark-circle' : 'radio-button-off'}
                    size={15}
                    color={serverStatus === 'connected' ? Colors.success : Colors.primary}
                  />
                  <Text style={[styles.testBtnText, serverStatus === 'connected' && { color: Colors.success }]}>
                    {serverStatus === 'connected' ? `Connected (${serverLatency}ms)` : 'Ping Backend Host'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {serverErrorMsg ? (
              <View style={styles.modalErrorRow}>
                <Icon name="close-circle" size={14} color={Colors.danger} />
                <Text style={styles.modalErrorText}>{serverErrorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setShowServerModal(false)}
                accessibilityRole="button"
              >
                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSaveServer}
                accessibilityRole="button"
              >
                <Text style={styles.modalPrimaryBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  serverPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
    gap: 8,
    ...Shadows.card,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  statusDotGreen: {
    backgroundColor: Colors.success,
  },
  statusDotRed: {
    backgroundColor: Colors.danger,
  },
  serverPillText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.caption,
    fontWeight: '600',
    maxWidth: 220,
  },
  inlineCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
    gap: 10,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.bgSurface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: FontSizes.caption - 1,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  mismatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    maxWidth: 400,
    ...Shadows.raised,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.xs,
  },
  modalTitleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.tintBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: FontSizes.subtitle,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: Colors.bgSurface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSizes.body,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  testBtn: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.tintBlue,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.tintBlueStrong,
    marginBottom: Spacing.sm,
  },
  testBtnText: {
    color: Colors.primary,
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
  modalErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  modalErrorText: {
    color: Colors.danger,
    fontSize: FontSizes.caption,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalSecondaryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSecondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.body,
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
