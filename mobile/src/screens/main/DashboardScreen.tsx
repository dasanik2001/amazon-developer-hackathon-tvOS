import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { guardianApi, remoteApi } from '../../api/client';
import QrScannerModal from '../../components/QrScannerModal';
import Icon, { IconName } from '../../components/Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DigestData {
  total_minutes: number;
  category_minutes: Record<string, number>;
  top_topics: string[];
  notable_items: Array<{ title: string; reason: string; flag_type: string }>;
  generated_summary: string;
}

export default function DashboardScreen() {
  const { user, selectedChildId, setSelectedChildId } = useAuth();
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [controlState, setControlState] = useState({ enabled: true, current_app: null as any });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const selectedChild = user?.linked_children?.find((c: any) => c.id === selectedChildId);
  const dailyLimit = selectedChild?.settings?.daily_limit_minutes || 60;

  const loadData = useCallback(async () => {
    try {
      const [digestRes, controlRes] = await Promise.all([
        guardianApi.getDigest(selectedChildId, today),
        guardianApi.getOverlayControl(),
      ]);
      if (digestRes.success) setDigest(digestRes.data);
      if (controlRes.success) setControlState({ enabled: controlRes.enabled, current_app: controlRes.current_app });
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const sendCommand = async (cmd: string, label: string, payload?: Record<string, any>) => {
    try {
      setFeedbackOk(true);
      setCommandFeedback(`Sending ${label}...`);
      await remoteApi.sendCommand(cmd, selectedChildId, payload);
      setFeedbackOk(true);
      setCommandFeedback(`${label} sent`);
      setTimeout(() => setCommandFeedback(''), 3000);
    } catch {
      setFeedbackOk(false);
      setCommandFeedback(`Failed to send ${label}`);
    }
  };

  const totalMinutes = digest?.total_minutes || 0;
  const progressPercent = Math.min((totalMinutes / dailyLimit) * 100, 100);
  const categoryEntries = Object.entries(digest?.category_minutes || {}).sort((a, b) => b[1] - a[1]);
  const categoryColors: Record<string, string> = {
    'Science & Documentary': '#2563EB',
    'Science': '#2563EB',
    'Educational': '#059669',
    'Animation': '#3B82F6',
    'Entertainment': '#D97706',
    'Action': '#DC2626',
    'Comedy': '#0284C7',
  };

  const actions: Array<{ cmd: string; label: string; icon: IconName; tint: string; color: string; payload?: Record<string, any> }> = [
    { cmd: 'pause', label: 'Pause TV', icon: 'pause', tint: Colors.tintRed, color: Colors.danger },
    { cmd: 'resume', label: 'Resume', icon: 'play', tint: Colors.tintGreen, color: Colors.success },
    { cmd: 'extend_time', label: '+15 min', icon: 'time', tint: Colors.tintAmber, color: Colors.warning, payload: { extra_minutes: 15 } as any },
    { cmd: 'bedtime', label: 'Bedtime', icon: 'moon', tint: Colors.tintBlue, color: Colors.primary },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Child Selector */}
      {user?.linked_children && user.linked_children.length > 1 && (
        <View style={styles.childSelector}>
          {user.linked_children.map((child: any) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.childChip, selectedChildId === child.id && styles.childChipActive]}
              onPress={() => setSelectedChildId(child.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedChildId === child.id }}
            >
              <View style={[styles.childAvatar, selectedChildId === child.id && styles.childAvatarActive]}>
                <Text style={[styles.childAvatarText, selectedChildId === child.id && styles.childAvatarTextActive]}>
                  {(child.display_name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.childName, selectedChildId === child.id && styles.childNameActive]}>
                {child.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Screen Time */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleIcon}>
              <Icon name="stats-chart" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Today's Screen Time</Text>
          </View>
          <Text style={styles.dateLabel}>{today}</Text>
        </View>

        <View style={styles.ringContainer}>
          <View style={styles.ringStats}>
            <Text style={styles.ringValue}>{totalMinutes}</Text>
            <Text style={styles.ringUnit}>min</Text>
            <Text style={styles.ringLimit}>of {dailyLimit} min limit</Text>
          </View>
          <View style={styles.ringBg}>
            <View style={[styles.ringFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {digest?.generated_summary && (
          <Text style={styles.summaryText}>{digest.generated_summary}</Text>
        )}
      </View>

      {/* Live TV Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleIcon}>
              <Icon name="tv" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Fire TV Status</Text>
            <View style={[styles.statusDot, controlState.enabled ? styles.statusOn : styles.statusOff]} />
          </View>
          <TouchableOpacity
            style={styles.pairMiniBtn}
            onPress={() => setScannerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Scan TV QR code"
          >
            <Icon name="qr-code" size={13} color={Colors.primary} />
            <Text style={styles.pairMiniBtnText}>Scan TV QR</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statusBanner, controlState.enabled ? styles.statusBannerOn : styles.statusBannerOff]}>
          <Icon
            name={controlState.enabled ? 'checkmark-circle' : 'pause-circle'}
            size={16}
            color={controlState.enabled ? Colors.success : Colors.warning}
          />
          <Text style={[styles.tvStatus, { color: controlState.enabled ? '#047857' : '#B45309' }]}>
            {controlState.enabled ? 'Monitoring Active' : 'Monitoring Paused'}
          </Text>
        </View>

        {controlState.current_app && (
          <Text style={styles.activeApp}>
            Active App: <Text style={{ color: Colors.primary, fontWeight: '700' }}>
              {controlState.current_app.app_name}
            </Text>
          </Text>
        )}
      </View>

      {/* Remote Quick Actions */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.titleIcon}>
            <Icon name="game-controller" size={14} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Remote Quick Actions</Text>
        </View>
        <Text style={styles.cardSubtitle}>Control the Fire TV from your phone</Text>

        <View style={styles.actionsGrid}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.cmd}
              style={[styles.actionBtn, { backgroundColor: action.tint }]}
              onPress={() => sendCommand(action.cmd, action.label, action.payload)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Icon name={action.icon} size={22} color={action.color} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {commandFeedback ? (
          <View style={[styles.feedbackRow, { backgroundColor: feedbackOk ? Colors.tintBlue : Colors.tintRed }]}>
            <Icon
              name={feedbackOk ? 'information-circle' : 'alert-circle'}
              size={15}
              color={feedbackOk ? Colors.info : Colors.danger}
            />
            <Text style={[styles.feedbackText, { color: feedbackOk ? Colors.info : Colors.danger }]}>
              {commandFeedback}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Category Breakdown */}
      {categoryEntries.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleIcon}>
              <Icon name="pie-chart" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Category Mix</Text>
          </View>
          {categoryEntries.map(([category, minutes]) => (
            <View key={category} style={styles.categoryRow}>
              <View style={styles.categoryLabelRow}>
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={styles.categoryMin}>{minutes} min</Text>
              </View>
              <View style={styles.categoryBarBg}>
                <View
                  style={[
                    styles.categoryBarFill,
                    {
                      width: `${(minutes / totalMinutes) * 100}%`,
                      backgroundColor: categoryColors[category] || Colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Learning Topics */}
      {digest?.top_topics && digest.top_topics.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleIcon}>
              <Icon name="bulb" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Learning Themes Extracted</Text>
          </View>
          <View style={styles.topicsWrap}>
            {digest.top_topics.map((topic, i) => (
              <View key={i} style={styles.topicChip}>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Notable Items */}
      {digest?.notable_items && digest.notable_items.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.titleIcon}>
              <Icon name="shield-checkmark" size={14} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Safety & Highlights</Text>
          </View>
          {digest.notable_items.map((item, i) => {
            const isHighlight = item.flag_type === 'educational_highlight' || item.flag_type === 'topic_breakthrough';
            return (
              <View key={i} style={[styles.notableItem, isHighlight ? styles.notableGood : styles.notableWarn]}>
                <Icon
                  name={isHighlight ? 'checkmark-circle' : 'alert-circle'}
                  size={17}
                  color={isHighlight ? Colors.success : Colors.warning}
                />
                <View style={styles.notableContent}>
                  <Text style={styles.notableTitle}>{item.title}</Text>
                  <Text style={styles.notableReason}>{item.reason}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 100 }} />

      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onSuccess={() => {
          loadData();
          setFeedbackOk(true);
          setCommandFeedback('Fire TV linked successfully');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  contentContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgDark, gap: 10 },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.body, fontWeight: '600' },

  childSelector: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    minHeight: 40,
  },
  childChipActive: { borderColor: Colors.primary, backgroundColor: Colors.tintBlue },
  childAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarActive: { backgroundColor: Colors.primary },
  childAvatarText: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary },
  childAvatarTextActive: { color: '#FFFFFF' },
  childName: { fontSize: FontSizes.body, color: Colors.textSecondary, fontWeight: '600' },
  childNameActive: { color: Colors.primary },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  titleIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.tintBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: FontSizes.subtitle, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  cardSubtitle: { fontSize: FontSizes.body, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.md },
  dateLabel: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    backgroundColor: Colors.bgSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },

  ringContainer: { marginBottom: Spacing.md, gap: 10 },
  ringStats: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  ringValue: { fontSize: 40, fontWeight: '900', color: Colors.textPrimary },
  ringUnit: { fontSize: FontSizes.subtitle, color: Colors.textSecondary, fontWeight: '600' },
  ringLimit: { fontSize: FontSizes.body, color: Colors.textMuted, marginLeft: 8 },
  ringBg: { width: '100%', height: 10, backgroundColor: Colors.bgSurface, borderRadius: 5, overflow: 'hidden' },
  ringFill: { height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  summaryText: { fontSize: FontSizes.body, color: Colors.textSecondary, lineHeight: 21, fontStyle: 'italic' },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusBannerOn: { backgroundColor: Colors.tintGreen, borderColor: 'rgba(5, 150, 105, 0.25)' },
  statusBannerOff: { backgroundColor: Colors.tintAmber, borderColor: 'rgba(217, 119, 6, 0.25)' },
  tvStatus: { fontSize: FontSizes.body, fontWeight: '700' },
  activeApp: { fontSize: FontSizes.body, color: Colors.textSecondary, marginTop: Spacing.sm },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusOn: { backgroundColor: Colors.success },
  statusOff: { backgroundColor: Colors.warning },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionBtn: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2 - Spacing.sm) / 2,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 92,
  },
  actionLabel: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textPrimary },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: BorderRadius.sm,
    paddingVertical: 9,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedbackText: { fontSize: FontSizes.body, fontWeight: '700' },

  categoryRow: { marginBottom: Spacing.sm + 2 },
  categoryLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  categoryName: { fontSize: FontSizes.body, color: Colors.textSecondary, flexShrink: 1, marginRight: 8 },
  categoryMin: { fontSize: FontSizes.body, color: Colors.textMuted, fontWeight: '600' },
  categoryBarBg: { height: 8, backgroundColor: Colors.bgSurface, borderRadius: 4, overflow: 'hidden' },
  categoryBarFill: { height: 8, borderRadius: 4 },

  topicsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  topicChip: {
    backgroundColor: Colors.tintBlue,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.tintBlueStrong,
  },
  topicText: { fontSize: FontSizes.body, color: Colors.primaryDark, fontWeight: '600' },

  notableItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  notableGood: { backgroundColor: Colors.tintGreen, borderColor: 'rgba(5, 150, 105, 0.22)' },
  notableWarn: { backgroundColor: Colors.tintAmber, borderColor: 'rgba(217, 119, 6, 0.22)' },
  notableContent: { flex: 1 },
  notableTitle: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textPrimary },
  notableReason: { fontSize: FontSizes.caption, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },

  pairMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.tintBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.tintBlueStrong,
    minHeight: 32,
  },
  pairMiniBtnText: {
    color: Colors.primary,
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
});
