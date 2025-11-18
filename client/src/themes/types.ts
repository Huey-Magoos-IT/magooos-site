// Theme color definitions
export interface ThemeColors {
  // Primary brand colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryPastel: string;

  // Secondary colors
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  secondaryPastel: string;

  // Accent colors
  accent: string;
  accentLight: string;
  accentDark: string;
  accentPastel: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  // Surface colors (cards, modals, etc.)
  surface: string;
  surfaceHover: string;
  surfaceActive: string;

  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;

  // Border colors
  border: string;
  borderLight: string;
  borderDark: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Scrollbar colors
  scrollbarThumb: string;
  scrollbarThumbHover: string;

  // Shadow/glow colors (with alpha)
  shadowColor: string;
  glowColor: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  isDark: boolean;
  colors: ThemeColors;
}

export type ThemeId =
  | 'huey-orange-light'
  | 'huey-orange-dark'
  | 'corporate-blue-light'
  | 'corporate-blue-dark'
  | 'forest-green-light'
  | 'forest-green-dark'
  | 'royal-purple-light'
  | 'royal-purple-dark'
  | 'slate-gray-light'
  | 'slate-gray-dark';
