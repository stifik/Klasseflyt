/**
 * Auto Check-In Service
 * Handles automatic activation of check-in sessions based on bell times
 */

import { db } from './db';
import type { BellTime, CheckInSettings as CheckInSettingsType } from './types';

// Dev mode overrides (stored in localStorage)
function getDevWeekdayOverride(): 'mandag' | 'tirsdag' | 'onsdag' | 'torsdag' | 'fredag' | null {
  if (typeof window === 'undefined') return null;
  const override = window.localStorage?.getItem('dev_weekday_override');
  return override as any;
}

function getDevTimeOverride(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage?.getItem('dev_time_override');
}

// Get current weekday in Norwegian
export function getCurrentWeekday(): 'mandag' | 'tirsdag' | 'onsdag' | 'torsdag' | 'fredag' | null {
  // Check for dev override first
  const devOverride = getDevWeekdayOverride();
  if (devOverride) return devOverride;

  const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  const dayIndex = new Date().getDay();
  const dayName = days[dayIndex];

  if (dayName === 'lørdag' || dayName === 'søndag') return null;
  return dayName as 'mandag' | 'tirsdag' | 'onsdag' | 'torsdag' | 'fredag';
}

// Get current time in HH:MM format
export function getCurrentTime(): string {
  // Check for dev override first
  const devOverride = getDevTimeOverride();
  if (devOverride) return devOverride;

  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Check if there's an active bell time now
export async function getActiveBellTime(): Promise<BellTime | null> {
  const weekday = getCurrentWeekday();
  if (!weekday) return null;

  const currentTime = getCurrentTime();
  const bellTimes = await db.bellTimes.where('weekday').equals(weekday).toArray();

  // Find bell time that matches current time
  const activeBell = bellTimes.find(bt => bt.time === currentTime);
  return activeBell || null;
}

// Calculate minutes since bell time
export function getMinutesSince(bellTime: string): number {
  // Use dev time override if set, otherwise use actual time
  const currentTime = getCurrentTime();
  const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
  const [bellHours, bellMinutes] = bellTime.split(':').map(Number);

  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const bellTotalMinutes = bellHours * 60 + bellMinutes;

  return currentTotalMinutes - bellTotalMinutes;
}

// Calculate points percentage based on time elapsed
export function calculatePointsPercent(
  minutesElapsed: number,
  bellType: 'morgen' | 'ordinær',
  settings: CheckInSettingsType
): 100 | 50 | 10 | 0 {
  if (bellType === 'morgen') {
    if (minutesElapsed <= settings.morning.percent100Minutes) return 100;
    if (minutesElapsed <= settings.morning.percent50Minutes) return 50;
    if (minutesElapsed <= settings.morning.percent10Minutes) return 10;
    return 0;
  } else {
    if (minutesElapsed <= settings.regular.percent100Minutes) return 100;
    return 0;
  }
}

// Check if student has already checked in for this bell time today
export async function hasStudentCheckedIn(studentId: number, bellTimeId: number): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const log = await db.checkInLogs
    .where('[studentId+bellTimeId+date]')
    .equals([studentId, bellTimeId, today])
    .first();
  
  return !!log;
}

// Check if listening should stop
export function shouldStopListening(
  minutesElapsed: number,
  bellType: 'morgen' | 'ordinær',
  settings: CheckInSettingsType
): boolean {
  if (bellType === 'morgen') {
    return minutesElapsed > settings.morning.absenceMinutes;
  } else {
    return minutesElapsed > settings.regular.stopMinutes;
  }
}

// Get students who haven't checked in (for absence registration)
export async function getStudentsNotCheckedIn(bellTimeId: number): Promise<number[]> {
  const allStudents = await db.students.toArray();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get all check-ins for this bell time today
  const checkIns = await db.checkInLogs
    .where('bellTimeId')
    .equals(bellTimeId)
    .and(log => {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    })
    .toArray();
  
  const checkedInIds = new Set(checkIns.map(log => log.studentId));
  
  // Get already absent students
  const absences = await db.absences
    .filter(a => {
      const absDate = new Date(a.date);
      absDate.setHours(0, 0, 0, 0);
      return absDate.getTime() === today.getTime();
    })
    .toArray();
  
  const absentIds = new Set(absences.map(a => a.studentId));
  
  // Return students who haven't checked in and aren't already absent
  return allStudents
    .filter(s => s.id && !checkedInIds.has(s.id) && !absentIds.has(s.id))
    .map(s => s.id!);
}

// Register students as absent
export async function registerAbsences(studentIds: number[]): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const absences = studentIds.map(studentId => ({
    studentId,
    date: today,
  }));
  
  await db.absences.bulkAdd(absences as any);
}
