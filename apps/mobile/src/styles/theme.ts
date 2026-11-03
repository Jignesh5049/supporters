export const colors = {
  primary: '#2E3192',
  primaryDark: '#242775',
  primaryLight: '#EEF0FA',
  primaryMuted: '#4338CA',

  accentCyan: '#00AEEF',
  accentCyanLight: '#E0F7FE',

  accentMagenta: '#A3238E',
  accentMagentaLight: '#FDF2F8',

  background: '#F7F8FC',
  surface: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F0F2F5',

  textPrimary: '#111111',
  textSecondary: '#667085',
  textMuted: '#9CA3AF',
  textWhite: '#FFFFFF',

  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  error: '#EF4444',
  errorLight: '#FEE2E2',

  badgeVerified: '#00AEEF',
  heartRed: '#EF4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  '2xl': 24,
  '3xl': 32,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  fontSizeXs: 11,
  fontSizeSm: 12,
  fontSizeBase: 14,
  fontSizeMd: 16,
  fontSizeLg: 18,
  fontSizeXl: 20,
  fontSizeXxl: 24,

  h1: {
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  subtitle1: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  subtitle2: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  body1: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  body2: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};
