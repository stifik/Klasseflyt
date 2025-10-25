// Theme Configuration - Database-driven themes with custom theme support

import { db } from './db';
import type { Theme } from './types';

/**
 * Get all active themes for rotation
 */
export async function getActiveThemes(): Promise<Theme[]> {
  const prefs = await db.userThemePreferences.filter(p => p.isActive === true).toArray();
  const activeThemeIds = prefs.map(p => p.themeId);
  
  if (activeThemeIds.length === 0) {
    return [];
  }
  
  const themes = await db.themes.where('id').anyOf(activeThemeIds).toArray();
  return themes;
}

/**
 * Get a random theme that is not the same as the last one
 */
export async function getRandomTheme(lastThemeId?: number): Promise<Theme | null> {
  const activeThemes = await getActiveThemes();
  
  if (activeThemes.length === 0) {
    // Fallback to first predefined theme if no active themes
    const fallback = await db.themes.filter(t => t.isSystem === true).first();
    return fallback || null;
  }
  
  const availableThemes = lastThemeId
    ? activeThemes.filter((t) => t.id !== lastThemeId)
    : activeThemes;

  if (availableThemes.length === 0) {
    // If only one theme is active and it's the last one, use it anyway
    return activeThemes[0];
  }

  const randomIndex = Math.floor(Math.random() * availableThemes.length);
  return availableThemes[randomIndex];
}

/**
 * Get theme for today (same theme throughout the day)
 */
export async function getTodayTheme(): Promise<Theme | null> {
  const today = new Date().toISOString().split('T')[0];

  // Check if we already have a theme for today in history
  const history = await db.themeHistory.where('date').equals(today).first();
  
  if (history) {
    const theme = await db.themes.get(history.themeId);
    if (theme) return theme;
  }

  // Get yesterday's theme to avoid repetition
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split('T')[0];
  
  const yesterdayHistory = await db.themeHistory.where('date').equals(yesterdayDate).first();
  const yesterdayThemeId = yesterdayHistory?.themeId;

  // Get a new random theme (not same as yesterday)
  const newTheme = await getRandomTheme(yesterdayThemeId);
  
  if (!newTheme) {
    return null;
  }

  // Save to history
  await db.themeHistory.add({
    themeId: newTheme.id!,
    date: today,
  });

  return newTheme;
}

/**
 * Get CSS gradient string for a theme
 */
export function getThemeGradient(theme: Theme | null): string {
  if (!theme || !theme.colors || theme.colors.length === 0) {
    // Fallback gradient
    return 'linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)';
  }
  
  const colorString = [...theme.colors, theme.colors[0]].join(', ');
  return `linear-gradient(45deg, ${colorString})`;
}
