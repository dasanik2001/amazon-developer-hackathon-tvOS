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
import Icon, { IconName } from '../../components/Icon';

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
  const [pairingOk, setPairingOk] = useState(true);
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
      setMonitoringEnabled(!value);
    }
  }, [selectedChildId]);

  const handlePairSuccess = (data: any) => {
    setPairingOk(true);
    setPairingResult(`Successfully linked ${data.linked_tv || 'Fire TV'}`);
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
        setPairingOk(true);
        setPairingResult(`Successfully linked ${result.data?.linked_tv || 'Fire TV'}`);
        setPairingCode('');
        loadLinkedDevices();
      } else {
        setPairingOk(false);
        setPairingResult(result.error || 'Failed to link TV. Check the code and try again.');
      }
    } catch {
      setPairingOk(false);
      setPairingResult('Network error. Make sure both devices are connected.');
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
  const sensitivityOptions: Array<{ key: 'strict' | 'standard' | 'relaxed'; label: string; icon: IconName; desc: string }> = [
    { key: 'strict', label: 'Strict', icon: 'lock-closed', desc: 'Flag any mild content' },
    { key: 'standard', label: 'Standard', icon: 'shield-checkmark', desc: 'Balanced filtering' },
    { key: 'relaxed', label: 'Relaxed', icon: 'lock-open', desc: 'Educational focus only' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Monitoring Toggle */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleIcon}>
              <Icon name="shield-checkmark" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Parental Monitoring</Text>
          </View>
          <Switch
            value={monitoringEnabled}
            onValueChange={toggleMonitoring}
            trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={Colors.borderLight}
            accessibilityLabel="Parental monitoring toggle"
          />
        </View>
        <View style={[styles.statusBanner, monitoringEnabled ? styles.statusBannerOn : styles.statusBannerOff]}>
          <Icon
            name={monitoringEnabled ? 'checkmark-circle' : 'pause-circle'}
            size={16}
            color={monitoringEnabled ? Colors.success : Colors.warning}
          />
          <Text style={[styles.statusBannerText, { color: monitoringEnabled ? '#047857' : '#B45309' }]}>
            {monitoringEnabled
              ? 'Active — Fire TV screen context is sampled every 2 minutes'
              : 'Paused — TV monitoring and content analysis is temporarily suspended'}
          </Text>
        </View>
      </View>

      {/* Daily Screen Time Limit */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.titleIcon}>
            <Icon name="time" size={14} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Daily Screen Time Limit</Text>
        </View>
        <Text style={styles.cardDesc}>
          Set the maximum daily viewing time for {selectedChild?.display_name || 'your child'}
        </Text>

        <View style={styles.limitRow}>
          {limitPresets.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.limitChip, dailyLimit === mins && styles.limitChipActive]}
              onPress={() => setDailyLimit(mins)}
              accessibilityRole="button"
              accessibilityState={{ selected: dailyLimit === mins }}
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
        <View style={styles.cardTitleRow}>
          <View style={styles.titleIcon}>
            <Icon name="options" size={14} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Content Sensitivity Level</Text>
        </View>
        <Text style={styles.cardDesc}>How aggressively should Guardian AI flag content?</Text>

        <View style={styles.sensitivityRow}>
          {sensitivityOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sensOption, sensitivityLevel === opt.key && styles.sensOptionActive]}
              onPress={() => setSensitivityLevel(opt.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: sensitivityLevel === opt.key }}
            >
              <View style={[styles.sensIconWrap, sensitivityLevel === opt.key && styles.sensIconWrapActive]}>
                <Icon
                  name={opt.icon}
                  size={17}
                  color={sensitivityLevel === opt.key ? '#FFFFFF' : Colors.textMuted}
                />
              </View>
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
          <View style={styles.cardTitleRow}>
            <View style={styles.titleIcon}>
              <Icon name="tv" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Fire TV Devices</Text>
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
            accessibilityRole="button"
            accessibilityLabel="Refresh devices"
          >
            {loadingDevices ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Icon name="refresh" size={17} color={Colors.textMuted} />
            )}
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
                  <Icon name="tv-outline" size={19} color={Colors.primary} />
                </View>
                <View style={styles.deviceDetails}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceName}>{dev.device_name || 'Fire TV'}</Text>
                    <View style={styles.onlineDot} />
                  </View>
                  <Text style={styles.deviceSub}>Code: {dev.short_code} • Linked</Text>
                </View>
                <TouchableOpacity
                  style={styles.unlinkBtn}
                  onPress={() => handleDisconnectTV(dev)}
                  accessibilityRole="button"
                  accessibilityLabel={`Unlink ${dev.device_name || 'Fire TV'}`}
                >
                  <Icon name="close" size={13} color={Colors.danger} />
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
          accessibilityRole="button"
          accessibilityLabel="Scan TV QR code"
        >
          <Icon name="qr-code" size={19} color="#FFFFFF" />
          <Text style={styles.scanQrBtnText}>Scan TV QR Code</Text>
        </TouchableOpacity>

        {/* Secondary: Manual Code Toggle */}
        <TouchableOpacity
          style={styles.manualToggleBtn}
          onPress={() => setShowManualCode(!showManualCode)}
          accessibilityRole="button"
        >
          <View style={styles.manualToggleRow}>
            <Icon name="keypad-outline" size={14} color={Colors.primary} />
            <Text style={styles.manualToggleText}>
              {showManualCode ? 'Hide manual code entry' : 'Enter 6-digit code manually instead'}
            </Text>
            <Icon name={showManualCode ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primary} />
          </View>
        </TouchableOpacity>

        {showManualCode && (
          <View style={styles.pairingSection}>
            <Text style={styles.instructionStep}>Enter the code displayed on your TV</Text>
            <View style={styles.codeInputRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="GARD-892"
                placeholderTextColor={Colors.textPlaceholder}
                value={pairingCode}
                onChangeText={setPairingCode}
                autoCapitalize="characters"
                maxLength={10}
                accessibilityLabel="TV pairing code"
              />
              <TouchableOpacity
                style={[styles.linkBtn, pairingLoading && styles.linkBtnDisabled]}
                onPress={handleManualPairTV}
                disabled={pairingLoading}
                accessibilityRole="button"
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
          <View style={[styles.pairingResult, pairingOk ? styles.pairingSuccess : styles.pairingError]}>
            <Icon
              name={pairingOk ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={pairingOk ? Colors.success : Colors.danger}
            />
            <Text style={[styles.pairingResultText, { color: pairingOk ? '#047857' : '#B91C1C' }]}>
              {pairingResult}
            </Text>
          </View>
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

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  pairCard: { borderColor: Colors.tintBlueStrong, backgroundColor: '#FFFFFF' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, flexWrap: 'wrap' },
  titleIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.tintBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: FontSizes.subtitle, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  cardDesc: { fontSize: FontSizes.body, color: Colors.textSecondary, lineHeight: 21, marginBottom: Spacing.md },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusBannerOn: { backgroundColor: Colors.tintGreen, borderColor: 'rgba(5, 150, 105, 0.25)' },
  statusBannerOff: { backgroundColor: Colors.tintAmber, borderColor: 'rgba(217, 119, 6, 0.25)' },
  statusBannerText: { flex: 1, fontSize: FontSizes.caption, fontWeight: '600', lineHeight: 17 },

  limitRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  limitChip: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 40,
  },
  limitChipActive: { backgroundColor: Colors.tintBlue, borderColor: Colors.primary },
  limitText: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textMuted },
  limitTextActive: { color: Colors.primary },
  currentLimit: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 5 },
  currentLimitValue: { fontSize: 34, fontWeight: '900', color: Colors.textPrimary },
  currentLimitUnit: { fontSize: FontSizes.body, color: Colors.textSecondary, fontWeight: '600' },

  sensitivityRow: { flexDirection: 'row', gap: Spacing.sm },
  sensOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 118,
  },
  sensOptionActive: { backgroundColor: Colors.tintBlue, borderColor: Colors.primary },
  sensIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  sensIconWrapActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sensLabel: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textSecondary },
  sensLabelActive: { color: Colors.primary },
  sensDesc: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 3, paddingHorizontal: 4, lineHeight: 13 },

  // TV Pairing & Devices
  activeDeviceBadge: {
    backgroundColor: Colors.tintGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
  },
  activeDeviceBadgeText: {
    color: '#047857',
    fontSize: FontSizes.caption - 1,
    fontWeight: '700',
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
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
    gap: Spacing.sm,
  },
  deviceIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.tintBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.tintBlueStrong,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    backgroundColor: Colors.success,
  },
  deviceSub: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.tintRed,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    minHeight: 34,
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
    paddingVertical: 15,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    minHeight: 52,
    ...Shadows.glow,
  },
  scanQrBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.subtitle,
    fontWeight: '800',
  },

  manualToggleBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  manualToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    lineHeight: 21,
    marginBottom: 8,
    fontWeight: '600',
  },

  codeInputRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  codeInput: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    letterSpacing: 4,
    textAlign: 'center',
    minHeight: 50,
  },
  linkBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
  },
  linkBtnDisabled: { opacity: 0.6 },
  linkBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSizes.body },

  pairingResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: Spacing.sm,
    borderWidth: 1,
  },
  pairingSuccess: { backgroundColor: Colors.tintGreen, borderColor: 'rgba(5, 150, 105, 0.25)' },
  pairingError: { backgroundColor: Colors.tintRed, borderColor: 'rgba(220, 38, 38, 0.25)' },
  pairingResultText: { fontSize: FontSizes.body, fontWeight: '700', flexShrink: 1 },
});
