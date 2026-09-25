import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { guardianApi, pairingApi } from '../../api/client';
import QrScannerModal from '../../components/QrScannerModal';

export default function ControlsScreen() {
  const { user, selectedChildId } = useAuth();
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [sensitivityLevel, setSensitivityLevel] = useState<'strict' | 'standard' | 'relaxed'>('standard');
  const [dailyLimit, setDailyLimit] = useState(60);

  // TV Pairing state
  const [scannerVisible, setScannerVisible] = useState(false);
  const [showManualCode, setShowManualCode] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingResult, setPairingResult] = useState('');
  const [linkedDevices, setLinkedDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const selectedChild = user?.linked_children?.find((c: any) => c.id === selectedChildId);

  const loadLinkedDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);
      const res = await pairingApi.getDevices();
      if (res.success && Array.isArray(res.data)) {
        setLinkedDevices(res.data);
      }
    } catch (err) {
      console.warn('Failed to load linked TV devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    loadLinkedDevices();
  }, [loadLinkedDevices]);

  const toggleMonitoring = useCallback(async (value: boolean) => {
    setMonitoringEnabled(value);
    try {
      await guardianApi.setOverlayControl(value, selectedChildId);
    } catch (err) {
      console.warn('Failed to toggle monitoring:', err);
      setMonitoringEnabled(!value); // Revert on failure
    }
  }, [selectedChildId]);

  const handlePairSuccess = (data: any) => {
    setPairingResult(`✅ Successfully linked ${data.linked_tv || 'Fire TV'}!`);
    loadLinkedDevices();
  };

  const handleManualPairTV = async () => {
    if (!pairingCode.trim()) {
      Alert.alert('Enter Code', 'Please enter the 6-character code shown on your Fire TV screen.');
      return;
    }

    setPairingLoading(true);
    setPairingResult('');
    try {
      const result = await pairingApi.approve(undefined, pairingCode.trim().toUpperCase());
      if (result.success) {
        setPairingResult(`✅ Successfully linked ${result.data?.linked_tv || 'Fire TV'}!`);
        setPairingCode('');
        loadLinkedDevices();
      } else {
        setPairingResult(`❌ ${result.error || 'Failed to link TV. Check the code and try again.'}`);
      }
    } catch {
      setPairingResult('❌ Network error. Make sure both devices are connected.');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleDisconnectTV = (device: any) => {
    Alert.alert(
      'Unlink Fire TV',
      `Are you sure you want to disconnect "${device.device_name || 'Fire TV'}" from your account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await pairingApi.disconnect(device.id);
              loadLinkedDevices();
            } catch (err) {
              Alert.alert('Error', 'Failed to disconnect TV');
            }
          },
        },
      ]
    );
  };

  const limitPresets = [30, 45, 60, 90, 120];
  const sensitivityOptions: Array<{ key: 'strict' | 'standard' | 'relaxed'; label: string; icon: string; desc: string }> = [
    { key: 'strict', label: 'Strict', icon: '🔒', desc: 'Flag any mild content' },
    { key: 'standard', label: 'Standard', icon: '🛡️', desc: 'Balanced filtering' },
    { key: 'relaxed', label: 'Relaxed', icon: '🔓', desc: 'Educational focus only' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Monitoring Toggle */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🛡️ Parental Monitoring</Text>
          <Switch
            value={monitoringEnabled}
            onValueChange={toggleMonitoring}
            trackColor={{ false: Colors.bgSurface, true: Colors.accentGreen + '80' }}
            thumbColor={monitoringEnabled ? Colors.accentGreen : Colors.textMuted}
          />
        </View>
        <Text style={styles.cardDesc}>
          {monitoringEnabled
            ? '🟢 Active — Fire TV screen context is being sampled every 2 minutes'
            : '🔴 Paused — TV monitoring and content analysis is temporarily suspended'}
        </Text>
      </View>

      {/* Daily Screen Time Limit */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏱️ Daily Screen Time Limit</Text>
        <Text style={styles.cardDesc}>
          Set the maximum daily viewing time for {selectedChild?.display_name || 'your child'}
        </Text>

        <View style={styles.limitRow}>
          {limitPresets.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.limitChip, dailyLimit === mins && styles.limitChipActive]}
              onPress={() => setDailyLimit(mins)}
            >
              <Text style={[styles.limitText, dailyLimit === mins && styles.limitTextActive]}>
                {mins}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.currentLimit}>
          <Text style={styles.currentLimitValue}>{dailyLimit}</Text>
          <Text style={styles.currentLimitUnit}>minutes/day</Text>
        </View>
      </View>

      {/* Content Sensitivity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Content Sensitivity Level</Text>
        <Text style={styles.cardDesc}>How aggressively should Guardian AI flag content?</Text>

        <View style={styles.sensitivityRow}>
          {sensitivityOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sensOption, sensitivityLevel === opt.key && styles.sensOptionActive]}
              onPress={() => setSensitivityLevel(opt.key)}
            >
              <Text style={styles.sensIcon}>{opt.icon}</Text>
              <Text style={[styles.sensLabel, sensitivityLevel === opt.key && styles.sensLabelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.sensDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* TV Pairing Section with Camera QR Scanner */}
      <View style={[styles.card, styles.pairCard]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.cardTitle}>📺 Fire TV Devices</Text>
            {linkedDevices.length > 0 && (
              <View style={styles.activeDeviceBadge}>
                <Text style={styles.activeDeviceBadgeText}>{linkedDevices.length} Connected</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={loadLinkedDevices}
            disabled={loadingDevices}
          >
            <Text style={styles.refreshIconText}>{loadingDevices ? '⏳' : '🔄'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardDesc}>
          Scan the QR code shown on your Fire TV screen to instantly log the TV in to your Guardian household.
        </Text>

        {/* Linked Devices List */}
        {linkedDevices.length > 0 ? (
          <View style={styles.deviceList}>
            {linkedDevices.map((dev) => (
              <View key={dev.id} style={styles.deviceItem}>
                <View style={styles.deviceIconWrapper}>
                  <Text style={styles.deviceIcon}>📺</Text>
                </View>
                <View style={styles.deviceDetails}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.deviceName}>{dev.device_name || 'Fire TV'}</Text>
                    <View style={styles.onlineDot} />
                  </View>
                  <Text style={styles.deviceSub}>Code: {dev.short_code} • Linked</Text>
                </View>
                <TouchableOpacity
                  style={styles.unlinkBtn}
                  onPress={() => handleDisconnectTV(dev)}
                >
                  <Text style={styles.unlinkBtnText}>Unlink</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {/* Primary Action: Launch Camera QR Scanner */}
        <TouchableOpacity
          style={styles.scanQrBtn}
          onPress={() => setScannerVisible(true)}
        >
          <Text style={styles.scanQrBtnIcon}>📷</Text>
          <Text style={styles.scanQrBtnText}>Scan TV QR Code</Text>
        </TouchableOpacity>

        {/* Secondary: Manual Code Toggle */}
        <TouchableOpacity
          style={styles.manualToggleBtn}
          onPress={() => setShowManualCode(!showManualCode)}
        >
          <Text style={styles.manualToggleText}>
            {showManualCode ? '▲ Hide manual code entry' : '⌨️ Enter 6-digit code manually instead'}
          </Text>
        </TouchableOpacity>

        {showManualCode && (
          <View style={styles.pairingSection}>
            <Text style={styles.instructionStep}>Enter the code displayed on your TV:</Text>
            <View style={styles.codeInputRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="GARD-892"
                placeholderTextColor={Colors.textMuted}
                value={pairingCode}
                onChangeText={setPairingCode}
                autoCapitalize="characters"
                maxLength={10}
              />
              <TouchableOpacity
                style={[styles.linkBtn, pairingLoading && styles.linkBtnDisabled]}
                onPress={handleManualPairTV}
                disabled={pairingLoading}
              >
                {pairingLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.linkBtnText}>Pair</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {pairingResult ? (
          <Text style={[styles.pairingResult, pairingResult.startsWith('✅') ? styles.pairingSuccess : styles.pairingError]}>
            {pairingResult}
          </Text>
        ) : null}
      </View>

      <View style={{ height: 100 }} />

      {/* QR Scanner Modal with CameraView */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onSuccess={handlePairSuccess}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  card: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadows.card },
  pairCard: { borderColor: Colors.primary + '50' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitle: { fontSize: FontSizes.subtitle, fontWeight: '700', color: Colors.textPrimary },
  cardDesc: { fontSize: FontSizes.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },

  limitRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  limitChip: { flex: 1, paddingVertical: Spacing.sm + 2, alignItems: 'center', borderRadius: BorderRadius.sm, backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.border },
  limitChipActive: { backgroundColor: Colors.primary + '30', borderColor: Colors.primary },
  limitText: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textMuted },
  limitTextActive: { color: Colors.primary },
  currentLimit: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 },
  currentLimitValue: { fontSize: 36, fontWeight: '900', color: Colors.textPrimary },
  currentLimitUnit: { fontSize: FontSizes.body, color: Colors.textSecondary },

  sensitivityRow: { flexDirection: 'row', gap: Spacing.sm },
  sensOption: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.border },
  sensOptionActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  sensIcon: { fontSize: 24, marginBottom: 4 },
  sensLabel: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textMuted },
  sensLabelActive: { color: Colors.primary },
  sensDesc: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },

  // TV Pairing & Devices
  activeDeviceBadge: {
    backgroundColor: Colors.accentGreen + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accentGreen,
  },
  activeDeviceBadgeText: {
    color: Colors.accentGreen,
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
  refreshIconBtn: {
    padding: 6,
  },
  refreshIconText: {
    fontSize: 16,
  },

  deviceList: {
    marginBottom: Spacing.md,
    gap: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSurface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deviceIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  deviceIcon: {
    fontSize: 20,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceName: {
    fontSize: FontSizes.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accentGreen,
  },
  deviceSub: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unlinkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(235, 87, 87, 0.15)',
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  unlinkBtnText: {
    color: Colors.danger,
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },

  scanQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.glow,
  },
  scanQrBtnIcon: {
    fontSize: 20,
  },
  scanQrBtnText: {
    color: '#FFF',
    fontSize: FontSizes.subtitle,
    fontWeight: '800',
  },

  manualToggleBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  manualToggleText: {
    color: Colors.primary,
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },

  pairingSection: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  instructionStep: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },

  codeInputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  codeInput: {
    flex: 1,
    backgroundColor: Colors.bgInput,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    letterSpacing: 4,
    textAlign: 'center',
  },
  linkBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  linkBtnDisabled: { opacity: 0.6 },
  linkBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.body },

  pairingResult: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  pairingSuccess: { color: Colors.success },
  pairingError: { color: Colors.danger },
});
