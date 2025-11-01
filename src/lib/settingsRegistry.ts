/**
 * Settings Registry
 *
 * Centralized mapping of pages to their corresponding settings URLs.
 * This makes it easy to maintain and update settings links across the application.
 */

export type SettingsTab = 'hovedapp' | 'rewards' | 'checkin' | 'morning';

export interface SettingsLink {
  url: string;
  tab?: SettingsTab;
  label?: string;
}

/**
 * Map of page paths to their settings URLs
 */
export const settingsRegistry: Record<string, SettingsLink> = {
  // Morning Display
  '/morning-display': {
    url: '/settings/morning-display',
    label: 'Morning Display Innstillinger'
  },

  // Weekly Planner
  '/weekly-planner': {
    url: '/settings/weekly-schedule',
    label: 'Ukesplan Innstillinger'
  },

  // Poengsentral / Reward System
  '/poengsentral': {
    url: '/settings',
    tab: 'rewards',
    label: 'Belønning Innstillinger'
  },
  '/poengsentral/pos': {
    url: '/settings',
    tab: 'rewards',
    label: 'Belønning Innstillinger'
  },
  '/poengsentral/pod': {
    url: '/settings',
    tab: 'rewards',
    label: 'Belønning Innstillinger'
  },
  '/rewardstore': {
    url: '/settings',
    tab: 'rewards',
    label: 'Belønning Innstillinger'
  },
  '/rewarddashboard': {
    url: '/settings',
    tab: 'rewards',
    label: 'Belønning Innstillinger'
  },

  // Daily Check
  '/daily-check': {
    url: '/settings',
    tab: 'checkin',
    label: 'Innsjekking Innstillinger'
  },
  '/innsjekking': {
    url: '/settings',
    tab: 'checkin',
    label: 'Innsjekking Innstillinger'
  },

  // Observations
  '/observations': {
    url: '/settings',
    tab: 'hovedapp',
    label: 'Anmerkninger Innstillinger'
  },

  // Reports
  '/reports': {
    url: '/settings',
    tab: 'hovedapp',
    label: 'Rapport Innstillinger'
  },

  // Homework
  '/homework': {
    url: '/settings',
    tab: 'hovedapp',
    label: 'Lekseinnstillinger'
  },

  // Assessments
  '/assessments': {
    url: '/settings',
    tab: 'hovedapp',
    label: 'Vurdering Innstillinger'
  },

  // Classroom
  '/classroom/seating': {
    url: '/settings',
    tab: 'hovedapp',
    label: 'Klassekart Innstillinger'
  },

  // Secret Agent
  '/secret-agent': {
    url: '/settings',
    tab: 'hovedapp',
    label: 'Hemmelig Agent Innstillinger'
  }
};

/**
 * Dashboard tool keys to settings mapping
 */
export const dashboardToolSettings: Record<string, SettingsLink> = {
  'overview': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'assessments': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'dailyCheck': {
    url: '/settings',
    tab: 'checkin'
  },
  'innsjekking': {
    url: '/settings',
    tab: 'checkin'
  },
  'morning-display': {
    url: '/settings/morning-display'
  },
  'observations': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'observations.hourly': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'observations.remarks': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'classroomTools': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'classroomTools.seatingChart': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'reports': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'reports.summary': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'reports.studentReports': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'reports.analysis': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'poengsentral': {
    url: '/settings',
    tab: 'rewards'
  },
  'rewardDashboard': {
    url: '/settings',
    tab: 'rewards'
  },
  'rewardStore': {
    url: '/settings',
    tab: 'rewards'
  },
  'secret-agent': {
    url: '/settings',
    tab: 'hovedapp'
  },
  'weekly-planner': {
    url: '/settings/weekly-schedule'
  }
};

/**
 * Get settings URL for a given page path
 */
export function getSettingsUrl(path: string): string | null {
  const settings = settingsRegistry[path];
  if (!settings) return null;

  if (settings.tab) {
    return `${settings.url}#${settings.tab}`;
  }

  return settings.url;
}

/**
 * Get settings URL for a dashboard tool
 */
export function getDashboardToolSettingsUrl(toolKey: string): string | null {
  const settings = dashboardToolSettings[toolKey];
  if (!settings) return null;

  if (settings.tab) {
    return `${settings.url}#${settings.tab}`;
  }

  return settings.url;
}

/**
 * Check if a page has settings
 */
export function hasSettings(path: string): boolean {
  return path in settingsRegistry;
}

/**
 * Check if a dashboard tool has settings
 */
export function dashboardToolHasSettings(toolKey: string): boolean {
  return toolKey in dashboardToolSettings;
}
