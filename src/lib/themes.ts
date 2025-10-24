// Theme Configuration - 15 Beautiful Animated Gradients

export type Theme = {
  id: number;
  name: string;
  colors: string[];
};

export const themes: Theme[] = [
  {
    id: 1,
    name: 'Ocean Breeze',
    colors: ['#667eea', '#764ba2', '#f093fb'],
  },
  {
    id: 2,
    name: 'Sunset',
    colors: ['#f093fb', '#f5576c', '#fa709a'],
  },
  {
    id: 3,
    name: 'Forest',
    colors: ['#4facfe', '#00f2fe', '#43e97b'],
  },
  {
    id: 4,
    name: 'Lavender',
    colors: ['#c471f5', '#fa71cd', '#e0c3fc'],
  },
  {
    id: 5,
    name: 'Peach',
    colors: ['#fa709a', '#fee140', '#ffecd2'],
  },
  {
    id: 6,
    name: 'Mint',
    colors: ['#30cfd0', '#330867', '#667eea'],
  },
  {
    id: 7,
    name: 'Fire',
    colors: ['#ff9a56', '#ff6a88', '#ff7eb3'],
  },
  {
    id: 8,
    name: 'Sky',
    colors: ['#a1c4fd', '#c2e9fb', '#e0f9ff'],
  },
  {
    id: 9,
    name: 'Rose',
    colors: ['#ffecd2', '#fcb69f', '#ff9a9e'],
  },
  {
    id: 10,
    name: 'Northern Lights',
    colors: ['#00c6ff', '#0072ff', '#667eea'],
  },
  {
    id: 11,
    name: 'Tropical',
    colors: ['#f857a6', '#ff5858', '#feca57'],
  },
  {
    id: 12,
    name: 'Emerald',
    colors: ['#11998e', '#38ef7d', '#a8ff78'],
  },
  {
    id: 13,
    name: 'Purple Dream',
    colors: ['#9d50bb', '#6e48aa', '#a8c0ff'],
  },
  {
    id: 14,
    name: 'Coral',
    colors: ['#ff6b6b', '#feca57', '#ee5a6f'],
  },
  {
    id: 15,
    name: 'Arctic',
    colors: ['#00d2ff', '#3a7bd5', '#00d2ff'],
  },
];

/**
 * Get a random theme that is not the same as the last one
 */
export function getRandomTheme(lastThemeId?: number): Theme {
  const availableThemes = lastThemeId
    ? themes.filter((t) => t.id !== lastThemeId)
    : themes;

  const randomIndex = Math.floor(Math.random() * availableThemes.length);
  return availableThemes[randomIndex];
}

/**
 * Get theme for today (same theme throughout the day)
 */
export function getTodayTheme(lastThemeId?: number, lastThemeDate?: string): Theme {
  const today = new Date().toISOString().split('T')[0];

  // If it's the same day, use the last theme
  if (lastThemeDate === today && lastThemeId) {
    const theme = themes.find((t) => t.id === lastThemeId);
    if (theme) return theme;
  }

  // New day, get a new random theme
  return getRandomTheme(lastThemeId);
}

/**
 * Get CSS gradient string for a theme
 */
export function getThemeGradient(theme: Theme): string {
  const colorString = [...theme.colors, theme.colors[0]].join(', ');
  return `linear-gradient(45deg, ${colorString})`;
}
