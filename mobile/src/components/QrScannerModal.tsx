import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../theme/colors';
import { pairingApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function QrScannerModal({ visible, onClose, onSuccess }: QrScannerModalProps) {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<any>(null);

  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && !manualMode) {
      setScanned(false);
      setErrorMessage('');
      setSuccessInfo(null);

      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 240,
            duration: 2000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, manualMode, laserAnim]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setErrorMessage('');

    console.log('[QR Scanner] Scanned raw barcode data:', data);

    try {
      let pairToken: string | undefined;
      let shortCode: string | undefined;

      try {
        const parsed = JSON.parse(data);
        if (parsed.pair_token) pairToken = parsed.pair_token;
        if (parsed.short_code) shortCode = parsed.short_code;
      } catch {
        if (data.includes('tv_pair_')) {
          pairToken = data;
        } else if (data.toUpperCase().startsWith('GARD-') || data.length === 8) {
          shortCode = data.toUpperCase();
        } else {
          shortCode = data.trim().toUpperCase();
        }
      }

      console.log('[QR Scanner] Pairing with token:', pairToken, 'code:', shortCode);
      const result = await pairingApi.approve(pairToken, shortCode);

      if (result.success) {
        setSuccessInfo(result.data);
        setTimeout(() => {
          onSuccess(result.data);
          onClose();
        }, 1800);
      } else {
        setErrorMessage(result.error || 'Failed to link Fire TV. Please try again.');
        setScanned(false);
      }
    } catch (err: any) {
      console.warn('[QR Scanner] Approve error:', err);
      setErrorMessage(err.message || 'Network error. Ensure Fire TV and mobile are online.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Enter Code', 'Please enter the 6-character code shown on your Fire TV screen.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const code = manualCode.trim().toUpperCase();
      const result = await pairingApi.approve(undefined, code);

      if (result.success) {
        setSuccessInfo(result.data);
        setTimeout(() => {
          onSuccess(result.data);
          onClose();
        }, 1800);
      } else {
        setErrorMessage(result.error || 'Invalid or expired TV code. Check screen and retry.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPair = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const initRes = await pairingApi.initiate('Living Room Fire TV');
      if (initRes.success && initRes.data?.short_code) {
        const approveRes = await pairingApi.approve(initRes.data.pair_token, initRes.data.short_code);
        if (approveRes.success) {
          setSuccessInfo(approveRes.data);
          setTimeout(() => {
            onSuccess(approveRes.data);
            onClose();
          }, 1800);
          return;
        }
      }
      setErrorMessage('Could not initialize demo TV session.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo pairing failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
          >
            <Icon name="close" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Scan Fire TV QR Code</Text>
            <Text style={styles.headerSubtitle}>Point at TV screen to pair and log in</Text>
          </View>
          <TouchableOpacity
            style={[styles.torchBtn, torch && styles.torchBtnActive]}
            onPress={() => setTorch(!torch)}
            accessibilityRole="button"
            accessibilityLabel="Toggle flashlight"
          >
            <Icon
              name={torch ? 'flash' : 'flashlight-outline'}
              size={18}
              color={torch ? Colors.warning : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Success Overlay */}
        {successInfo ? (
          <View style={styles.successContainer}>
            <View style={styles.successIconBadge}>
              <Icon name="checkmark-circle" size={38} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Fire TV Linked</Text>
            <Text style={styles.successDesc}>
              {successInfo.linked_tv || 'Fire TV Device'} is now connected to {user?.display_name || 'your'}'s account.
            </Text>
            <View style={styles.successCard}>
              <View style={styles.successCardRow}>
                <Icon name="tv-outline" size={16} color={Colors.primary} />
                <Text style={styles.successCardText}>Device: {successInfo.linked_tv || 'Fire TV'}</Text>
              </View>
              <View style={styles.successCardRow}>
                <Icon name="home-outline" size={16} color={Colors.primary} />
                <Text style={styles.successCardText}>Household: {successInfo.household_id || user?.household_id}</Text>
              </View>
              <View style={styles.successCardRow}>
                <Icon name="people-outline" size={16} color={Colors.primary} />
                <Text style={styles.successCardText}>Monitored profiles synced</Text>
              </View>
            </View>
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            <Text style={styles.redirectText}>Connecting live dashboard...</Text>
          </View>
        ) : manualMode ? (
          /* Manual Code Entry View */
          <View style={styles.manualContainer}>
            <View style={styles.tvIconBadge}>
              <Icon name="tv-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.manualTitle}>Enter TV Code</Text>
            <Text style={styles.manualDesc}>
              Type the 6-character code shown on your Fire TV display.
            </Text>

            <TextInput
              style={styles.manualInput}
              placeholder="GARD-892"
              placeholderTextColor={Colors.textPlaceholder}
              value={manualCode}
              onChangeText={(text) => setManualCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              accessibilityLabel="TV code"
            />

            {errorMessage ? (
              <View style={styles.inlineErrorRow}>
                <Icon name="alert-circle" size={15} color={Colors.danger} />
                <Text style={styles.inlineErrorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleManualSubmit}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Link Fire TV</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeBtn}
              onPress={() => setManualMode(false)}
              accessibilityRole="button"
            >
              <View style={styles.switchModeRow}>
                <Icon name="qr-code-outline" size={15} color={Colors.primary} />
                <Text style={styles.switchModeText}>Back to QR Camera Scanner</Text>
              </View>
            </TouchableOpacity>

            {/* Quick Demo Button for effortless testing */}
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Quick Hackathon Demo</Text>
              <TouchableOpacity
                style={styles.demoBtn}
                onPress={handleDemoPair}
                disabled={loading}
                accessibilityRole="button"
              >
                <View style={styles.switchModeRow}>
                  <Icon name="flash" size={15} color={Colors.primary} />
                  <Text style={styles.demoBtnText}>1-Tap Pair with Simulator TV</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : !permission ? (
          /* Checking camera permission */
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Initializing camera...</Text>
          </View>
        ) : !permission.granted ? (
          /* Permission Denied UI */
          <View style={styles.permissionContainer}>
            <View style={styles.permissionIconBadge}>
              <Icon name="camera-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionDesc}>
              Family TV Guardian uses your camera to quickly scan the QR code displayed on your Fire TV screen.
            </Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={requestPermission}
              accessibilityRole="button"
            >
              <Text style={styles.permissionBtnText}>Enable Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.manualLinkBtn}
              onPress={() => setManualMode(true)}
              accessibilityRole="button"
            >
              <View style={styles.switchModeRow}>
                <Icon name="keypad-outline" size={15} color={Colors.primary} />
                <Text style={styles.manualLinkText}>Enter TV Code Manually Instead</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          /* Live Camera Viewfinder */
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Darkened Viewfinder Overlay with Transparent Center */}
            <View style={styles.overlay}>
              <View style={styles.overlayTop} />
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.scanTarget}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  <Animated.View
                    style={[
                      styles.laserLine,
                      {
                        transform: [{ translateY: laserAnim }],
                      },
                    ]}
                  />

                  {loading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.verifyingText}>Authorizing TV...</Text>
                    </View>
                  )}
                </View>
                <View style={styles.overlaySide} />
              </View>
              <View style={styles.overlayBottom}>
                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Icon name="alert-circle" size={15} color="#B91C1C" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : (
                  <Text style={styles.hintText}>
                    Align the QR code shown on your Fire TV within the square
                  </Text>
                )}

                {/* Bottom Action Controls */}
                <View style={styles.bottomControls}>
                  <TouchableOpacity
                    style={styles.bottomBtn}
                    onPress={() => setManualMode(true)}
                    accessibilityRole="button"
                  >
                    <Icon name="keypad-outline" size={16} color={Colors.textPrimary} />
                    <Text style={styles.bottomBtnText}>Enter Code</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.bottomBtn, styles.bottomBtnDemo]}
                    onPress={handleDemoPair}
                    disabled={loading}
                    accessibilityRole="button"
                  >
                    <Icon name="flash-outline" size={16} color={Colors.primary} />
                    <Text style={[styles.bottomBtnText, { color: Colors.primary }]}>Demo Pair</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const SCAN_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 10,
    gap: Spacing.sm,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.subtitle,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.caption,
    marginTop: 2,
  },
  torchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  torchBtnActive: {
    backgroundColor: Colors.tintAmber,
    borderColor: Colors.warning,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.body,
    fontWeight: '600',
  },

  // Viewfinder Overlay
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: Colors.cameraOverlay,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: Colors.cameraOverlay,
  },
  scanTarget: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(147, 197, 253, 0.55)',
  },
  overlayBottom: {
    flex: 1.2,
    backgroundColor: Colors.cameraOverlay,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },

  // Corner markers
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },

  // Laser animation line
  laserLine: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.primaryLight,
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 18, 32, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  verifyingText: {
    color: '#F8FAFC',
    fontSize: FontSizes.body,
    fontWeight: '700',
  },

  hintText: {
    color: 'rgba(248, 250, 252, 0.9)',
    fontSize: FontSizes.body,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    marginBottom: 20,
    maxWidth: '100%',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: FontSizes.caption,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },

  bottomControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  bottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: BorderRadius.full,
    minHeight: 46,
    ...Shadows.card,
  },
  bottomBtnDemo: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  bottomBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.body,
    fontWeight: '700',
  },

  // Manual Mode Screen
  manualContainer: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.tintBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.tintBlueStrong,
    ...Shadows.card,
  },
  manualTitle: {
    fontSize: FontSizes.title,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  manualDesc: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.xl,
  },
  manualInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginBottom: Spacing.lg,
    minHeight: 64,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  inlineErrorText: {
    color: Colors.danger,
    fontSize: FontSizes.caption,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    ...Shadows.glow,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: FontSizes.subtitle,
    fontWeight: '800',
  },
  switchModeBtn: {
    marginTop: Spacing.lg,
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  switchModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  switchModeText: {
    color: Colors.primary,
    fontSize: FontSizes.body,
    fontWeight: '700',
  },

  demoBox: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: '100%',
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginBottom: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  demoBtn: {
    backgroundColor: Colors.tintBlue,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    minHeight: 46,
    justifyContent: 'center',
  },
  demoBtnText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: FontSizes.body,
  },

  // Permission screen
  permissionContainer: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionIconBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: Colors.tintBlue,
    borderWidth: 1.5,
    borderColor: Colors.tintBlueStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  permissionTitle: {
    fontSize: FontSizes.title,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: Spacing.xl,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glow,
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: FontSizes.subtitle,
    fontWeight: '800',
  },
  manualLinkBtn: {
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  manualLinkText: {
    color: Colors.primary,
    fontSize: FontSizes.body,
    fontWeight: '700',
  },

  // Success Screen
  successContainer: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: Colors.tintGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(5, 150, 105, 0.3)',
    ...Shadows.card,
  },
  successTitle: {
    fontSize: FontSizes.title,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    ...Shadows.card,
  },
  successCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successCardText: {
    fontSize: FontSizes.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  redirectText: {
    color: Colors.textMuted,
    fontSize: FontSizes.caption,
    marginTop: 8,
    fontWeight: '600',
  },
});
