import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  SpatialNavigationRoot,
  SpatialNavigationFocusableView,
  DefaultFocus,
} from 'react-tv-space-navigation';
import { scaledPixels } from '../hooks/useScale';

const BACKEND_URLS = [
  'http://10.0.2.2:3001',
  'http://192.168.0.4:3001',
  'http://localhost:3001',
];

const DEVICE_ID = 'tv_fire_livingroom';
const DEVICE_NAME = 'Fire TV Living Room';

async function apiRequest(path: string, options: RequestInit = {}) {
  for (const base of BACKEND_URLS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${base}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // try next fallback URL
    }
  }
  return null;
}

export default function GuardianLoginScreen() {
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [pairingCode, setPairingCode] = useState('TV-8821');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState('http://192.168.0.4:3001/dashboard');
  const [isLinked, setIsLinked] = useState(false);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<any>(null);

  // Initialize dynamic pairing session
  const initPairingSession = async () => {
    setLoading(true);
    try {
      // 1. Check if device is already linked
      const checkRes = await apiRequest(`/api/pairing/device/${DEVICE_ID}/status`);
      if (checkRes?.success && checkRes.linked && checkRes.data?.email) {
        setIsLinked(true);
        setLinkedEmail(checkRes.data.email);
        setLoading(false);
        return;
      }

      // 2. Request fresh dynamic pairing session
      const sessRes = await apiRequest('/api/pairing/session', {
        method: 'POST',
        body: JSON.stringify({
          device_id: DEVICE_ID,
          device_name: DEVICE_NAME,
          host: '192.168.0.4',
        }),
      });

      if (sessRes?.success) {
        if (sessRes.already_linked) {
          setIsLinked(true);
          setLinkedEmail(sessRes.data.email);
        } else if (sessRes.data) {
          setSessionId(sessRes.data.sessionId);
          setPairingCode(sessRes.data.pairingCode);
          setQrDataUrl(sessRes.data.qrDataUrl);
          setQrPayload(sessRes.data.qrPayload);
          setIsLinked(false);
        }
      }
    } catch (e) {
      console.warn('[GuardianLogin] Error creating pairing session:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initPairingSession();

    // Setup WebSocket connection to listen for pairing events
    try {
      const ws = new WebSocket('ws://10.0.2.2:3001/ws');
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'pairing:linked' && msg.data?.email) {
            setIsLinked(true);
            setLinkedEmail(msg.data.email);
          } else if (msg.event === 'pairing:unlinked') {
            setIsLinked(false);
            setLinkedEmail(null);
            initPairingSession();
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        // Fallback silently to polling
      };
    } catch {
      // WebSocket fallback
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Periodic polling for pairing confirmation
  useEffect(() => {
    if (isLinked || !sessionId) return;

    pollIntervalRef.current = setInterval(async () => {
      const res = await apiRequest(`/api/pairing/session/${sessionId}/status`);
      if (res?.success && res.data?.status === 'linked' && res.data.linkedEmail) {
        setIsLinked(true);
        setLinkedEmail(res.data.linkedEmail);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [sessionId, isLinked]);

  // Handler to unlink account and regenerate fresh dynamic QR session
  const handleUnlink = async () => {
    setLoading(true);
    try {
      await apiRequest('/api/pairing/unlink', {
        method: 'POST',
        body: JSON.stringify({ device_id: DEVICE_ID }),
      });
      setIsLinked(false);
      setLinkedEmail(null);
      await initPairingSession();
    } catch (e) {
      console.warn('Unlink error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SpatialNavigationRoot isActive={true}>
      <View style={styles.container}>
        {/* Main Content Area */}
        {isLinked ? (
          /* ========================================= */
          /* LINKED ACCOUNT SCREEN                      */
          /* ========================================= */
          <View style={styles.linkedRow}>
            {/* Left: Glowing Guardian Shield Card */}
            <View style={styles.linkedCard}>
              <View style={styles.linkedShieldBadge}>
                <Text style={styles.linkedShieldIcon}>🛡️</Text>
              </View>
              <Text style={styles.linkedCardTitle}>TV Connected</Text>
              <Text style={styles.linkedCardSubtitle}>Family Protection Active</Text>
            </View>

            {/* Right: Account Information & Actions */}
            <View style={styles.linkedInfoContainer}>
              <Text style={styles.title}>Linked to Guardian</Text>
              <Text style={styles.linkedEmailLabel}>AUTHENTICATED PARENT ACCOUNT</Text>
              <View style={styles.emailPill}>
                <Text style={styles.emailText}>{linkedEmail}</Text>
              </View>

              <Text style={styles.subtitle}>
                This Fire TV is securely paired with your Guardian Mobile account. Viewing intelligence, screen-time limits, and safety signals are active.
              </Text>

              <DefaultFocus>
                <SpatialNavigationFocusableView onSelect={handleUnlink}>
                  {({ isFocused }) => (
                    <Pressable
                      focusable={true}
                      hasTVPreferredFocus={true}
                      onPress={handleUnlink}
                      style={[
                        styles.unlinkButton,
                        isFocused && styles.unlinkButtonFocused,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unlinkButtonText,
                          isFocused && styles.unlinkButtonTextFocused,
                        ]}
                      >
                        Unlink TV / Switch Account
                      </Text>
                    </Pressable>
                  )}
                </SpatialNavigationFocusableView>
              </DefaultFocus>
            </View>
          </View>
        ) : (
          /* ========================================= */
          /* PURE DYNAMIC LOGIN SCREEN (REFERENCE)     */
          /* ========================================= */
          <View style={styles.contentRow}>
            {/* Left: Dynamic Crisp QR Code */}
            <View style={styles.qrContainer}>
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#f5a623" />
                  <Text style={styles.loadingText}>Generating secure pairing session...</Text>
                </View>
              ) : qrDataUrl ? (
                <Image
                  source={{ uri: qrDataUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <Image
                  source={require('../assets/login_qr.png')}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              )}

            </View>

            {/* Right: Login Description & Action Button */}
            <View style={styles.infoContainer}>
              <Text style={styles.title}>Login using Guardian</Text>
              <Text style={styles.subtitle}>
                Scan the QR code from the "Login to Guardian TV" screen in settings on your mobile device.
              </Text>

              {/* Pairing Code Box - Read Only Display */}
              <View style={styles.inlineCodeBox}>
                <Text style={styles.inlineCodeLabel}>PAIRING CODE</Text>
                <Text style={styles.inlineCodeValue}>{pairingCode}</Text>
                <Text style={styles.inlineCodeHint}>
                  Enter this code in Guardian on your mobile device.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Center Brand: guardian [tv] */}
        <View style={styles.bottomBrand}>
          <Text style={styles.brandText}>guardian </Text>
          <View style={styles.tvBadge}>
            <Text style={styles.tvText}>tv</Text>
          </View>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaledPixels(80),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaledPixels(75),
    marginBottom: scaledPixels(30),
  },
  qrContainer: {
    width: scaledPixels(350),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  qrImage: {
    width: scaledPixels(340),
    height: scaledPixels(340),
  },
  loadingBox: {
    width: scaledPixels(340),
    height: scaledPixels(340),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbfbfb',
    borderRadius: scaledPixels(12),
    borderWidth: 1,
    borderColor: '#ebebeb',
    padding: scaledPixels(20),
  },
  loadingText: {
    fontSize: scaledPixels(14),
    color: '#8e9aa8',
    marginTop: scaledPixels(14),
    textAlign: 'center',
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: scaledPixels(20),
    paddingHorizontal: scaledPixels(14),
    paddingVertical: scaledPixels(6),
    marginTop: scaledPixels(14),
  },
  pulseDot: {
    width: scaledPixels(8),
    height: scaledPixels(8),
    borderRadius: scaledPixels(4),
    backgroundColor: '#10b981',
    marginRight: scaledPixels(8),
  },
  sessionCodeText: {
    fontSize: scaledPixels(13),
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  infoContainer: {
    width: scaledPixels(540),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontSize: scaledPixels(32),
    fontWeight: '600',
    color: '#f5a623', // Bright golden yellow/orange matching reference
    marginBottom: scaledPixels(16),
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: scaledPixels(19),
    lineHeight: scaledPixels(29),
    color: '#8e9aa8', // Neutral slate gray matching reference
    marginBottom: scaledPixels(36),
  },
  actionButton: {
    backgroundColor: '#ffffff',
    paddingVertical: scaledPixels(16),
    paddingHorizontal: scaledPixels(32),
    borderRadius: scaledPixels(8),
    borderWidth: 1,
    borderColor: '#ebebeb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  actionButtonFocused: {
    borderColor: '#f5a623',
    backgroundColor: '#fffdf8',
    transform: [{ scale: 1.04 }],
    shadowColor: '#f5a623',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  actionButtonText: {
    fontSize: scaledPixels(18),
    fontWeight: '500',
    color: '#3d4451',
  },
  actionButtonTextFocused: {
    color: '#d97706',
    fontWeight: '600',
  },
  bottomBrand: {
    position: 'absolute',
    bottom: scaledPixels(44),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: scaledPixels(24),
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: -0.5,
  },
  tvBadge: {
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: scaledPixels(5),
    paddingHorizontal: scaledPixels(6),
    paddingVertical: scaledPixels(1),
    marginLeft: scaledPixels(4),
  },
  tvText: {
    fontSize: scaledPixels(15),
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'lowercase',
  },

  /* Linked State Styles */
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaledPixels(75),
    marginBottom: scaledPixels(30),
  },
  linkedCard: {
    width: scaledPixels(340),
    height: scaledPixels(340),
    backgroundColor: '#f8fafc',
    borderRadius: scaledPixels(20),
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scaledPixels(28),
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  linkedShieldBadge: {
    width: scaledPixels(100),
    height: scaledPixels(100),
    borderRadius: scaledPixels(50),
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaledPixels(18),
  },
  linkedShieldIcon: {
    fontSize: scaledPixels(48),
  },
  linkedCardTitle: {
    fontSize: scaledPixels(22),
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: scaledPixels(6),
  },
  linkedCardSubtitle: {
    fontSize: scaledPixels(15),
    color: '#10b981',
    fontWeight: '600',
  },
  linkedInfoContainer: {
    width: scaledPixels(540),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  linkedEmailLabel: {
    fontSize: scaledPixels(12),
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#64748b',
    marginBottom: scaledPixels(8),
  },
  emailPill: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: scaledPixels(10),
    paddingHorizontal: scaledPixels(20),
    paddingVertical: scaledPixels(10),
    marginBottom: scaledPixels(20),
  },
  emailText: {
    fontSize: scaledPixels(20),
    fontWeight: '700',
    color: '#b45309',
  },
  unlinkButton: {
    backgroundColor: '#f8fafc',
    paddingVertical: scaledPixels(14),
    paddingHorizontal: scaledPixels(28),
    borderRadius: scaledPixels(8),
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: scaledPixels(10),
  },
  unlinkButtonFocused: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
    transform: [{ scale: 1.04 }],
  },
  unlinkButtonText: {
    fontSize: scaledPixels(16),
    fontWeight: '600',
    color: '#475569',
  },
  unlinkButtonTextFocused: {
    color: '#ffffff',
  },

  inlineCodeBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    borderRadius: scaledPixels(12),
    paddingHorizontal: scaledPixels(24),
    paddingVertical: scaledPixels(18),
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    width: scaledPixels(380),
  },
  inlineCodeLabel: {
    fontSize: scaledPixels(12),
    fontWeight: '700',
    color: '#d97706',
    letterSpacing: 1.5,
    marginBottom: scaledPixels(6),
  },
  inlineCodeValue: {
    fontSize: scaledPixels(32),
    fontWeight: 'bold',
    color: '#f5a623',
    letterSpacing: 3,
    marginBottom: scaledPixels(6),
  },
  inlineCodeHint: {
    fontSize: scaledPixels(14),
    color: '#8e9aa8',
    lineHeight: scaledPixels(20),
  },
});
