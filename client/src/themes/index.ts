export * from './types';
export * from './presets';

import { themes, defaultTheme } from './presets';
import { Theme, ThemeId, ThemeColors } from './types';

/**
 * Apply theme CSS variables to the document root
 */
export function applyTheme(themeId: ThemeId): void {
  const theme = themes[themeId];
  if (!theme) {
    console.error(`Theme "${themeId}" not found, falling back to default`);
    applyTheme(defaultTheme);
    return;
  }

  const root = document.documentElement;
  const colors = theme.colors;

  // Apply all color variables
  Object.entries(colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });

  // Handle dark mode class
  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Store current theme
  root.setAttribute('data-theme', themeId);

  // Also set the legacy isDarkMode for any components that still check it
  localStorage.setItem('theme', themeId);
}

/**
 * Get the current theme ID from storage or default
 */
export function getSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return defaultTheme;

  const saved = localStorage.getItem('theme');
  if (saved && themes[saved as ThemeId]) {
    return saved as ThemeId;
  }

  // Migrate from old isDarkMode system
  const oldDarkMode = localStorage.getItem('isDarkMode');
  if (oldDarkMode === 'true') {
    return 'huey-orange-dark';
  }

  return defaultTheme;
}

/**
 * Get theme by ID
 */
export function getTheme(themeId: ThemeId): Theme {
  return themes[themeId] || themes[defaultTheme];
}

/**
 * Get all available themes
 */
export function getAllThemes(): Theme[] {
  return Object.values(themes);
}

/**
 * Check if a theme is dark
 */
export function isThemeDark(themeId: ThemeId): boolean {
  return themes[themeId]?.isDark ?? false;
}
