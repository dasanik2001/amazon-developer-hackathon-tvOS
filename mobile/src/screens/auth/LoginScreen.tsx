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

interface LoginScreenProps {
  onNavigateRegister: () => void;
  onNavigateForgot: () => void;
  onNavigateOtp: (challengeId: string, otpHint?: string, identifier?: string) => void;
}

export default function LoginScreen({ onNavigateRegister, onNavigateForgot, onNavigateOtp }: LoginScreenProps) {
  const { login, demoLogin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBypassing, setIsBypassing] = useState(false);
  const [error, setError] = useState('');
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Server Network Modal State
  const [serverUrl, setServerUrl] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverStatus, setServerStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [serverLatency, setServerLatency] = useState<number | undefined>();
  const [serverErrorMsg, setServerErrorMsg] = useState('');

  useEffect(() => {
    loadServerConfig();
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
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your credentials');
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
      setError('Cannot reach server. Tap the server pill above.');
      shake();
    } finally {
      setIsLoading(false);
    }
  };

  // ⚡ 1-Tap Auth Bypass: Instantly logs in directly without 2FA
  const handleInstantBypass = async (targetId?: string) => {
    setError('');
    setIsBypassing(true);
    try {
      const result = await demoLogin(targetId || identifier.trim() || undefined);
      if (!result.success) {
        setError(result.error || 'Auth bypass failed. Check server connection.');
        shake();
      }
    } catch (err: any) {
      setError('Cannot reach backend. Tap server pill to configure IP.');
      shake();
    } finally {
      setIsBypassing(false);
    }
  };

  const handleFillTestEmail = () => {
    setIsPhoneMode(false);
    setIdentifier('parent.test@guardian.family');
    setPassword('Password123!');
    setError('');
  };

  const handleFillTestPhone = () => {
    setIsPhoneMode(true);
    setIdentifier('+15551234567');
    setPassword('Password123!');
    setError('');
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
          <Text style={styles.serverGearIcon}>⚙️</Text>
        </TouchableOpacity>

        {/* Hero Geometric Emblem (From Reference Image) */}
        <View style={styles.brandHero}>
          <BrandEmblem size={88} />
          <Text style={styles.brandTitle}>GUARDIAN</Text>
          <Text style={styles.brandSubtitle}>AI Parental Intelligence for Fire TV</Text>
        </View>

        {/* 🧪 Testing & Demo Hub (Reference-style outline pills) */}
        <View style={styles.demoCard}>
          <View style={styles.demoHeader}>
            <Text style={styles.demoTitle}>⚡ QUICK TEST & BYPASS</Text>
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>DEMO</Text>
            </View>
          </View>

          {/* Quick-fill Outline Pills (matches Screen 3 "Connect with...") */}
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={styles.outlinePill}
              onPress={handleFillTestEmail}
              activeOpacity={0.7}
            >
              <Text style={styles.pillIcon}>📧</Text>
              <Text style={styles.outlinePillText}>Email Demo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlinePill}
              onPress={handleFillTestPhone}
              activeOpacity={0.7}
            >
              <Text style={styles.pillIcon}>📱</Text>
              <Text style={styles.outlinePillText}>Phone Demo</Text>
            </TouchableOpacity>
          </View>

          {/* ⚡ 1-Tap Instant Auth Bypass */}
          <TouchableOpacity
            style={[styles.instantBypassPill, isBypassing && styles.btnDisabled]}
            onPress={() => handleInstantBypass()}
            disabled={isBypassing || isLoading}
            activeOpacity={0.8}
          >
            {isBypassing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.instantBypassText}>⚡ 1-Tap Instant Sign-In (Skip 2FA)</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Container */}
        <Animated.View style={[styles.formContainer, { transform: [{ translateX: shakeAnim }] }]}>
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
              <Text style={[styles.segmentText, isPhoneMode && styles.segmentTextActive]}>Phone</Text>
            </TouchableOpacity>
          </View>

          {/* Identifier Input (Capsule shape like Reference) */}
          <View style={styles.capsuleInputWrapper}>
            <Text style={styles.inputPrefixIcon}>{isPhoneMode ? '📱' : '📧'}</Text>
            <TextInput
              style={styles.capsuleInput}
              placeholder={isPhoneMode ? '+15551234567' : 'parent.test@guardian.family'}
              placeholderTextColor={Colors.textPlaceholder}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType={isPhoneMode ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              autoComplete={isPhoneMode ? 'tel' : 'email'}
            />
          </View>

          {/* Password Input (Capsule shape like Reference) */}
          <View style={styles.capsuleInputWrapper}>
            <Text style={styles.inputPrefixIcon}>🔒</Text>
            <TextInput
              style={[styles.capsuleInput, styles.passwordCapsuleInput]}
              placeholder="Password123!"
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

          {/* Forgot Password */}
          <TouchableOpacity onPress={onNavigateForgot} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Radiant Hot Pink CTA Button (Like Reference "Touch" / "Next") */}
          <TouchableOpacity
            style={[styles.heroPinkBtn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading || isBypassing}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.heroPinkBtnText}>Sign In with 2FA</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.masterOtpPrompt}>
            Master 2FA code: <Text style={styles.codeText}>123456</Text> (accepted anywhere)
          </Text>

          {/* Bottom Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateRegister}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Security & 30-Day Persistence Note */}
        <Text style={styles.footerNote}>
          🔒 30-Day Persistent JWT • Session stays signed in across restarts
        </Text>
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
            <Text style={styles.modalTitle}>🌐 Backend Host Settings</Text>
            <Text style={styles.modalSubtitle}>
              Connect over local Wi-Fi or cloud tunnel without hardcoded localhost:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.0.102:3001"
              placeholderTextColor={Colors.textPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestPing}
              disabled={serverStatus === 'checking'}
            >
              {serverStatus === 'checking' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.testBtnText}>
                  {serverStatus === 'connected' ? `✅ Connected (${serverLatency}ms)` : '📡 Ping Backend Host'}
                </Text>
              )}
            </TouchableOpacity>

            {serverErrorMsg ? (
              <Text style={styles.modalErrorText}>❌ {serverErrorMsg}</Text>
            ) : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setServerUrl(DEFAULT_SERVER_URL)}
              >
                <Text style={styles.modalSecondaryBtnText}>Default</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSaveServer}
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
    backgroundColor: '#351B68', // Deep Royal Violet from reference
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
    gap: 8,
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
    color: '#FFFFFF',
    fontSize: FontSizes.caption,
    fontWeight: '600',
    maxWidth: 220,
  },
  serverGearIcon: {
    fontSize: 12,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  brandTitle: {
    fontSize: FontSizes.headline,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginTop: Spacing.md,
  },
  brandSubtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // 🧪 Quick Test & Demo Hub (Reference-style outline pills)
  demoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: Spacing.lg,
  },
  demoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  demoTitle: {
    fontSize: FontSizes.caption,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  demoBadge: {
    backgroundColor: '#FA2E67',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  outlinePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    gap: 6,
  },
  pillIcon: {
    fontSize: 14,
  },
  outlinePillText: {
    color: '#FFFFFF',
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
  instantBypassPill: {
    backgroundColor: 'rgba(250, 46, 103, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FA2E67',
    borderRadius: BorderRadius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantBypassText: {
    color: '#FFFFFF',
    fontSize: FontSizes.body,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Main Form Area
  formContainer: {
    marginBottom: Spacing.md,
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

  // Capsule Inputs from Reference
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
  passwordCapsuleInput: {
    paddingRight: 36,
  },
  capsuleEyeBtn: {
    position: 'absolute',
    right: 16,
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
    paddingRight: Spacing.xs,
  },
  forgotText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.caption,
    fontWeight: '600',
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

  // Radiant Hot Pink Hero Button (matches "Touch" / "Next" from Reference)
  heroPinkBtn: {
    backgroundColor: '#FA2E67',
    borderRadius: BorderRadius.pill,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.pinkGlow,
    marginBottom: Spacing.xs,
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
  masterOtpPrompt: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  codeText: {
    color: '#FBBF24',
    fontWeight: '800',
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
  footerNote: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.md,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 6, 32, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#351B68',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSizes.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSizes.body,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: Spacing.sm,
  },
  testBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.pill,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
  modalErrorText: {
    color: '#FFA8A8',
    fontSize: FontSizes.caption,
    marginBottom: Spacing.sm,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalSecondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.body,
  },
  modalPrimaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.pill,
    backgroundColor: '#FA2E67',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.body,
    fontWeight: '800',
  },
});
