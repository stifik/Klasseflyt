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

/**
 * Handle NFC card tap during check-in session
 */
export async function handleCheckInTap(
  cardUid: string,
  activeSession: ActiveCheckInSession
): Promise<CheckInTapResult> {
  // Find student by card UID
  const student = await db.students.where('nfcCard').equals(cardUid).first();

  if (!student || !student.id) {
    return {
      success: false,
      message: 'Kortet er ikke registrert på noen elev',
      soundType: 'error',
    };
  }

  // Check if already checked in
  const alreadyCheckedIn = await hasStudentCheckedIn(student.id, activeSession.bellTime.id!);
  if (alreadyCheckedIn) {
    return {
      success: false,
      message: `${student.name} har allerede sjekket inn`,
      studentName: student.name,
      soundType: 'error',
    };
  }

  // Check if student is marked as absent
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const absence = await db.absences
    .where('studentId')
    .equals(student.id)
    .and(a => {
      const absDate = new Date(a.date);
      absDate.setHours(0, 0, 0, 0);
      return absDate.getTime() === today.getTime();
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
      date: today,
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
  const alreadyCheckedIn = await hasStudentCheckedIn(student.id, activeSession.bellTime.id!);
  if (alreadyCheckedIn) {
    return {
      success: false,
      message: `${student.name} har allerede sjekket inn`,
      studentName: student.name,
      soundType: 'error',
    };
  }

  // Check if student is marked as absent
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const absence = await db.absences
    .where('studentId')
    .equals(student.id)
    .and(a => {
      const absDate = new Date(a.date);
      absDate.setHours(0, 0, 0, 0);
      return absDate.getTime() === today.getTime();
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
      date: today,
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
