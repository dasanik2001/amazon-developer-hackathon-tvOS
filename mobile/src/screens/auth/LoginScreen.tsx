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
import {
  getBaseUrl,
  setCustomServerUrl,
  testServerConnection,
  DEFAULT_SERVER_URL,
} from '../../api/client';
import BrandEmblem from '../../components/BrandEmblem';
import Icon, { IconName } from '../../components/Icon';

interface LoginScreenProps {
  onNavigateRegister: () => void;
  onNavigateForgot: () => void;
  onNavigateOtp?: (data: { challengeId: string; otpHint?: string; identifier: string }) => void;
}

export default function LoginScreen({ onNavigateRegister, onNavigateForgot, onNavigateOtp }: LoginScreenProps) {
  const { login, demoLogin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBypassing, setIsBypassing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Server Network Modal State
  const [serverUrl, setServerUrl] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverStatus, setServerStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [serverLatency, setServerLatency] = useState<number | undefined>();
  const [serverErrorMsg, setServerErrorMsg] = useState('');

  useEffect(() => {
    loadServerConfig();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
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
    setSuccessMsg('');
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your credentials');
      shake();
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(identifier.trim(), password);
      if (result.success) {
        if (result.requires_2fa && result.challenge_id && onNavigateOtp) {
          onNavigateOtp({
            challengeId: result.challenge_id,
            otpHint: result.otp_hint,
            identifier: identifier.trim(),
          });
          return;
        }
        setSuccessMsg('Welcome back. Signing you in.');
      } else {
        setError(result.error || 'Login failed');
        shake();
      }
    } catch {
      setError('Cannot reach server. Tap the server pill above.');
      shake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantBypass = async (targetId?: string) => {
    setError('');
    setSuccessMsg('');
    setIsBypassing(true);
    try {
      const result = await demoLogin(targetId || 'parent.test@guardian.family');
      if (result.success) {
        setSuccessMsg('Instant access granted.');
      } else {
        setError(result.error || 'Auth bypass failed. Check server connection.');
        shake();
      }
    } catch {
      setError('Cannot reach backend. Tap server pill to configure IP.');
      shake();
    } finally {
      setIsBypassing(false);
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

        {/* Brand Hero */}
        <Animated.View style={[styles.brandHero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <BrandEmblem size={88} />
          <Text style={styles.brandTitle}>GUARDIAN</Text>
          <Text style={styles.brandSubtitle}>AI Parental Intelligence for Fire TV</Text>
        </Animated.View>

        {/* Form Container */}
        <Animated.View style={[styles.formContainer, { transform: [{ translateX: shakeAnim }] }]}>
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
              <Text style={[styles.segmentText, isPhoneMode && styles.segmentTextActive]}>Phone</Text>
            </TouchableOpacity>
          </View>

          {/* Identifier Input */}
          <View style={styles.inputWrapper}>
            <Icon name={identifierIcon} size={18} color={Colors.textMuted} style={styles.inputPrefixIcon} />
            <TextInput
              style={styles.input}
              placeholder={isPhoneMode ? '+15551234567' : 'parent.test@guardian.family'}
              placeholderTextColor={Colors.textPlaceholder}
              value={identifier}
              onChangeText={(t) => { setIdentifier(t); setError(''); }}
              keyboardType={isPhoneMode ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              autoComplete={isPhoneMode ? 'tel' : 'email'}
              accessibilityLabel={isPhoneMode ? 'Phone number' : 'Email address'}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Icon name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputPrefixIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor={Colors.textPlaceholder}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
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

          {/* Forgot Password */}
          <TouchableOpacity onPress={onNavigateForgot} style={styles.forgotBtn} accessibilityRole="link">
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Success Banner */}
          {successMsg ? (
            <View style={styles.successBox} accessible accessibilityLiveRegion="polite">
              <Icon name="checkmark-circle" size={17} color={Colors.success} />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox} accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
              <Icon name="alert-circle" size={17} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, (isLoading || isBypassing) && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading || isBypassing}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Clean 1-Tap Bypass Button */}
          <TouchableOpacity
            style={[styles.smallBypassBtn, isBypassing && styles.btnDisabled]}
            onPress={() => handleInstantBypass('parent.test@guardian.family')}
            disabled={isBypassing || isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="1-tap sign in bypass with test account"
          >
            {isBypassing ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <View style={styles.inlineCenter}>
                <Icon name="flash" size={14} color={Colors.primary} />
                <Text style={styles.smallBypassText}>1-Tap Sign-In with Demo Email</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Demo credentials hint */}
          <Text style={styles.demoHint}>
            Test: <Text style={styles.codeText}>parent.test@guardian.family</Text> / <Text style={styles.codeText}>Password123!</Text>
          </Text>

          {/* Bottom Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateRegister} accessibilityRole="link">
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Security Note */}
        <View style={styles.footerNote}>
          <Icon name="lock-closed" size={11} color={Colors.textMuted} />
          <Text style={styles.footerNoteText}>Encrypted session • You stay signed in on this device</Text>
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
              placeholder="http://192.168.0.4:3001"
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
                onPress={() => setServerUrl(DEFAULT_SERVER_URL)}
                accessibilityRole="button"
              >
                <Text style={styles.modalSecondaryBtnText}>Default</Text>
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
  inlineCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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

  brandHero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 6,
    marginTop: Spacing.md,
  },
  brandSubtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  smallBypassBtn: {
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.tintBlue,
    borderWidth: 1,
    borderColor: Colors.tintBlueStrong,
    borderRadius: BorderRadius.full,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginBottom: Spacing.sm,
    alignSelf: 'center',
  },
  smallBypassText: {
    color: Colors.primary,
    fontSize: FontSizes.caption,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Main Form Area
  formContainer: {
    marginBottom: Spacing.md,
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

  // Inputs
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
  passwordInput: {
    paddingRight: 36,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
    paddingRight: Spacing.xs,
    minHeight: 24,
    justifyContent: 'center',
  },
  forgotText: {
    color: Colors.primary,
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.tintGreen,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  successText: {
    color: '#047857',
    fontSize: FontSizes.body,
    fontWeight: '600',
    flexShrink: 1,
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

  // Primary CTA
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
    marginBottom: Spacing.sm,
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
  demoHint: {
    fontSize: FontSizes.caption - 1,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  codeText: {
    color: Colors.textSecondary,
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
    color: Colors.primary,
    fontSize: FontSizes.body,
    fontWeight: '800',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  footerNoteText: {
    color: Colors.textMuted,
    fontSize: 11,
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
    fontSize: FontSizes.body,
    fontWeight: '800',
  },
});
