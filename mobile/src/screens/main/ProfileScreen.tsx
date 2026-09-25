import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout, selectedChildId, setSelectedChildId } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Parent Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.display_name?.charAt(0)?.toUpperCase() || '👤'}
          </Text>
        </View>
        <Text style={styles.displayName}>{user?.display_name || 'Parent'}</Text>
        <Text style={styles.identifier}>
          {user?.email || user?.phone || 'No identifier set'}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔐 2FA Active</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🏠 {user?.household_id || 'Household'}</Text>
          </View>
        </View>
      </View>

      {/* Children Profiles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👨‍👩‍👧‍👦 Child Profiles</Text>
        <Text style={styles.cardDesc}>Switch between children to view their individual data</Text>

        {user?.linked_children?.map((child: any) => (
          <TouchableOpacity
            key={child.id}
            style={[styles.childRow, selectedChildId === child.id && styles.childRowActive]}
            onPress={() => setSelectedChildId(child.id)}
          >
            <Text style={styles.childAvatar}>{child.avatar || '👤'}</Text>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.display_name}</Text>
              <Text style={styles.childMeta}>Age: {child.age_band} • Limit: {child.settings?.daily_limit_minutes || 60} min/day</Text>
            </View>
            {selectedChildId === child.id && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Active</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Security Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔒 Security</Text>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
            <Text style={styles.settingDesc}>OTP verification on every login</Text>
          </View>
          <View style={[styles.statusPill, styles.statusActive]}>
            <Text style={styles.statusPillText}>Enabled</Text>
          </View>
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Biometric Unlock</Text>
            <Text style={styles.settingDesc}>FaceID / Fingerprint quick access</Text>
          </View>
          <View style={[styles.statusPill, styles.statusPending]}>
            <Text style={styles.statusPillText}>Coming Soon</Text>
          </View>
        </View>

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Session Timeout</Text>
            <Text style={styles.settingDesc}>Auto-logout after 1 hour of inactivity</Text>
          </View>
          <View style={[styles.statusPill, styles.statusActive]}>
            <Text style={styles.statusPillText}>Active</Text>
          </View>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ℹ️ About</Text>
        <Text style={styles.infoText}>Family TV Guardian v1.0.0</Text>
        <Text style={styles.infoText}>AI Powered Viewing Intelligence Layer</Text>
        <Text style={styles.infoTextMuted}>Amazon Developer Hackathon: Fire TV Track</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  profileCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.glow,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#FFF' },
  displayName: { fontSize: FontSizes.title, fontWeight: '800', color: Colors.textPrimary },
  identifier: { fontSize: FontSizes.body, color: Colors.textSecondary, marginTop: Spacing.xs },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  badge: { backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderWidth: 1, borderColor: Colors.border },
  badgeText: { fontSize: FontSizes.caption, color: Colors.textMuted },

  card: { backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: FontSizes.subtitle, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  cardDesc: { fontSize: FontSizes.body, color: Colors.textSecondary, marginBottom: Spacing.md },

  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgSurface,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  childRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  childAvatar: { fontSize: 32 },
  childInfo: { flex: 1 },
  childName: { fontSize: FontSizes.bodyLarge, fontWeight: '700', color: Colors.textPrimary },
  childMeta: { fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 2 },
  activePill: { backgroundColor: Colors.accentGreen + '20', borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  activePillText: { fontSize: FontSizes.caption, color: Colors.accentGreen, fontWeight: '600' },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: { fontSize: FontSizes.body, fontWeight: '600', color: Colors.textPrimary },
  settingDesc: { fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 2 },
  statusPill: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusActive: { backgroundColor: Colors.accentGreen + '20' },
  statusPending: { backgroundColor: Colors.accentOrange + '20' },
  statusPillText: { fontSize: FontSizes.caption, fontWeight: '600', color: Colors.textSecondary },

  infoText: { fontSize: FontSizes.body, color: Colors.textSecondary, marginBottom: 4 },
  infoTextMuted: { fontSize: FontSizes.caption, color: Colors.textMuted, fontStyle: 'italic' },

  logoutBtn: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginBottom: Spacing.md,
  },
  logoutText: { fontSize: FontSizes.bodyLarge, fontWeight: '700', color: Colors.danger },
});
