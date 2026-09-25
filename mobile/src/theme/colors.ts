// ─── Family TV Guardian Mobile - Design System Tokens ─────────────────────
// Inspired by the Royal Purple & Radiant Magenta Reference UI/UX

export const Colors = {
  // Primary Royal Violet / Purple Palette
  primary: '#FA2E67',          // Radiant Coral/Magenta CTA (from reference "Touch"/"Next")
  primaryDark: '#D81B55',
  primaryLight: '#FF5C8A',

  // Deep Violet Theme Backgrounds
  bgDark: '#220E44',          // Deepest night violet
  bgGradientTop: '#4E2B88',   // Luminous royal purple
  bgGradientMid: '#381D69',   // Mid-tone violet
  bgCard: 'rgba(45, 20, 85, 0.72)', // Frosted glass purple card
  bgCardHover: 'rgba(65, 32, 115, 0.85)',
  bgSurface: 'rgba(255, 255, 255, 0.08)', // Translucent glass surface
  bgInput: 'rgba(255, 255, 255, 0.12)',   // Frosted capsule input fill

  // Accents & Backward Compatibility
  accent: '#FA2E67',           // Vibrant hero accent
  accentPink: '#FA2E67',       // Hot Pink hero button
  accentLavender: '#C4B5FD',   // Soft lavender for secondary elements
  accentCyan: '#38BDF8',       // Crisp dynamic indicator
  accentGold: '#FBBF24',       // Warning / test badge
  accentOrange: '#FBBF24',     // Warm warning accent
  accentRed: '#F87171',        // Danger / alert accent
  accentGreen: '#34D399',      // Connected / success green

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#D1C4E9',    // Light lavender secondary text
  textMuted: '#9B8CB8',        // Muted purple text
  textAccent: '#FA2E67',
  textPlaceholder: 'rgba(255, 255, 255, 0.45)',

  // Status
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#38BDF8',

  // Borders
  border: 'rgba(255, 255, 255, 0.16)',
  borderLight: 'rgba(255, 255, 255, 0.28)',
  borderActive: 'rgba(250, 46, 103, 0.8)',

  // Translucent Overlays
  overlay: 'rgba(15, 6, 32, 0.85)',
  glassBg: 'rgba(42, 18, 80, 0.88)',
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
  md: 16,
  lg: 22,
  xl: 28,
  pill: 32,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#FA2E67',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  pinkGlow: {
    shadowColor: '#FA2E67',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  purpleGlow: {
    shadowColor: '#6C4AB6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};
