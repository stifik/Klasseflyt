/**
 * Hook for automatic check-in timer
 * Checks for active bell times and triggers check-in sessions
 */

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
  getActiveBellTime,
  getMinutesSince,
  shouldStopListening,
  registerAbsences,
  getStudentsNotCheckedIn,
} from '@/lib/autoCheckInService';
import type { BellTime } from '@/lib/types';

export interface ActiveCheckInSession {
  bellTime: BellTime;
  minutesElapsed: number;
  pointsPercent: 100 | 50 | 10 | 0;
  shouldStop: boolean;
}

export function useCheckInTimer() {
  const [activeSession, setActiveSession] = useState<ActiveCheckInSession | null>(null);
  const settings = useLiveQuery(() => db.settings.get('userSettings'));
  
  useEffect(() => {
    if (!settings?.checkInSettings) return;

    const checkForBellTime = async () => {
      const activeBell = await getActiveBellTime();
      
      if (activeBell) {
        const minutesElapsed = getMinutesSince(activeBell.time);
        const shouldStop = shouldStopListening(
          minutesElapsed,
          activeBell.type,
          settings.checkInSettings!
        );
        
        // Calculate points percentage
        let pointsPercent: 100 | 50 | 10 | 0 = 0;
        if (activeBell.type === 'morgen') {
          if (minutesElapsed <= settings.checkInSettings!.morning.percent100Minutes) pointsPercent = 100;
          else if (minutesElapsed <= settings.checkInSettings!.morning.percent50Minutes) pointsPercent = 50;
          else if (minutesElapsed <= settings.checkInSettings!.morning.percent10Minutes) pointsPercent = 10;
        } else {
          if (minutesElapsed <= settings.checkInSettings!.regular.percent100Minutes) pointsPercent = 100;
        }
        
        setActiveSession({
          bellTime: activeBell,
          minutesElapsed,
          pointsPercent,
          shouldStop,
        });
        
        // Handle absence registration for morning check-ins
        if (activeBell.type === 'morgen' && 
            minutesElapsed === settings.checkInSettings!.morning.absenceMinutes) {
          const notCheckedIn = await getStudentsNotCheckedIn(activeBell.id!);
          if (notCheckedIn.length > 0) {
            await registerAbsences(notCheckedIn);
          }
        }
        
        // Clear session when time is up
        if (shouldStop) {
          setActiveSession(null);
        }
      } else {
        setActiveSession(null);
      }
    };

    // Check immediately
    checkForBellTime();

    // Check every 30 seconds
    const interval = setInterval(checkForBellTime, 30000);

    return () => clearInterval(interval);
  }, [settings]);

  return activeSession;
}
