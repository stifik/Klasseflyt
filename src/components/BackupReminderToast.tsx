"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { shouldShowReminder, snoozeReminder, getLastBackupDescription } from '@/lib/backupReminder';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/button';
import { Database, Clock, X } from 'lucide-react';

export function BackupReminderToast() {
  const { toast } = useToast();
  const router = useRouter();
  const [hasShownReminder, setHasShownReminder] = useState(false);

  // Get backup reminder settings from database
  const dbSettings = useLiveQuery(() => db.settings.get('userSettings'));
  const backupReminderDays = dbSettings?.backupReminderDays ?? 7; // Default to weekly

  useEffect(() => {
    // Only run on client side and only once per session
    if (typeof window === 'undefined' || hasShownReminder) return;
    
    // Wait for dbSettings to load
    if (!dbSettings) return;

    // Don't show reminder during onboarding
    if (!dbSettings.onboardingCompleted) return;

    // Wait 60 minutes before showing backup reminder (to avoid collision with first-time setup)
    const showReminderTimer = setTimeout(async () => {
      // Check if we should show reminder
      if (await shouldShowReminder(backupReminderDays)) {
        const lastBackupText = await getLastBackupDescription();

        toast({
          title: (
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <span>Tid for backup!</span>
            </div>
          ) as any,
          description: (
            <div className="space-y-3 mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Siste backup: <strong>{lastBackupText}</strong>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Ta en sikkerhetskopi av dataene dine for å unngå tap.
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    router.push('/settings?tab=database');
                    toast({
                      title: 'Åpner innstillinger...',
                      description: 'Gå til Database-fanen for å ta backup',
                    });
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Database className="w-4 h-4" />
                  Backup nå
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    snoozeReminder(3);
                    toast({
                      title: 'Påminnelse utsatt',
                      description: 'Du får påminnelse om 3 dager',
                    });
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  Om 3 dager
                </Button>
              </div>
            </div>
          ) as any,
          duration: Infinity, // Don't auto-dismiss
        });

        setHasShownReminder(true);
      }
    }, 60 * 60 * 1000); // 60 minutes delay

    return () => clearTimeout(showReminderTimer);
  }, [backupReminderDays, hasShownReminder, toast, router, dbSettings]);

  return null; // This component doesn't render anything
}
