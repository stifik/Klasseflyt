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
  isManual?: boolean; // Flag for manually triggered sessions
}

export function useCheckInTimer() {
  const [activeSession, setActiveSession] = useState<ActiveCheckInSession | null>(null);
  const [manualSession, setManualSession] = useState<BellTime | null>(null);
  const settings = useLiveQuery(() => db.settings.get('userSettings'));

  // Function to manually start a check-in session
  const startManualCheckIn = (type: 'morgen' | 'ordinær', points: number = 10) => {
    console.log('[CHECK-IN] Starting manual check-in:', type, 'points:', points);
    const manualBell: BellTime = {
      id: -Date.now(), // Unique temporary negative ID for manual session
      weekday: 'mandag', // Doesn't matter for manual
      time: new Date().toTimeString().substring(0, 5),
      points,
      type,
    };
    console.log('[CHECK-IN] Created manual bell:', manualBell);
    setManualSession(manualBell);
  };

  // Function to stop manual session
  const stopManualCheckIn = () => {
    setManualSession(null);
  };
  
  useEffect(() => {
    console.log('[CHECK-IN TIMER] Effect running, settings:', !!settings, 'checkInSettings:', !!settings?.checkInSettings, 'manualSession:', manualSession);
    if (!settings?.checkInSettings) return;

    const checkForBellTime = async () => {
      // Prioritize manual session
      if (manualSession) {
        console.log('[CHECK-IN TIMER] Processing manual session:', manualSession);
        const minutesElapsed = getMinutesSince(manualSession.time);
        const shouldStop = shouldStopListening(
          minutesElapsed,
          manualSession.type,
          settings.checkInSettings!
        );

        // Calculate points percentage based on session type
        let pointsPercent: 100 | 50 | 10 | 0 = 0;
        if (manualSession.type === 'morgen') {
          if (minutesElapsed < settings.checkInSettings!.morning.percent100Minutes) pointsPercent = 100;
          else if (minutesElapsed < settings.checkInSettings!.morning.percent50Minutes) pointsPercent = 50;
          else if (minutesElapsed < settings.checkInSettings!.morning.percent10Minutes) pointsPercent = 10;
        } else {
          if (minutesElapsed < settings.checkInSettings!.regular.percent100Minutes) pointsPercent = 100;
        }

        setActiveSession({
          bellTime: manualSession,
          minutesElapsed,
          pointsPercent,
          shouldStop,
          isManual: true,
        });

        if (shouldStop) {
          setManualSession(null);
          setActiveSession(null);
        }
        return;
      }

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
          if (minutesElapsed < settings.checkInSettings!.morning.percent100Minutes) pointsPercent = 100;
          else if (minutesElapsed < settings.checkInSettings!.morning.percent50Minutes) pointsPercent = 50;
          else if (minutesElapsed < settings.checkInSettings!.morning.percent10Minutes) pointsPercent = 10;
        } else {
          if (minutesElapsed < settings.checkInSettings!.regular.percent100Minutes) pointsPercent = 100;
        }
        
        setActiveSession({
          bellTime: activeBell,
          minutesElapsed,
          pointsPercent,
          shouldStop,
          isManual: false,
        });
        
        // Handle absence registration for morning check-ins
        // Register absences when we reach or pass the absence time, but only once
        if (activeBell.type === 'morgen' &&
            minutesElapsed >= settings.checkInSettings!.morning.absenceMinutes &&
            minutesElapsed <= settings.checkInSettings!.morning.absenceMinutes + 1) {
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

    // Check every 5 seconds for better responsiveness
    const interval = setInterval(checkForBellTime, 5000);

    return () => clearInterval(interval);
  }, [settings, manualSession]);

  return { activeSession, startManualCheckIn, stopManualCheckIn };
}
