/**
 * Backup Reminder System
 *
 * Tracks when the user last backed up their database and shows reminders
 * based on their configured interval.
 */

const LAST_BACKUP_KEY = 'klasseflyt_last_backup_date';
const SNOOZE_UNTIL_KEY = 'klasseflyt_backup_snooze_until';

/**
 * Get the date of the last backup
 */
export function getLastBackupDate(): Date | null {
  if (typeof window === 'undefined') return null;

  const timestamp = localStorage.getItem(LAST_BACKUP_KEY);
  if (!timestamp) return null;

  return new Date(parseInt(timestamp, 10));
}

/**
 * Set the last backup date to now
 */
export function setLastBackupDate(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
  // Clear any snooze when a backup is made
  localStorage.removeItem(SNOOZE_UNTIL_KEY);
}

/**
 * Get the date when snooze ends
 */
export function getSnoozeUntilDate(): Date | null {
  if (typeof window === 'undefined') return null;

  const timestamp = localStorage.getItem(SNOOZE_UNTIL_KEY);
  if (!timestamp) return null;

  return new Date(parseInt(timestamp, 10));
}

/**
 * Snooze the reminder for a specified number of days
 */
export function snoozeReminder(days: number): void {
  if (typeof window === 'undefined') return;

  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + days);

  localStorage.setItem(SNOOZE_UNTIL_KEY, snoozeUntil.getTime().toString());
}

/**
 * Clear the snooze
 */
export function clearSnooze(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SNOOZE_UNTIL_KEY);
}

/**
 * Check if a reminder should be shown based on the interval
 * @param intervalDays - Number of days between reminders (0 = disabled)
 * @returns true if a reminder should be shown
 */
export function shouldShowReminder(intervalDays: number): boolean {
  if (typeof window === 'undefined') return false;
  if (intervalDays <= 0) return false; // Reminders disabled

  // Check if snoozed
  const snoozeUntil = getSnoozeUntilDate();
  if (snoozeUntil && snoozeUntil > new Date()) {
    return false; // Still snoozed
  }

  const lastBackup = getLastBackupDate();
  if (!lastBackup) {
    // Never backed up - show reminder
    return true;
  }

  const daysSinceBackup = Math.floor(
    (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceBackup >= intervalDays;
}

/**
 * Get a human-readable string for when the last backup was made
 */
export function getLastBackupDescription(): string {
  const lastBackup = getLastBackupDate();
  if (!lastBackup) return 'Aldri';

  const now = new Date();
  const diffMs = now.getTime() - lastBackup.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Nå nettopp';
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minutt' : 'minutter'} siden`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'time' : 'timer'} siden`;
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `${diffDays} dager siden`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'uke' : 'uker'} siden`;
  }

  const months = Math.floor(diffDays / 30);
  return `${months} ${months === 1 ? 'måned' : 'måneder'} siden`;
}
