// ─── Family TV Guardian Mobile — Design Tokens ───────────────────────────
// Crisp, professional light theme: off-white canvas + light-blue accents.

export const Colors = {
  // Primary Blue
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',

  // Surfaces (off-white canvas, white cards)
  bgDark: '#F5F8FC',          // App / screen background — off-white, cool tint
  bgGradientTop: '#EFF6FF',   // Light blue wash
  bgGradientMid: '#E8F0FE',
  bgCard: '#FFFFFF',          // Card surface
  bgCardHover: '#F8FAFF',
  bgSurface: '#F1F5FB',       // Subtle inset fill (chips, bars, tracks)
  bgInput: '#FFFFFF',         // Input fill
  bgPage: '#F5F8FC',

  // Light-blue tints (soft status / highlight fills)
  tintBlue: '#EFF6FF',
  tintBlueStrong: '#DBEAFE',
  tintGreen: '#ECFDF5',
  tintAmber: '#FFFBEB',
  tintRed: '#FEF2F2',
  tintSlate: '#F1F5F9',

  // Accents (backwards-compatible aliases)
  accent: '#2563EB',
  accentPink: '#2563EB',
  accentLavender: '#93C5FD',
  accentCyan: '#0284C7',
  accentGold: '#D97706',
  accentOrange: '#D97706',
  accentRed: '#DC2626',
  accentGreen: '#059669',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textAccent: '#2563EB',
  textPlaceholder: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textInverse: '#FFFFFF',

  // Status
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0284C7',

  // Borders
  border: '#E2E8F0',
  borderLight: '#CBD5E1',
  borderActive: '#2563EB',

  // Overlays
  overlay: 'rgba(15, 23, 42, 0.45)',
  glassBg: '#FFFFFF',

  // Dark chrome reserved for camera viewfinder only
  cameraChrome: '#0B1220',
  cameraOverlay: 'rgba(11, 18, 32, 0.72)',
  onCamera: '#F8FAFC',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSizes = {
  tiny: 10,
  caption: 12,
  body: 14,
  bodyLarge: 16,
  subtitle: 18,
  title: 22,
  headline: 28,
  hero: 34,
};

export const BorderRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  glow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  pinkGlow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  purpleGlow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
};
