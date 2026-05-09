// Splyt Brand Colors
// TypeScript/JavaScript export

export const colors = {
  primary: {
    main: '#34D399',
    light: '#6EE7B7',
    lighter: '#A7F3D0',
    lightest: '#DBEAFE',
    dark: '#14B8A6',
    darker: '#0F766E',
  },
  background: {
    darkest: '#08131A',
    darker: '#071219',
    dark: '#0F172A',
    muted: '#102B26',
    secondary: '#102A25',
  },
  surface: {
    light: '#EAF7F0',
    lighter: '#DDFBF4',
    foreground: '#F7F5EF',
  },
  text: {
    foreground: '#F7F5EF',
    muted: '#A7B3AF',
    emphasis: '#E5F3FF',
  },
  accent: {
    main: '#14B8A6',
    soft: '#CCFBF1',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
} as const;

export const gradients = {
  logoMark: 'linear-gradient(135deg, #2D6A4F, #0F172A)',
  accent: 'linear-gradient(135deg, #34D399, #14B8A6)',
} as const;

export type ColorKey = keyof typeof colors;
export type GradientKey = keyof typeof gradients;
