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
      setCommandFeedback(`Sending ${label}...`);
      await remoteApi.sendCommand(cmd, selectedChildId, payload);
      setCommandFeedback(`✅ ${label} sent!`);
      setTimeout(() => setCommandFeedback(''), 3000);
    } catch {
      setCommandFeedback(`❌ Failed to send ${label}`);
    }
  };

  const totalMinutes = digest?.total_minutes || 0;
  const progressPercent = Math.min((totalMinutes / dailyLimit) * 100, 100);
  const categoryEntries = Object.entries(digest?.category_minutes || {}).sort((a, b) => b[1] - a[1]);
  const categoryColors: Record<string, string> = {
    'Science & Documentary': Colors.accent,
    'Science': Colors.accent,
    'Educational': Colors.accentGreen,
    'Animation': Colors.primary,
    'Entertainment': Colors.accentOrange,
    'Action': Colors.accentRed,
    'Comedy': Colors.accentPink,
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
            >
              <Text style={styles.childAvatar}>{child.avatar || '👤'}</Text>
              <Text style={[styles.childName, selectedChildId === child.id && styles.childNameActive]}>
                {child.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Screen Time Ring */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📊 Today's Screen Time</Text>
          <Text style={styles.dateLabel}>{today}</Text>
        </View>

        <View style={styles.ringContainer}>
          <View style={styles.ringBg}>
            <View style={[styles.ringFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.ringStats}>
            <Text style={styles.ringValue}>{totalMinutes}</Text>
            <Text style={styles.ringUnit}>min</Text>
            <Text style={styles.ringLimit}>of {dailyLimit} min limit</Text>
          </View>
        </View>

        {digest?.generated_summary && (
          <Text style={styles.summaryText}>{digest.generated_summary}</Text>
        )}
      </View>

      {/* Live TV Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.cardTitle}>📺 Fire TV Status</Text>
            <View style={[styles.statusDot, controlState.enabled ? styles.statusOn : styles.statusOff]} />
          </View>
          <TouchableOpacity
            style={styles.pairMiniBtn}
            onPress={() => setScannerVisible(true)}
          >
            <Text style={styles.pairMiniBtnText}>📷 Scan TV QR</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tvStatus}>
          {controlState.enabled ? '🟢 Monitoring Active' : '🔴 Monitoring Paused'}
        </Text>
        {controlState.current_app && (
          <Text style={styles.activeApp}>
            Active App: <Text style={{ color: Colors.accentOrange, fontWeight: '700' }}>
              {controlState.current_app.app_name}
            </Text>
          </Text>
        )}
      </View>

      {/* Remote Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎮 Remote Quick Actions</Text>
        <Text style={styles.cardSubtitle}>Control the Fire TV from your phone</Text>

        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(255, 107, 107, 0.2)' }]} onPress={() => sendCommand('pause', 'Pause TV')}>
            <Text style={styles.actionIcon}>⏸️</Text>
            <Text style={styles.actionLabel}>Pause TV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(0, 184, 148, 0.2)' }]} onPress={() => sendCommand('resume', 'Resume TV')}>
            <Text style={styles.actionIcon}>▶️</Text>
            <Text style={styles.actionLabel}>Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(253, 203, 110, 0.2)' }]} onPress={() => sendCommand('extend_time', '+15 Minutes', { extra_minutes: 15 } as any)}>
            <Text style={styles.actionIcon}>⏱️</Text>
            <Text style={styles.actionLabel}>+15 min</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(108, 92, 231, 0.2)' }]} onPress={() => sendCommand('bedtime', 'Bedtime Lock')}>
            <Text style={styles.actionIcon}>🌙</Text>
            <Text style={styles.actionLabel}>Bedtime</Text>
          </TouchableOpacity>
        </View>

        {commandFeedback ? (
          <Text style={styles.feedbackText}>{commandFeedback}</Text>
        ) : null}
      </View>

      {/* Category Breakdown */}
      {categoryEntries.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📁 Category Mix</Text>
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
          <Text style={styles.cardTitle}>🧠 Learning Themes Extracted</Text>
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
          <Text style={styles.cardTitle}>⚡ Safety & Highlights</Text>
          {digest.notable_items.map((item, i) => {
            const isHighlight = item.flag_type === 'educational_highlight' || item.flag_type === 'topic_breakthrough';
            return (
              <View key={i} style={[styles.notableItem, isHighlight ? styles.notableGood : styles.notableWarn]}>
                <Text style={styles.notableIcon}>{isHighlight ? '✅' : '⚠️'}</Text>
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
          setCommandFeedback('✅ Fire TV linked successfully!');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  contentContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgDark },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: FontSizes.body },

  childSelector: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  childChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  childChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryDark + '30' },
  childAvatar: { fontSize: 20 },
  childName: { fontSize: FontSizes.body, color: Colors.textSecondary, fontWeight: '600' },
  childNameActive: { color: Colors.textPrimary },

  card: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSizes.subtitle, fontWeight: '700', color: Colors.textPrimary },
  cardSubtitle: { fontSize: FontSizes.body, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.md },
  dateLabel: { fontSize: FontSizes.caption, color: Colors.textMuted, backgroundColor: Colors.bgSurface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm },

  ringContainer: { alignItems: 'center', marginBottom: Spacing.md },
  ringBg: { width: '100%', height: 12, backgroundColor: Colors.bgSurface, borderRadius: 6, overflow: 'hidden', marginBottom: Spacing.sm },
  ringFill: { height: 12, borderRadius: 6, backgroundColor: Colors.accentGreen },
  ringStats: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  ringValue: { fontSize: 42, fontWeight: '900', color: Colors.textPrimary },
  ringUnit: { fontSize: FontSizes.subtitle, color: Colors.textSecondary, fontWeight: '600' },
  ringLimit: { fontSize: FontSizes.body, color: Colors.textMuted, marginLeft: 8 },

  summaryText: { fontSize: FontSizes.body, color: Colors.textSecondary, lineHeight: 22, fontStyle: 'italic' },

  tvStatus: { fontSize: FontSizes.bodyLarge, color: Colors.textPrimary, fontWeight: '600' },
  activeApp: { fontSize: FontSizes.body, color: Colors.textSecondary, marginTop: Spacing.xs },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOn: { backgroundColor: Colors.success },
  statusOff: { backgroundColor: Colors.danger },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionBtn: { width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2 - Spacing.sm) / 2, paddingVertical: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 28, marginBottom: Spacing.xs },
  actionLabel: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textPrimary },
  feedbackText: { fontSize: FontSizes.body, color: Colors.accent, textAlign: 'center', marginTop: Spacing.md, fontWeight: '600' },

  categoryRow: { marginBottom: Spacing.sm },
  categoryLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  categoryName: { fontSize: FontSizes.body, color: Colors.textSecondary },
  categoryMin: { fontSize: FontSizes.body, color: Colors.textMuted },
  categoryBarBg: { height: 6, backgroundColor: Colors.bgSurface, borderRadius: 3, overflow: 'hidden' },
  categoryBarFill: { height: 6, borderRadius: 3 },

  topicsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  topicChip: { backgroundColor: Colors.primary + '30', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderWidth: 1, borderColor: Colors.primary + '50' },
  topicText: { fontSize: FontSizes.body, color: Colors.primaryLight, fontWeight: '600' },

  notableItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.sm + 2, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  notableGood: { backgroundColor: 'rgba(0, 184, 148, 0.1)', borderWidth: 1, borderColor: 'rgba(0, 184, 148, 0.2)' },
  notableWarn: { backgroundColor: 'rgba(253, 203, 110, 0.1)', borderWidth: 1, borderColor: 'rgba(253, 203, 110, 0.2)' },
  notableIcon: { fontSize: 18 },
  notableContent: { flex: 1 },
  notableTitle: { fontSize: FontSizes.body, fontWeight: '700', color: Colors.textPrimary },
  notableReason: { fontSize: FontSizes.caption, color: Colors.textSecondary, marginTop: 2 },

  pairMiniBtn: {
    backgroundColor: Colors.primary + '25',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  pairMiniBtnText: {
    color: Colors.primary,
    fontSize: FontSizes.caption,
    fontWeight: '700',
  },
});
