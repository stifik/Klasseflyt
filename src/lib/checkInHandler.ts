/**
 * Check-in Handler
 * Handles NFC card taps during check-in sessions
 */

import { db } from './db';
import { 
  hasStudentCheckedIn, 
  calculatePointsPercent, 
  getMinutesSince 
} from './autoCheckInService';
import type { ActiveCheckInSession } from '@/hooks/useCheckInTimer';
import { givePoints } from './rewardService';

export interface CheckInTapResult {
  success: boolean;
  studentName?: string;
  pointsAwarded?: number;
  pointsPercent?: 100 | 50 | 10 | 0;
  message: string;
  soundType: 'success' | 'error';
}

// Helper function to get today's date at noon (avoids timezone issues)
function getTodayAtNoon(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

/**
 * Handle NFC card tap during check-in session
 */
export async function handleCheckInTap(
  cardUid: string,
  activeSession: ActiveCheckInSession
): Promise<CheckInTapResult> {
  // Find student by card UID
  // Normalize UID for comparison (strip separators, lowercase)
  const normalizeUid = (u?: string | null) => (u || '').toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const normalizedUid = normalizeUid(cardUid);

  // Try direct indexed lookup first
  let student: any = await db.students.where('nfcCard').equals(cardUid).first();

  // If not found, try normalized search across students (covers stored formats like without colons)
  if (!student) {
    try {
      student = await db.students.filter(s => normalizeUid((s as any).nfcCard) === normalizedUid).first();
    } catch (err) {
      console.warn('Normalized student lookup failed, falling back to rfidCards', err);
    }
  }

  // As a last resort, try rfidCards mapping (some setups store card->student in rfidCards table)
  if (!student) {
    const linked = await db.rfidCards.where('cardId').equals(cardUid).first();
    if (linked && linked.studentId) {
      student = await db.students.get(linked.studentId);
    } else {
      // try normalized match on rfidCards
      const linked2 = await db.rfidCards.filter(c => normalizeUid(c.cardId) === normalizedUid).first();
      if (linked2 && linked2.studentId) {
        student = await db.students.get(linked2.studentId);
      }
    }
  }

  if (!student || !student.id) {
    return {
      success: false,
      message: 'Kortet er ikke registrert på noen elev',
      soundType: 'error',
    };
  }

  // Check if already checked in
  console.debug('[handleCheckInTap] Checking existing check-in', { studentId: student.id, bellTimeId: activeSession.bellTime.id });
  const alreadyCheckedIn = await hasStudentCheckedIn(student.id, activeSession.bellTime.id!);
  if (alreadyCheckedIn) {
    // Query and log any matching logs for diagnostics
    try {
      const today = getTodayAtNoon();
      const todayString = today.toISOString().split('T')[0];
      const matching = await db.checkInLogs
        .where('studentId')
        .equals(student.id)
        .and(l => l.bellTimeId === activeSession.bellTime.id! && new Date((l as any).date).toISOString().split('T')[0] === todayString)
        .toArray();
      console.warn('[handleCheckInTap] Blocking check-in because existing logs found', { studentId: student.id, bellTimeId: activeSession.bellTime.id, matching });
    } catch (err) {
      console.error('[handleCheckInTap] Failed to query matching checkInLogs for diagnostics', err);
    }

    return {
      success: false,
      message: `${student.name} har allerede sjekket inn`,
      studentName: student.name,
      soundType: 'error',
    };
  }

  // Check if student is marked as absent
  const today = getTodayAtNoon();
  const todayString = today.toISOString().split('T')[0];
  
  const absence = await db.absences
    .where('studentId')
    .equals(student.id)
    .and(a => {
      const absDate = new Date(a.date);
      const absDateString = absDate.toISOString().split('T')[0];
      return absDateString === todayString;
    })
    .first();

  if (absence) {
    return {
      success: false,
      message: `${student.name} er markert som fraværende`,
      studentName: student.name,
      soundType: 'error',
    };
  }

  // Get settings
  const settings = await db.settings.get('userSettings');
  if (!settings?.checkInSettings) {
    return {
      success: false,
      message: 'Innsjekking er ikke konfigurert',
      soundType: 'error',
    };
  }

  // Calculate minutes elapsed and points
  const minutesElapsed = getMinutesSince(activeSession.bellTime.time);
  const pointsPercent = calculatePointsPercent(
    minutesElapsed,
    activeSession.bellTime.type,
    settings.checkInSettings
  );

  // Check if time is up
  if (pointsPercent === 0) {
    return {
      success: false,
      message: `${student.name}: Tiden er ute for å sjekke inn`,
      studentName: student.name,
      soundType: 'error',
    };
  }

  // Calculate actual points (percentage of bell time points)
  const pointsAwarded = Math.round((activeSession.bellTime.points * pointsPercent) / 100);

  // Record check-in log
  try {
    await db.checkInLogs.add({
      studentId: student.id,
      bellTimeId: activeSession.bellTime.id!,
      timestamp: new Date(),
      pointsPercent,
      pointsAwarded,
      date: today, // Use noon date to match absence system
    });

    // Award points
    await givePoints(student.id, pointsAwarded, `Innsjekking (${pointsPercent}%)`);

    // Choose sound based on percentage
    const soundType: 'success' | 'error' = (pointsPercent === 50 || pointsPercent === 10) ? 'error' : 'success';

    return {
      success: true,
      studentName: student.name,
      pointsAwarded,
      pointsPercent,
      message: `${student.name}: +${pointsAwarded} poeng (${pointsPercent}%)`,
      soundType,
    };
  } catch (error) {
    // Handle Dexie ConstraintError when a duplicate unique index prevents inserting
    const errAny = error as any;
    if (errAny && (errAny.name === 'ConstraintError' || (errAny.message && String(errAny.message).includes('Unable to add key to index')))) {
      console.warn('Duplicate check-in prevented by DB unique index:', errAny);
      try {
        const today = getTodayAtNoon();
        const todayString = today.toISOString().split('T')[0];
        const matching = await db.checkInLogs
          .where('studentId')
          .equals(student.id)
          .and(l => l.bellTimeId === activeSession.bellTime.id! && new Date((l as any).date).toISOString().split('T')[0] === todayString)
          .toArray();
        console.warn('[handleCheckInTap] Existing logs causing ConstraintError', { studentId: student.id, bellTimeId: activeSession.bellTime.id, matching });
      } catch (err) {
        console.error('[handleCheckInTap] Failed to query matching checkInLogs after ConstraintError', err);
      }
      return {
        success: false,
        message: `${student.name} er allerede registrert.`,
        studentName: student.name,
        soundType: 'error',
      };
    }

    console.error('Check-in error:', error);
    return {
      success: false,
      message: `Kunne ikke registrere innsjekking for ${student.name}`,
      studentName: student.name,
      soundType: 'error',
    };
  }
}

/**
 * Handle manual check-in during check-in session
 */
export async function handleManualCheckIn(
  studentId: number,
  activeSession: ActiveCheckInSession
): Promise<CheckInTapResult> {
  // Find student by ID
  const student = await db.students.get(studentId);

  if (!student || !student.id) {
    return {
      success: false,
      message: 'Eleven ble ikke funnet',
      soundType: 'error',
    };
  }

  // Check if already checked in
  console.debug('[handleManualCheckIn] Checking existing check-in', { studentId: student.id, bellTimeId: activeSession.bellTime.id });
  const alreadyCheckedIn = await hasStudentCheckedIn(student.id, activeSession.bellTime.id!);
  if (alreadyCheckedIn) {
    try {
      const today = getTodayAtNoon();
      const todayString = today.toISOString().split('T')[0];
      const matching = await db.checkInLogs
        .where('studentId')
        .equals(student.id)
        .and(l => l.bellTimeId === activeSession.bellTime.id! && new Date((l as any).date).toISOString().split('T')[0] === todayString)
        .toArray();
      console.warn('[handleManualCheckIn] Blocking manual check-in because existing logs found', { studentId: student.id, bellTimeId: activeSession.bellTime.id, matching });
    } catch (err) {
      console.error('[handleManualCheckIn] Failed to query matching checkInLogs for diagnostics', err);
    }

    return {
      success: false,
      message: `${student.name} har allerede sjekket inn`,
      studentName: student.name,
      soundType: 'error',
    };
  }

  // Check if student is marked as absent
  const today = getTodayAtNoon();
  const todayString = today.toISOString().split('T')[0];
  
  const absence = await db.absences
    .where('studentId')
    .equals(student.id)
    .and(a => {
      const absDate = new Date(a.date);
      const absDateString = absDate.toISOString().split('T')[0];
      return absDateString === todayString;
    })
    .first();

  if (absence) {
    return {
      success: false,
      message: `${student.name} er markert som fraværende`,
      studentName: student.name,
      soundType: 'error',
    };
  }

  // Get settings
  const settings = await db.settings.get('userSettings');
  if (!settings?.checkInSettings) {
    return {
      success: false,
      message: 'Innsjekking er ikke konfigurert',
      soundType: 'error',
    };
  }

  // Calculate minutes elapsed and points
  const minutesElapsed = getMinutesSince(activeSession.bellTime.time);
  const pointsPercent = calculatePointsPercent(
    minutesElapsed,
    activeSession.bellTime.type,
    settings.checkInSettings
  );

  // Check if time is up
  if (pointsPercent === 0) {
    return {
      success: false,
      message: `${student.name}: Tiden er ute for å sjekke inn`,
      studentName: student.name,
      soundType: 'error',
    };
  }

  // Calculate actual points (percentage of bell time points)
  const pointsAwarded = Math.round((activeSession.bellTime.points * pointsPercent) / 100);

  // Record check-in log
  try {
    await db.checkInLogs.add({
      studentId: student.id,
      bellTimeId: activeSession.bellTime.id!,
      timestamp: new Date(),
      pointsPercent,
      pointsAwarded,
      date: today, // Use noon date to match absence system
    });

    // Award points
    await givePoints(student.id, pointsAwarded, `Innsjekking (${pointsPercent}%)`);

    // Choose sound based on percentage
    const soundType: 'success' | 'error' = (pointsPercent === 50 || pointsPercent === 10) ? 'error' : 'success';

    return {
      success: true,
      studentName: student.name,
      pointsAwarded,
      pointsPercent,
      message: `${student.name}: +${pointsAwarded} poeng (${pointsPercent}%)`,
      soundType,
    };
  } catch (error) {
    console.error('Manual check-in error:', error);
    return {
      success: false,
      message: `Kunne ikke registrere innsjekking for ${student.name}`,
      studentName: student.name,
      soundType: 'error',
    };
  }
}
