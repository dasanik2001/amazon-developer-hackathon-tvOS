import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SpatialNavigationRoot, SpatialNavigationFocusableView, DefaultFocus } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { colors, safeZones } from '../theme';
import { scaledPixels } from '../hooks/useScale';
import { fetchDailyDigest, GuardianDigest } from '../services/guardianApi';

export default function GuardianDashboardScreen() {
  const isFocused = useIsFocused();
  const [digest, setDigest] = useState<GuardianDigest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchDailyDigest('child_aarav');
    setDigest(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  const cartoonMinutes = digest?.category_minutes?.['Cartoon'] || 0;
  const eduMinutes = digest?.category_minutes?.['Educational'] || 0;
  const totalMinutes = digest?.total_minutes || 0;
  const eduPercent = totalMinutes > 0 ? Math.round((eduMinutes / totalMinutes) * 100) : 0;
  const cartoonPercent = totalMinutes > 0 ? Math.round((cartoonMinutes / totalMinutes) * 100) : 0;

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.badge}>FAMILY MEDIA INTELLIGENCE</Text>
            <Text style={styles.title}>Parent Daily Briefing</Text>
            <Text style={styles.subtitle}>Viewing profile: Aarav (Age 7-10)</Text>
          </View>

          <DefaultFocus>
            <SpatialNavigationFocusableView onSelect={loadData}>
              {({ isFocused: btnFocused }) => (
                <View style={[styles.refreshBtn, btnFocused && styles.refreshBtnFocused]}>
                  <Text style={[styles.refreshBtnText, btnFocused && styles.refreshBtnTextFocused]}>
                    🔄 Refresh Digest
                  </Text>
                </View>
              )}
            </SpatialNavigationFocusableView>
          </DefaultFocus>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#ff9900" />
            <Text style={styles.loadingText}>Analyzing Fire TV viewing sessions...</Text>
          </View>
        ) : digest ? (
          <View style={styles.body}>
            {/* Fire TV Background Overlay & Ingestion Banner */}
            <View style={styles.overlayBanner}>
              <View style={styles.overlayBannerHeader}>
                <Text style={styles.overlayBannerBadge}>🛡️ SYSTEM OVERLAY ACTIVE</Text>
                <Text style={styles.overlayLiveDot}>🟢 Realtime Monitoring</Text>
              </View>
              <Text style={styles.overlayBannerTitle}>External App Parental Guardian</Text>
              <Text style={styles.overlayBannerDesc}>
                Monitoring playback across YouTube, SmartTube, Prime Video & Netflix. Captures screen metadata every 120s and streams intelligence to backend RAG.
              </Text>
            </View>

            {/* Executive Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Today's Executive Summary</Text>
              <Text style={styles.summaryText}>{digest.generated_summary}</Text>
            </View>

            {/* Metrics Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>TOTAL SCREEN TIME</Text>
                <Text style={styles.metricValue}>{digest.total_minutes} min</Text>
              </View>
              <View style={[styles.metricBox, { borderLeftColor: '#c084fc' }]}>
                <Text style={styles.metricLabel}>CARTOON TIME</Text>
                <Text style={[styles.metricValue, { color: '#c084fc' }]}>
                  {cartoonMinutes}m ({cartoonPercent}%)
                </Text>
              </View>
              <View style={[styles.metricBox, { borderLeftColor: '#34d399' }]}>
                <Text style={styles.metricLabel}>EDUCATIONAL RATIO</Text>
                <Text style={[styles.metricValue, { color: '#34d399' }]}>
                  {eduMinutes}m ({eduPercent}%)
                </Text>
              </View>
              <View style={[styles.metricBox, { borderLeftColor: '#38bdf8' }]}>
                <Text style={styles.metricLabel}>KEY THEMES EXTRACTED</Text>
                <Text style={[styles.metricValue, { color: '#38bdf8' }]}>
                  {digest.top_topics.length} topics
                </Text>
              </View>
            </View>

            {/* Category Mix Breakdown */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>📊 Category Mix</Text>
              <View style={styles.categoryContainer}>
                {Object.entries(digest.category_minutes || {}).map(([cat, mins]) => {
                  const pct = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
                  const catLower = cat.toLowerCase();
                  let col = '#38bdf8';
                  let icon = '🎬';
                  if (catLower === 'cartoon' || catLower === 'animation') {
                    col = '#a855f7';
                    icon = '🎨';
                  } else if (catLower === 'educational') {
                    col = '#10b981';
                    icon = '🌱';
                  }
                  return (
                    <View key={cat} style={styles.categoryRow}>
                      <View style={styles.categoryRowHeader}>
                        <Text style={styles.categoryName}>{icon} {cat}</Text>
                        <Text style={styles.categoryMins}>{mins} min ({pct}%)</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: col }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Extracted Learning Topics (P0) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>🏷️ Extracted Learning Themes</Text>
              <View style={styles.topicsRow}>
                {digest.top_topics.length > 0 ? (
                  digest.top_topics.map((topic, i) => (
                    <View key={i} style={styles.topicChip}>
                      <Text style={styles.topicText}>• {topic}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No educational topics recorded yet today.</Text>
                )}
              </View>
            </View>

            {/* Safety & Content Flags (P0) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>🛡️ Content Signals & Safety Exceptions</Text>
              {digest.notable_items.length > 0 ? (
                digest.notable_items.map((item, idx) => {
                  const isConcern = item.flag_type === 'potential_concern';
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.notableItem,
                        isConcern ? styles.notableConcern : styles.notableHighlight,
                      ]}
                    >
                      <Text style={styles.notableIcon}>{isConcern ? '⚠️' : '🌟'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notableTitle}>{item.title}</Text>
                        <Text style={styles.notableReason}>{item.reason}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>All watched content is within safe family guidelines.</Text>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No data available.</Text>
        )}
      </ScrollView>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  contentContainer: {
    paddingStart: safeZones.left,
    paddingEnd: safeZones.right,
    paddingTop: safeZones.top,
    paddingBottom: scaledPixels(40),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaledPixels(24),
  },
  badge: {
    color: '#ff9900',
    fontSize: scaledPixels(13),
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: scaledPixels(32),
    fontWeight: '800',
    color: '#ffffff',
    marginTop: scaledPixels(4),
  },
  subtitle: {
    fontSize: scaledPixels(16),
    color: '#94a3b8',
    marginTop: scaledPixels(2),
  },
  refreshBtn: {
    paddingVertical: scaledPixels(10),
    paddingHorizontal: scaledPixels(20),
    backgroundColor: '#1e293b',
    borderRadius: scaledPixels(8),
    borderWidth: 1,
    borderColor: '#334155',
  },
  refreshBtnFocused: {
    backgroundColor: '#ff9900',
    borderColor: '#ffaa22',
  },
  refreshBtnText: {
    color: '#f8fafc',
    fontSize: scaledPixels(15),
    fontWeight: '600',
  },
  refreshBtnTextFocused: {
    color: '#0b0f19',
    fontWeight: '800',
  },
  loadingBox: {
    padding: scaledPixels(50),
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: scaledPixels(18),
    marginTop: scaledPixels(16),
  },
  body: {
    gap: scaledPixels(20),
  },
  overlayBanner: {
    backgroundColor: '#0f172a',
    borderRadius: scaledPixels(12),
    padding: scaledPixels(18),
    borderWidth: 1,
    borderColor: 'rgba(255, 153, 0, 0.4)',
    borderLeftWidth: 5,
    borderLeftColor: '#ff9900',
  },
  overlayBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaledPixels(6),
  },
  overlayBannerBadge: {
    color: '#ff9900',
    fontSize: scaledPixels(12),
    fontWeight: '800',
    letterSpacing: 1,
  },
  overlayLiveDot: {
    color: '#4ade80',
    fontSize: scaledPixels(13),
    fontWeight: '700',
  },
  overlayBannerTitle: {
    color: '#ffffff',
    fontSize: scaledPixels(18),
    fontWeight: '700',
    marginBottom: scaledPixels(4),
  },
  overlayBannerDesc: {
    color: '#94a3b8',
    fontSize: scaledPixels(14),
    lineHeight: scaledPixels(20),
  },
  summaryCard: {
    backgroundColor: '#131c2e',
    borderRadius: scaledPixels(12),
    padding: scaledPixels(20),
    borderLeftWidth: 5,
    borderLeftColor: '#ff9900',
  },
  summaryTitle: {
    fontSize: scaledPixels(18),
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: scaledPixels(8),
  },
  summaryText: {
    fontSize: scaledPixels(16),
    color: '#e2e8f0',
    lineHeight: scaledPixels(24),
  },
  metricsRow: {
    flexDirection: 'row',
    gap: scaledPixels(16),
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#131c2e',
    borderRadius: scaledPixels(12),
    padding: scaledPixels(16),
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  metricLabel: {
    fontSize: scaledPixels(12),
    color: '#94a3b8',
    fontWeight: '700',
  },
  metricValue: {
    fontSize: scaledPixels(26),
    fontWeight: '800',
    color: '#ffffff',
    marginTop: scaledPixels(6),
  },
  sectionCard: {
    backgroundColor: '#131c2e',
    borderRadius: scaledPixels(12),
    padding: scaledPixels(20),
  },
  sectionHeading: {
    fontSize: scaledPixels(18),
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: scaledPixels(14),
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaledPixels(10),
  },
  topicChip: {
    backgroundColor: '#1e293b',
    paddingVertical: scaledPixels(6),
    paddingHorizontal: scaledPixels(14),
    borderRadius: scaledPixels(20),
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  topicText: {
    color: '#38bdf8',
    fontSize: scaledPixels(14),
    fontWeight: '600',
  },
  notableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#192338',
    padding: scaledPixels(12),
    borderRadius: scaledPixels(8),
    marginBottom: scaledPixels(10),
    borderLeftWidth: 4,
  },
  notableHighlight: {
    borderLeftColor: '#34d399',
  },
  notableConcern: {
    borderLeftColor: '#f43f5e',
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  notableIcon: {
    fontSize: scaledPixels(22),
    marginRight: scaledPixels(12),
  },
  notableTitle: {
    fontSize: scaledPixels(15),
    fontWeight: '700',
    color: '#ffffff',
  },
  notableReason: {
    fontSize: scaledPixels(13),
    color: '#94a3b8',
    marginTop: scaledPixels(2),
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: scaledPixels(15),
  },
  categoryContainer: {
    gap: scaledPixels(12),
  },
  categoryRow: {
    gap: scaledPixels(4),
  },
  categoryRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaledPixels(2),
  },
  categoryName: {
    fontSize: scaledPixels(14),
    fontWeight: '600',
    color: '#e2e8f0',
  },
  categoryMins: {
    fontSize: scaledPixels(14),
    fontWeight: '600',
    color: '#94a3b8',
  },
  progressTrack: {
    height: scaledPixels(8),
    backgroundColor: '#1e293b',
    borderRadius: scaledPixels(4),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: scaledPixels(4),
  },
});
