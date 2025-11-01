"use client";

import { useCheckInReminder } from '@/hooks/useCheckInReminder';

/**
 * Component that shows check-in reminders
 * Place this in the root layout to enable global reminders
 */
export function CheckInReminderToast() {
  useCheckInReminder();
  return null;
}
