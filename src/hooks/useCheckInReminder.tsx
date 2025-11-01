/**
 * Hook for check-in reminders
 * Shows a toast notification before automatic check-in sessions start
 */

import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';

const REMINDER_MINUTES_BEFORE = 2; // Show reminder 2 minutes before check-in starts

export function useCheckInReminder() {
  const { toast } = useToast();
  const router = useRouter();
  const settings = useLiveQuery(() => db.settings.get('userSettings'));
  const notifiedBellTimesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only run if check-in settings are enabled
    if (!settings?.checkInSettings) return;

    const checkForUpcomingBellTimes = async () => {
      const now = new Date();
      const weekdayNames = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
      const todayWeekday = weekdayNames[now.getDay()];

      // Get today's bell times
      const bellTimes = await db.bellTimes
        .where('weekday')
        .equals(todayWeekday as any)
        .toArray();

      for (const bellTime of bellTimes) {
        // Parse bell time
        const [hours, minutes] = bellTime.time.split(':').map(Number);
        const bellDateTime = new Date(now);
        bellDateTime.setHours(hours, minutes, 0, 0);

        // Calculate minutes until bell time
        const minutesUntil = Math.floor((bellDateTime.getTime() - now.getTime()) / 1000 / 60);

        // Create unique key for this bell time today
        const bellKey = `${todayWeekday}-${bellTime.id}-${bellTime.time}`;

        // Show reminder if:
        // 1. It's exactly REMINDER_MINUTES_BEFORE (±30 seconds for timing tolerance)
        // 2. We haven't already notified for this bell time today
        if (
          minutesUntil >= REMINDER_MINUTES_BEFORE - 0.5 &&
          minutesUntil <= REMINDER_MINUTES_BEFORE + 0.5 &&
          !notifiedBellTimesRef.current.has(bellKey)
        ) {
          console.log('[CHECK-IN REMINDER] Showing reminder for:', bellTime);
          
          // Mark as notified
          notifiedBellTimesRef.current.add(bellKey);

          // Show toast with action button - stays until dismissed
          toast({
            title: `🔔 Innsjekking starter om ${REMINDER_MINUTES_BEFORE} minutter`,
            description: `${bellTime.type === 'morgen' ? 'Morgen' : 'Ordinær'} innsjekking kl ${bellTime.time}`,
            action: (
              <ToastAction
                altText="Gå til innsjekking"
                onClick={() => {
                  router.push('/innsjekking');
                }}
              >
                Gå til innsjekking
              </ToastAction>
            ),
            duration: Infinity, // Stay visible until user interacts (click X or action button)
          });
        }
      }
    };

    // Check immediately
    checkForUpcomingBellTimes();

    // Check every 30 seconds for better timing accuracy
    const interval = setInterval(checkForUpcomingBellTimes, 30000);

    return () => clearInterval(interval);
  }, [settings, toast, router]);

  // Clear notified bell times at midnight to allow next-day notifications
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log('[CHECK-IN REMINDER] Clearing notified bell times at midnight');
        notifiedBellTimesRef.current.clear();
      }
    };

    // Check every minute for midnight reset
    const interval = setInterval(checkMidnight, 60000);
    return () => clearInterval(interval);
  }, []);
}
