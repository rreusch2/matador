export const colors = {
  black: '#000000',
  ink: '#070707',
  surface: '#111111',
  surfaceHigh: '#1A1A1A',
  border: '#262626',
  borderBright: '#3A3A3A',
  white: '#FFFFFF',
  offWhite: '#F2F2F2',
  muted: '#8C8C8C',
  mutedDark: '#5A5A5A',
  // PMS 108 C
  yellow: '#FEDB00',
  yellowDeep: '#E8C200',
  yellowSoft: 'rgba(254, 219, 0, 0.14)',
  // PMS 3005 C / PMS 032 C - secondary brand accents
  blue: '#0077C8',
  red: '#EF3340',
  success: '#3DDC84',
} as const;

export const fonts = {
  display: 'Anton_400Regular',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_900Black',
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const TAB_BAR_HEIGHT = 68;

export const logos = {
  white: require('../../assets/images/logo-white.png'),
  yellow: require('../../assets/images/logo-yellow.png'),
  black: require('../../assets/images/logo-black.png'),
};

export const LOGO_ASPECT = 1200 / 796;

/** Home header brand logo placement (below the safe-area top inset). The splash logo lands here. */
export const HEADER_BRAND = { left: 20, top: 8, rowHeight: 42, logoWidth: 34 };

/** Auth screen hero logo (horizontally centered, below the safe-area top inset). The splash lands here when signed out. */
export const AUTH_BRAND = { top: 28, logoWidth: 116 };
