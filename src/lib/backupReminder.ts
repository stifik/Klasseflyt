/**
 * Backup Reminder System
 *
 * Tracks when the user last backed up their database and shows reminders
 * based on their configured interval.
 * 
 * Now also checks automatic backup status from IndexedDB.
 */

import { db } from './db';

const LAST_BACKUP_KEY = 'klasseflyt_last_backup_date';
const SNOOZE_UNTIL_KEY = 'klasseflyt_backup_snooze_until';

/**
 * Get the date of the last manual backup
 */
export function getLastManualBackupDate(): Date | null {
  if (typeof window === 'undefined') return null;

  const timestamp = localStorage.getItem(LAST_BACKUP_KEY);
  if (!timestamp) return null;

  return new Date(parseInt(timestamp, 10));
}

/**
 * Get the date of the last backup (manual or automatic)
 */
export async function getLastBackupDate(): Promise<Date | null> {
  if (typeof window === 'undefined') return null;

  const manualBackup = getLastManualBackupDate();
  
  // Check automatic backup
  try {
    const autoBackupSettings = await db.backupSettings.get('autoBackupSettings');
    const autoBackup = autoBackupSettings?.lastBackupDate ? new Date(autoBackupSettings.lastBackupDate) : null;
    
    // Return the most recent backup
    if (!manualBackup && !autoBackup) return null;
    if (!manualBackup) return autoBackup;
    if (!autoBackup) return manualBackup;
    
    return manualBackup > autoBackup ? manualBackup : autoBackup;
  } catch (error) {
    // If database access fails, fall back to manual backup only
    return manualBackup;
  }
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
export async function shouldShowReminder(intervalDays: number): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (intervalDays <= 0) return false; // Reminders disabled

  // Check if snoozed
  const snoozeUntil = getSnoozeUntilDate();
  if (snoozeUntil && snoozeUntil > new Date()) {
    return false; // Still snoozed
  }

  const lastBackup = await getLastBackupDate();
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
export async function getLastBackupDescription(): Promise<string> {
  const lastBackup = await getLastBackupDate();
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
