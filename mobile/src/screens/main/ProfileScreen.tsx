import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import Icon, { IconName } from '../../components/Icon';

export default function ProfileScreen() {
  const { user, logout, selectedChildId, setSelectedChildId } = useAuth();
  const insets = useSafeAreaInsets();

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

  const securityRows: Array<{ label: string; desc: string; status: string; ok: boolean }> = [
    { label: 'Encrypted Credentials', desc: 'Passwords hashed with bcrypt on the server', status: 'Active', ok: true },
    { label: 'Auto Sign-Out', desc: 'Refresh-token rotation ends stale sessions', status: 'Active', ok: true },
    { label: 'Biometric Unlock', desc: 'FaceID / fingerprint quick access', status: 'Coming Soon', ok: false },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Parent Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.display_name?.charAt(0)?.toUpperCase() || 'P'}
          </Text>
        </View>
        <Text style={styles.displayName}>{user?.display_name || 'Parent'}</Text>
        <Text style={styles.identifier}>
          {user?.email || user?.phone || 'No identifier set'}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Icon name="shield-checkmark" size={12} color={Colors.primary} />
            <Text style={styles.badgeText}>Verified Parent</Text>
          </View>
          <View style={styles.badge}>
            <Icon name="home" size={12} color={Colors.primary} />
            <Text style={styles.badgeText}>{user?.household_id || 'Household'}</Text>
          </View>
        </View>
      </View>

      {/* Children Profiles */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.titleIcon}>
            <Icon name="people" size={14} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Child Profiles</Text>
        </View>
        <Text style={styles.cardDesc}>Switch between children to view their individual data</Text>

        {user?.linked_children?.map((child: any, index: number) => {
          const childId = typeof child === 'string' ? child : (child?.id || `child_${index}`);
          const childName = typeof child === 'string'
            ? (child === 'child_aarav' ? 'Aarav' : child === 'child_meera' ? 'Meera' : child)
            : (child?.display_name || childId);
          const ageBand = typeof child === 'object' && child?.age_band ? child.age_band : '7-9';
          const dailyLimit = typeof child === 'object' && child?.settings?.daily_limit_minutes ? child.settings.daily_limit_minutes : 60;
          const isActive = selectedChildId === childId;

          return (
            <TouchableOpacity
              key={childId}
              style={[styles.childRow, isActive && styles.childRowActive]}
              onPress={() => setSelectedChildId(childId)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.childAvatar, isActive && styles.childAvatarActive]}>
                <Text style={[styles.childAvatarText, isActive && styles.childAvatarTextActive]}>
                  {childName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{childName}</Text>
                <Text style={styles.childMeta}>Age {ageBand} • {dailyLimit} min/day</Text>
              </View>
              {isActive ? (
                <View style={styles.activePill}>
                  <Icon name="checkmark" size={11} color={Colors.primary} />
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              ) : (
                <Icon name="chevron-forward" size={16} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Security Settings */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.titleIcon}>
            <Icon name="lock-closed" size={14} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Security</Text>
        </View>

        {securityRows.map((row, index) => (
          <View
            key={row.label}
            style={[styles.settingRow, index === securityRows.length - 1 && styles.settingRowLast]}
          >
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>{row.label}</Text>
              <Text style={styles.settingDesc}>{row.desc}</Text>
            </View>
            <View style={[styles.statusPill, row.ok ? styles.statusActive : styles.statusPending]}>
              <Text style={[styles.statusPillText, { color: row.ok ? '#047857' : '#B45309' }]}>
                {row.status}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* App Info */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.titleIcon}>
            <Icon name="information-circle" size={14} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>About</Text>
        </View>
        <Text style={styles.infoText}>Family TV Guardian v1.0.0</Text>
        <Text style={styles.infoText}>AI Powered Viewing Intelligence Layer</Text>
        <Text style={styles.infoTextMuted}>Amazon Developer Hackathon: Fire TV Track</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Sign out of Family TV Guardian"
      >
        <Icon name="log-out-outline" size={18} color={Colors.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.raised,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.glow,
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#FFF' },
  displayName: { fontSize: FontSizes.title, fontWeight: '800', color: Colors.textPrimary },
  identifier: { fontSize: FontSizes.body, color: Colors.textSecondary, marginTop: Spacing.xs },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.tintBlue,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.tintBlueStrong,
  },
  badgeText: { fontSize: FontSizes.caption, color: Colors.primaryDark, fontWeight: '700' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.xs },
  titleIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.tintBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: FontSizes.subtitle, fontWeight: '700', color: Colors.textPrimary },
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
    minHeight: 64,
  },
  childRowActive: { borderColor: Colors.primary, backgroundColor: Colors.tintBlue },
  childAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  childAvatarText: { fontSize: 17, fontWeight: '800', color: Colors.textSecondary },
  childAvatarTextActive: { color: '#FFFFFF' },
  childInfo: { flex: 1 },
  childName: { fontSize: FontSizes.bodyLarge, fontWeight: '700', color: Colors.textPrimary },
  childMeta: { fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 3 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  activePillText: { fontSize: FontSizes.caption, color: Colors.primary, fontWeight: '700' },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  settingText: { flex: 1 },
  settingLabel: { fontSize: FontSizes.body, fontWeight: '600', color: Colors.textPrimary },
  settingDesc: { fontSize: FontSizes.caption, color: Colors.textMuted, marginTop: 3 },
  statusPill: { borderRadius: BorderRadius.full, paddingHorizontal: 11, paddingVertical: 5 },
  statusActive: { backgroundColor: Colors.tintGreen },
  statusPending: { backgroundColor: Colors.tintAmber },
  statusPillText: { fontSize: FontSizes.caption, fontWeight: '700' },

  infoText: { fontSize: FontSizes.body, color: Colors.textSecondary, marginBottom: 4 },
  infoTextMuted: { fontSize: FontSizes.caption, color: Colors.textMuted, fontStyle: 'italic', marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.tintRed,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    marginBottom: Spacing.md,
  },
  logoutText: { fontSize: FontSizes.bodyLarge, fontWeight: '700', color: Colors.danger },
});
