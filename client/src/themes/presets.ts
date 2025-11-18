import { Theme, ThemeId } from './types';

// Huey Orange Light - Your classic brand theme
const hueyOrangeLight: Theme = {
  id: 'huey-orange-light',
  name: "Huey's Classic",
  description: 'Original Huey Magoo\'s orange and cream',
  isDark: false,
  colors: {
    primary: '#FF6B2C',
    primaryLight: '#FF9670',
    primaryDark: '#E65A1F',
    primaryPastel: '#FFB894',

    secondary: '#E63946',
    secondaryLight: '#F87171',
    secondaryDark: '#DC2626',
    secondaryPastel: '#F8A5A5',

    accent: '#FFB627',
    accentLight: '#FCD34D',
    accentDark: '#F59E0B',
    accentPastel: '#FBBF24',

    background: '#FFF8F0',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#FFE8DB',

    surface: '#FFFFFF',
    surfaceHover: '#FFF5F0',
    surfaceActive: '#FFE8DB',

    text: '#1A1A1A',
    textSecondary: '#4D4D4D',
    textMuted: '#808080',
    textOnPrimary: '#FFFFFF',

    border: '#FFD1B8',
    borderLight: '#FFE8DB',
    borderDark: '#FFB894',

    success: '#22c55e',
    warning: '#FFB627',
    error: '#E63946',
    info: '#3b82f6',

    scrollbarThumb: 'rgba(255, 107, 44, 0.3)',
    scrollbarThumbHover: 'rgba(255, 107, 44, 0.6)',

    shadowColor: 'rgba(255, 107, 44, 0.15)',
    glowColor: 'rgba(255, 107, 44, 0.4)',
  },
};

// Huey Orange Dark
const hueyOrangeDark: Theme = {
  id: 'huey-orange-dark',
  name: "Huey's Dark",
  description: 'Dark mode with warm orange accents',
  isDark: true,
  colors: {
    primary: '#FFB894',
    primaryLight: '#FFC9A8',
    primaryDark: '#CC7A52',
    primaryPastel: '#FFB894',

    secondary: '#F8A5A5',
    secondaryLight: '#FCA5A5',
    secondaryDark: '#C87A7A',
    secondaryPastel: '#F8A5A5',

    accent: '#FBBF24',
    accentLight: '#FCD34D',
    accentDark: '#D4A84A',
    accentPastel: '#FBBF24',

    background: '#0A0A0A',
    backgroundSecondary: '#1A1A1A',
    backgroundTertiary: '#2A2A2A',

    surface: '#1A1A1A',
    surfaceHover: '#2A2A2A',
    surfaceActive: '#3A3A3A',

    text: '#FFF8F0',
    textSecondary: '#CCCCCC',
    textMuted: '#808080',
    textOnPrimary: '#1A1A1A',

    border: 'rgba(255, 184, 148, 0.3)',
    borderLight: 'rgba(255, 184, 148, 0.2)',
    borderDark: 'rgba(255, 184, 148, 0.4)',

    success: '#4ade80',
    warning: '#FBBF24',
    error: '#F8A5A5',
    info: '#60a5fa',

    scrollbarThumb: 'rgba(255, 107, 44, 0.4)',
    scrollbarThumbHover: 'rgba(255, 107, 44, 0.7)',

    shadowColor: 'rgba(255, 107, 44, 0.25)',
    glowColor: 'rgba(255, 184, 148, 0.4)',
  },
};

// Corporate Blue Light
const corporateBlueLight: Theme = {
  id: 'corporate-blue-light',
  name: 'Corporate Blue',
  description: 'Professional blue theme',
  isDark: false,
  colors: {
    primary: '#2563eb',
    primaryLight: '#60a5fa',
    primaryDark: '#1d4ed8',
    primaryPastel: '#93c5fd',

    secondary: '#7c3aed',
    secondaryLight: '#a78bfa',
    secondaryDark: '#6d28d9',
    secondaryPastel: '#c4b5fd',

    accent: '#0891b2',
    accentLight: '#22d3ee',
    accentDark: '#0e7490',
    accentPastel: '#67e8f9',

    background: '#f8fafc',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#e2e8f0',

    surface: '#FFFFFF',
    surfaceHover: '#f1f5f9',
    surfaceActive: '#e2e8f0',

    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    textOnPrimary: '#FFFFFF',

    border: '#cbd5e1',
    borderLight: '#e2e8f0',
    borderDark: '#94a3b8',

    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#2563eb',

    scrollbarThumb: 'rgba(37, 99, 235, 0.3)',
    scrollbarThumbHover: 'rgba(37, 99, 235, 0.6)',

    shadowColor: 'rgba(37, 99, 235, 0.15)',
    glowColor: 'rgba(37, 99, 235, 0.4)',
  },
};

// Corporate Blue Dark
const corporateBlueDark: Theme = {
  id: 'corporate-blue-dark',
  name: 'Corporate Dark',
  description: 'Dark professional theme',
  isDark: true,
  colors: {
    primary: '#60a5fa',
    primaryLight: '#93c5fd',
    primaryDark: '#2563eb',
    primaryPastel: '#93c5fd',

    secondary: '#a78bfa',
    secondaryLight: '#c4b5fd',
    secondaryDark: '#7c3aed',
    secondaryPastel: '#c4b5fd',

    accent: '#22d3ee',
    accentLight: '#67e8f9',
    accentDark: '#0891b2',
    accentPastel: '#67e8f9',

    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#334155',

    surface: '#1e293b',
    surfaceHover: '#334155',
    surfaceActive: '#475569',

    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    textOnPrimary: '#0f172a',

    border: 'rgba(148, 163, 184, 0.3)',
    borderLight: 'rgba(148, 163, 184, 0.2)',
    borderDark: 'rgba(148, 163, 184, 0.4)',

    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',

    scrollbarThumb: 'rgba(96, 165, 250, 0.4)',
    scrollbarThumbHover: 'rgba(96, 165, 250, 0.7)',

    shadowColor: 'rgba(96, 165, 250, 0.25)',
    glowColor: 'rgba(96, 165, 250, 0.4)',
  },
};

// Forest Green Light
const forestGreenLight: Theme = {
  id: 'forest-green-light',
  name: 'Forest Green',
  description: 'Natural, calming green theme',
  isDark: false,
  colors: {
    primary: '#16a34a',
    primaryLight: '#4ade80',
    primaryDark: '#15803d',
    primaryPastel: '#86efac',

    secondary: '#0d9488',
    secondaryLight: '#2dd4bf',
    secondaryDark: '#0f766e',
    secondaryPastel: '#5eead4',

    accent: '#ca8a04',
    accentLight: '#fcd34d',
    accentDark: '#a16207',
    accentPastel: '#fde68a',

    background: '#f0fdf4',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#dcfce7',

    surface: '#FFFFFF',
    surfaceHover: '#f0fdf4',
    surfaceActive: '#dcfce7',

    text: '#14532d',
    textSecondary: '#166534',
    textMuted: '#4d7c0f',
    textOnPrimary: '#FFFFFF',

    border: '#86efac',
    borderLight: '#bbf7d0',
    borderDark: '#4ade80',

    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    info: '#0891b2',

    scrollbarThumb: 'rgba(22, 163, 74, 0.3)',
    scrollbarThumbHover: 'rgba(22, 163, 74, 0.6)',

    shadowColor: 'rgba(22, 163, 74, 0.15)',
    glowColor: 'rgba(22, 163, 74, 0.4)',
  },
};

// Forest Green Dark
const forestGreenDark: Theme = {
  id: 'forest-green-dark',
  name: 'Forest Dark',
  description: 'Dark theme with nature vibes',
  isDark: true,
  colors: {
    primary: '#4ade80',
    primaryLight: '#86efac',
    primaryDark: '#16a34a',
    primaryPastel: '#86efac',

    secondary: '#2dd4bf',
    secondaryLight: '#5eead4',
    secondaryDark: '#0d9488',
    secondaryPastel: '#5eead4',

    accent: '#fcd34d',
    accentLight: '#fde68a',
    accentDark: '#ca8a04',
    accentPastel: '#fde68a',

    background: '#052e16',
    backgroundSecondary: '#14532d',
    backgroundTertiary: '#166534',

    surface: '#14532d',
    surfaceHover: '#166534',
    surfaceActive: '#15803d',

    text: '#f0fdf4',
    textSecondary: '#bbf7d0',
    textMuted: '#4ade80',
    textOnPrimary: '#052e16',

    border: 'rgba(134, 239, 172, 0.3)',
    borderLight: 'rgba(134, 239, 172, 0.2)',
    borderDark: 'rgba(134, 239, 172, 0.4)',

    success: '#4ade80',
    warning: '#fcd34d',
    error: '#f87171',
    info: '#22d3ee',

    scrollbarThumb: 'rgba(74, 222, 128, 0.4)',
    scrollbarThumbHover: 'rgba(74, 222, 128, 0.7)',

    shadowColor: 'rgba(74, 222, 128, 0.25)',
    glowColor: 'rgba(74, 222, 128, 0.4)',
  },
};

// Royal Purple Light
const royalPurpleLight: Theme = {
  id: 'royal-purple-light',
  name: 'Royal Purple',
  description: 'Creative, modern purple theme',
  isDark: false,
  colors: {
    primary: '#7c3aed',
    primaryLight: '#a78bfa',
    primaryDark: '#6d28d9',
    primaryPastel: '#c4b5fd',

    secondary: '#db2777',
    secondaryLight: '#f472b6',
    secondaryDark: '#be185d',
    secondaryPastel: '#f9a8d4',

    accent: '#f59e0b',
    accentLight: '#fbbf24',
    accentDark: '#d97706',
    accentPastel: '#fcd34d',

    background: '#faf5ff',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#f3e8ff',

    surface: '#FFFFFF',
    surfaceHover: '#faf5ff',
    surfaceActive: '#f3e8ff',

    text: '#1e1b4b',
    textSecondary: '#4c1d95',
    textMuted: '#7c3aed',
    textOnPrimary: '#FFFFFF',

    border: '#c4b5fd',
    borderLight: '#e9d5ff',
    borderDark: '#a78bfa',

    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    scrollbarThumb: 'rgba(124, 58, 237, 0.3)',
    scrollbarThumbHover: 'rgba(124, 58, 237, 0.6)',

    shadowColor: 'rgba(124, 58, 237, 0.15)',
    glowColor: 'rgba(124, 58, 237, 0.4)',
  },
};

// Royal Purple Dark
const royalPurpleDark: Theme = {
  id: 'royal-purple-dark',
  name: 'Royal Dark',
  description: 'Dark creative theme',
  isDark: true,
  colors: {
    primary: '#a78bfa',
    primaryLight: '#c4b5fd',
    primaryDark: '#7c3aed',
    primaryPastel: '#c4b5fd',

    secondary: '#f472b6',
    secondaryLight: '#f9a8d4',
    secondaryDark: '#db2777',
    secondaryPastel: '#f9a8d4',

    accent: '#fbbf24',
    accentLight: '#fcd34d',
    accentDark: '#f59e0b',
    accentPastel: '#fcd34d',

    background: '#0c0a1d',
    backgroundSecondary: '#1e1b4b',
    backgroundTertiary: '#312e81',

    surface: '#1e1b4b',
    surfaceHover: '#312e81',
    surfaceActive: '#4c1d95',

    text: '#faf5ff',
    textSecondary: '#e9d5ff',
    textMuted: '#a78bfa',
    textOnPrimary: '#0c0a1d',

    border: 'rgba(196, 181, 253, 0.3)',
    borderLight: 'rgba(196, 181, 253, 0.2)',
    borderDark: 'rgba(196, 181, 253, 0.4)',

    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',

    scrollbarThumb: 'rgba(167, 139, 250, 0.4)',
    scrollbarThumbHover: 'rgba(167, 139, 250, 0.7)',

    shadowColor: 'rgba(167, 139, 250, 0.25)',
    glowColor: 'rgba(167, 139, 250, 0.4)',
  },
};

// Slate Gray Light
const slateGrayLight: Theme = {
  id: 'slate-gray-light',
  name: 'Slate',
  description: 'Minimal, neutral theme',
  isDark: false,
  colors: {
    primary: '#475569',
    primaryLight: '#64748b',
    primaryDark: '#334155',
    primaryPastel: '#94a3b8',

    secondary: '#6366f1',
    secondaryLight: '#818cf8',
    secondaryDark: '#4f46e5',
    secondaryPastel: '#a5b4fc',

    accent: '#f59e0b',
    accentLight: '#fbbf24',
    accentDark: '#d97706',
    accentPastel: '#fcd34d',

    background: '#f8fafc',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#f1f5f9',

    surface: '#FFFFFF',
    surfaceHover: '#f8fafc',
    surfaceActive: '#f1f5f9',

    text: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    textOnPrimary: '#FFFFFF',

    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    borderDark: '#cbd5e1',

    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    scrollbarThumb: 'rgba(71, 85, 105, 0.3)',
    scrollbarThumbHover: 'rgba(71, 85, 105, 0.6)',

    shadowColor: 'rgba(0, 0, 0, 0.1)',
    glowColor: 'rgba(71, 85, 105, 0.3)',
  },
};

// Slate Gray Dark
const slateGrayDark: Theme = {
  id: 'slate-gray-dark',
  name: 'Slate Dark',
  description: 'Minimal dark theme',
  isDark: true,
  colors: {
    primary: '#94a3b8',
    primaryLight: '#cbd5e1',
    primaryDark: '#64748b',
    primaryPastel: '#cbd5e1',

    secondary: '#818cf8',
    secondaryLight: '#a5b4fc',
    secondaryDark: '#6366f1',
    secondaryPastel: '#a5b4fc',

    accent: '#fbbf24',
    accentLight: '#fcd34d',
    accentDark: '#f59e0b',
    accentPastel: '#fcd34d',

    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#334155',

    surface: '#1e293b',
    surfaceHover: '#334155',
    surfaceActive: '#475569',

    text: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    textOnPrimary: '#0f172a',

    border: 'rgba(148, 163, 184, 0.3)',
    borderLight: 'rgba(148, 163, 184, 0.2)',
    borderDark: 'rgba(148, 163, 184, 0.4)',

    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',

    scrollbarThumb: 'rgba(148, 163, 184, 0.4)',
    scrollbarThumbHover: 'rgba(148, 163, 184, 0.7)',

    shadowColor: 'rgba(0, 0, 0, 0.3)',
    glowColor: 'rgba(148, 163, 184, 0.3)',
  },
};

// Export all themes
export const themes: Record<ThemeId, Theme> = {
  'huey-orange-light': hueyOrangeLight,
  'huey-orange-dark': hueyOrangeDark,
  'corporate-blue-light': corporateBlueLight,
  'corporate-blue-dark': corporateBlueDark,
  'forest-green-light': forestGreenLight,
  'forest-green-dark': forestGreenDark,
  'royal-purple-light': royalPurpleLight,
  'royal-purple-dark': royalPurpleDark,
  'slate-gray-light': slateGrayLight,
  'slate-gray-dark': slateGrayDark,
};

// Group themes by category for the selector UI
export const themeCategories = [
  {
    name: "Huey's Classic",
    themes: ['huey-orange-light', 'huey-orange-dark'] as ThemeId[],
  },
  {
    name: 'Corporate',
    themes: ['corporate-blue-light', 'corporate-blue-dark'] as ThemeId[],
  },
  {
    name: 'Forest',
    themes: ['forest-green-light', 'forest-green-dark'] as ThemeId[],
  },
  {
    name: 'Royal',
    themes: ['royal-purple-light', 'royal-purple-dark'] as ThemeId[],
  },
  {
    name: 'Slate',
    themes: ['slate-gray-light', 'slate-gray-dark'] as ThemeId[],
  },
];

export const defaultTheme: ThemeId = 'huey-orange-light';
