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
}

export default function LoginScreen({ onNavigateRegister, onNavigateForgot }: LoginScreenProps) {
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
    // Entry animation
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

  // ─── Direct Sign In (No 2FA) ──────────────────────────────────────────
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
        setSuccessMsg('Welcome back! Signing you in…');
        // AuthContext sets user → App.tsx auto-navigates to MainNavigator
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

  // ⚡ 1-Tap Auth Bypass: Instantly logs in directly
  const handleInstantBypass = async (targetId?: string) => {
    setError('');
    setSuccessMsg('');
    setIsBypassing(true);
    try {
      const result = await demoLogin(targetId || identifier.trim() || undefined);
      if (result.success) {
        setSuccessMsg('⚡ Instant access granted!');
      } else {
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
    setSuccessMsg('');
  };

  const handleFillTestPhone = () => {
    setIsPhoneMode(true);
    setIdentifier('+15551234567');
    setPassword('Password123!');
    setError('');
    setSuccessMsg('');
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

        {/* Hero Geometric Emblem */}
        <Animated.View style={[styles.brandHero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <BrandEmblem size={88} />
          <Text style={styles.brandTitle}>GUARDIAN</Text>
          <Text style={styles.brandSubtitle}>AI Parental Intelligence for Fire TV</Text>
        </Animated.View>

        {/* 🧪 Testing & Demo Hub */}
        <View style={styles.demoCard}>
          <View style={styles.demoHeader}>
            <Text style={styles.demoTitle}>⚡ QUICK TEST & BYPASS</Text>
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>DEMO</Text>
            </View>
          </View>

          {/* Quick-fill Outline Pills */}
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
              <Text style={styles.instantBypassText}>⚡ 1-Tap Instant Sign-In</Text>
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

          {/* Identifier Input (Capsule) */}
          <View style={styles.capsuleInputWrapper}>
            <Text style={styles.inputPrefixIcon}>{isPhoneMode ? '📱' : '📧'}</Text>
            <TextInput
              style={styles.capsuleInput}
              placeholder={isPhoneMode ? '+15551234567' : 'parent.test@guardian.family'}
              placeholderTextColor={Colors.textPlaceholder}
              value={identifier}
              onChangeText={(t) => { setIdentifier(t); setError(''); }}
              keyboardType={isPhoneMode ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
              autoComplete={isPhoneMode ? 'tel' : 'email'}
            />
          </View>

          {/* Password Input (Capsule) */}
          <View style={styles.capsuleInputWrapper}>
            <Text style={styles.inputPrefixIcon}>🔒</Text>
            <TextInput
              style={[styles.capsuleInput, styles.passwordCapsuleInput]}
              placeholder="Password"
              placeholderTextColor={Colors.textPlaceholder}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
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

          {/* Success Banner */}
          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅ {successMsg}</Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Radiant Hot Pink CTA Button — Direct Sign In */}
          <TouchableOpacity
            style={[styles.heroPinkBtn, (isLoading || isBypassing) && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading || isBypassing}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.heroPinkBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Demo credentials hint */}
          <Text style={styles.demoHint}>
            Test: <Text style={styles.codeText}>parent.test@guardian.family</Text> / <Text style={styles.codeText}>Password123!</Text>
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
          🔒 30-Day Persistent Session • No 2FA Required
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
              Connect over local Wi-Fi or cloud tunnel:
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
    backgroundColor: '#1A0A35', // Deeper, richer Royal Violet
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    backgroundColor: '#10B981',
  },
  statusDotRed: {
    backgroundColor: '#EF4444',
  },
  serverPillText: {
    color: 'rgba(255, 255, 255, 0.7)',
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
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginTop: Spacing.md,
  },
  brandSubtitle: {
    fontSize: FontSizes.body,
    color: 'rgba(209, 196, 233, 0.8)',
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.8,
  },

  // 🧪 Quick Test & Demo Hub
  demoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.2,
  },
  demoBadge: {
    backgroundColor: '#FA2E67',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  demoBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    gap: 6,
  },
  pillIcon: {
    fontSize: 14,
  },
  outlinePillText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
  instantBypassPill: {
    backgroundColor: 'rgba(250, 46, 103, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(250, 46, 103, 0.5)',
    borderRadius: BorderRadius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantBypassText: {
    color: '#FF6B9D',
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: BorderRadius.pill,
    padding: 3,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BorderRadius.pill,
  },
  segmentBtnActive: {
    backgroundColor: '#FA2E67',
  },
  segmentText: {
    fontSize: FontSizes.body,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },

  // Capsule Inputs
  capsuleInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: Spacing.md,
    height: 54,
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
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: FontSizes.caption,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  successText: {
    color: '#6EE7B7',
    fontSize: FontSizes.body,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: FontSizes.body,
    textAlign: 'center',
  },

  // Radiant Hot Pink Hero Button
  heroPinkBtn: {
    backgroundColor: '#FA2E67',
    borderRadius: BorderRadius.pill,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.pinkGlow,
    marginBottom: Spacing.sm,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  heroPinkBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
  },
  demoHint: {
    fontSize: FontSizes.caption - 1,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  codeText: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: FontSizes.body,
  },
  registerLink: {
    color: '#FA2E67',
    fontSize: FontSizes.body,
    fontWeight: '800',
  },
  footerNote: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.md,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 4, 22, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#2A1254',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSizes.body,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: Spacing.sm,
  },
  testBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#FCA5A5',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalSecondaryBtnText: {
    color: 'rgba(255, 255, 255, 0.5)',
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
