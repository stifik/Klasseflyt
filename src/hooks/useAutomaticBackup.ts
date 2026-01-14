'use client';

import { useEffect, useCallback, useState } from 'react';
import { db } from '@/lib/db';
import { exportDatabase } from '@/lib/db';
import type { AutoBackupSettings } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';

/**
 * Hook for automatic backup functionality
 * Handles scheduled backups to user-selected directory using File System Access API
 */
export function useAutomaticBackup() {
  const [isSupported, setIsSupported] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Load backup settings from database
  const backupSettings = useLiveQuery(
    () => db.backupSettings.get('autoBackupSettings'),
    []
  );

  // Check if File System Access API is supported
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
    setIsSupported(supported);
  }, []);

  /**
   * Select a directory for automatic backups
   */
  const selectBackupDirectory = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setLastError('File System Access API er ikke støttet i denne nettleseren. Bruk Chrome eller Edge.');
      return false;
    }

    try {
      // @ts-ignore - File System Access API typing
      const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      // Verify we can write to the directory
      await verifyPermission(dirHandle);

      // Store the directory handle (it can be serialized to IndexedDB)
      await db.backupSettings.put({
        id: 'autoBackupSettings',
        enabled: backupSettings?.enabled ?? false,
        frequency: backupSettings?.frequency ?? 'daily',
        directoryHandle: dirHandle,
        directoryName: dirHandle.name,
        useEncryption: backupSettings?.useEncryption ?? false,
        encryptionPassword: backupSettings?.encryptionPassword,
        maxBackupsToKeep: backupSettings?.maxBackupsToKeep ?? 10,
      });

      setLastError(null);
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled, not an error
        return false;
      }
      console.error('Failed to select directory:', error);
      setLastError(`Kunne ikke velge mappe: ${error.message}`);
      return false;
    }
  }, [isSupported, backupSettings]);

  /**
   * Verify we have write permission to the directory
   */
  const verifyPermission = async (dirHandle: FileSystemDirectoryHandle): Promise<boolean> => {
    const options = { mode: 'readwrite' as const };
    
    // @ts-ignore - File System Access API
    if ((await dirHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    
    // @ts-ignore - File System Access API
    if ((await dirHandle.requestPermission(options)) === 'granted') {
      return true;
    }
    
    throw new Error('Tilgang til mappen ble ikke gitt');
  };

  /**
   * Perform an automatic backup
   */
  const performBackup = useCallback(async (settings?: AutoBackupSettings): Promise<boolean> => {
    const currentSettings = settings ?? backupSettings;
    
    if (!currentSettings?.directoryHandle) {
      setLastError('Ingen backup-mappe valgt');
      return false;
    }

    try {
      const dirHandle = currentSettings.directoryHandle as FileSystemDirectoryHandle;
      
      // Verify permission (may have been revoked)
      await verifyPermission(dirHandle);

      // Export database
      const data = await exportDatabase(
        currentSettings.useEncryption ? currentSettings.encryptionPassword : undefined
      );

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '_');
      const filename = `klasseflyt_backup_${timestamp}.json`;

      // Create file in directory
      // @ts-ignore
      const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      // @ts-ignore
      const writable = await fileHandle.createWritable();
      
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      await writable.write(jsonString);
      await writable.close();

      // Update last backup time
      await db.backupSettings.update('autoBackupSettings', {
        lastBackupDate: now,
        lastBackupStatus: 'success',
        lastBackupError: undefined,
      });

      // Clean up old backups if configured
      if (currentSettings.maxBackupsToKeep && currentSettings.maxBackupsToKeep > 0) {
        await cleanupOldBackups(dirHandle, currentSettings.maxBackupsToKeep);
      }

      setLastError(null);
      return true;
    } catch (error: any) {
      console.error('Automatic backup failed:', error);
      const errorMessage = error.message || 'Ukjent feil';
      setLastError(errorMessage);
      
      await db.backupSettings.update('autoBackupSettings', {
        lastBackupStatus: 'error',
        lastBackupError: errorMessage,
      });
      
      return false;
    }
  }, [backupSettings]);

  /**
   * Clean up old backup files, keeping only the most recent N
   */
  const cleanupOldBackups = async (dirHandle: FileSystemDirectoryHandle, maxToKeep: number) => {
    try {
      const files: { name: string; handle: FileSystemFileHandle }[] = [];
      
      // @ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.startsWith('klasseflyt_backup_')) {
          files.push({ name: entry.name, handle: entry });
        }
      }

      // Sort by filename (which includes timestamp) descending
      files.sort((a, b) => b.name.localeCompare(a.name));

      // Delete files beyond maxToKeep
      for (let i = maxToKeep; i < files.length; i++) {
        await dirHandle.removeEntry(files[i].name);
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
      // Non-critical error, don't throw
    }
  };

  /**
   * Update backup settings
   */
  const updateSettings = useCallback(async (updates: Partial<AutoBackupSettings>) => {
    const current = await db.backupSettings.get('autoBackupSettings');
    
    await db.backupSettings.put({
      id: 'autoBackupSettings',
      enabled: false,
      frequency: 'daily',
      useEncryption: false,
      maxBackupsToKeep: 10,
      ...current,
      ...updates,
    });
  }, []);

  /**
   * Check if backup is due based on frequency
   */
  const isBackupDue = useCallback((settings: AutoBackupSettings): boolean => {
    if (!settings.enabled || !settings.lastBackupDate) {
      return settings.enabled; // If enabled but never backed up, it's due
    }

    const now = new Date();
    const lastBackup = new Date(settings.lastBackupDate);
    const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);

    switch (settings.frequency) {
      case 'hourly':
        return hoursSinceLastBackup >= 1;
      case 'daily':
        return hoursSinceLastBackup >= 24;
      case 'weekly':
        return hoursSinceLastBackup >= 24 * 7;
      case 'disabled':
        return false;
      default:
        return false;
    }
  }, []);

  /**
   * Automatic backup check interval
   */
  useEffect(() => {
    if (!backupSettings?.enabled || !isSupported) {
      return;
    }

    const checkInterval = setInterval(async () => {
      if (backupSettings && isBackupDue(backupSettings)) {
        console.log('Automatic backup is due, performing backup...');
        await performBackup(backupSettings);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Also check immediately
    if (backupSettings && isBackupDue(backupSettings)) {
      performBackup(backupSettings);
    }

    return () => clearInterval(checkInterval);
  }, [backupSettings, isSupported, isBackupDue, performBackup]);

  /**
   * Backup on page unload (best effort)
   */
  useEffect(() => {
    if (!backupSettings?.enabled || !isSupported) {
      return;
    }

    const handleBeforeUnload = async () => {
      if (backupSettings && isBackupDue(backupSettings)) {
        // Note: This may not complete before page unloads, it's best effort
        await performBackup(backupSettings);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [backupSettings, isSupported, isBackupDue, performBackup]);

  return {
    isSupported,
    backupSettings,
    lastError,
    selectBackupDirectory,
    performBackup: () => performBackup(),
    updateSettings,
    isBackupDue: backupSettings ? isBackupDue(backupSettings) : false,
  };
}
