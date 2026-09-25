// ─── Family TV Guardian Mobile - Design System Tokens ─────────────────────
// Modern dark theme with vibrant accents

export const Colors = {
  // Primary palette
  primary: '#6C5CE7',        // Vibrant purple
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',

  // Accent colors
  accent: '#00D2FF',         // Cyan glow
  accentOrange: '#FDCB6E',
  accentGreen: '#00B894',
  accentRed: '#FF6B6B',
  accentPink: '#FD79A8',

  // Background gradients
  bgDark: '#0A0E21',
  bgCard: '#1A1E36',
  bgCardHover: '#242849',
  bgSurface: '#12162B',
  bgInput: '#1E2340',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B3C6',
  textMuted: '#6C7293',
  textAccent: '#00D2FF',

  // Status
  success: '#00B894',
  warning: '#FDCB6E',
  danger: '#FF6B6B',
  info: '#74B9FF',

  // Borders
  border: '#2D3154',
  borderLight: '#3D4168',

  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  glassBg: 'rgba(26, 30, 54, 0.85)',
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
  caption: 12,
  body: 14,
  bodyLarge: 16,
  subtitle: 18,
  title: 22,
  headline: 28,
  hero: 36,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
};
