import { db } from './db';
import type { Weekday, TimePeriod } from './types';

/**
 * Gets the current weekday as a Weekday type
 */
export function getCurrentWeekday(date: Date = new Date()): Weekday | null {
  const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  const weekdayMap: Record<number, Weekday> = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
  };

  return weekdayMap[dayIndex] || null;
}

/**
 * Gets the current time period based on the current time
 */
export async function getCurrentTimePeriod(currentTime?: string): Promise<TimePeriod | null> {
  // Get all time periods sorted by order
  const periods = await db.timePeriods.orderBy('order').toArray();

  if (periods.length === 0) {
    return null;
  }

  // Use provided time or current time
  const timeToCheck = currentTime || getCurrentTimeString();

  // Find the appropriate period
  // Logic: Find the latest period whose startTime is <= current time
  let selectedPeriod: TimePeriod | null = null;

  for (const period of periods) {
    if (period.startTime <= timeToCheck) {
      selectedPeriod = period;
    } else {
      break; // Since periods are sorted, we can stop here
    }
  }

  // If no period matched (time is before all periods), use the first period
  if (!selectedPeriod) {
    selectedPeriod = periods[0];
  }

  return selectedPeriod;
}

/**
 * Gets current time as HH:MM string
 */
function getCurrentTimeString(): string {
  // Check for dev time override
  const devTimeOverride = localStorage.getItem('dev_time_override');
  if (devTimeOverride) {
    return devTimeOverride;
  }

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Gets a random message from a time-based message slot
 * Implements smart rotation (no repeats until all messages are used)
 */
export async function getTimeBasedMessage(
  messageType: 'welcome' | 'instruction',
  weekday?: Weekday,
  timePeriod?: TimePeriod
): Promise<string> {
  // Get current context if not provided
  const currentWeekday = weekday || getCurrentWeekday();
  const currentPeriod = timePeriod || await getCurrentTimePeriod();

  if (!currentWeekday || !currentPeriod) {
    // Fall back to default message
    return getDefaultMessage(messageType);
  }

  // Try to find message for this slot
  const message = await db.timeBasedMessages
    .where('[weekday+timePeriodId+messageType]')
    .equals([currentWeekday, currentPeriod.id!, messageType])
    .first();

  if (!message || !message.messages || message.messages.trim() === '') {
    // No message for this slot, use default
    return getDefaultMessage(messageType);
  }

  // Split messages by line and filter empty lines
  const messageLines = message.messages
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (messageLines.length === 0) {
    return getDefaultMessage(messageType);
  }

  // Get random message with smart rotation
  return getRandomMessageWithRotation(
    messageLines,
    `timebased_${messageType}_${currentWeekday}_${currentPeriod.id}`
  );
}

/**
 * Gets the default/fallback message
 */
async function getDefaultMessage(messageType: 'welcome' | 'instruction'): Promise<string> {
  const defaultMsg = await db.defaultMessages
    .where('messageType')
    .equals(messageType)
    .first();

  if (!defaultMsg || !defaultMsg.messages) {
    // Ultimate fallback
    return messageType === 'welcome'
      ? 'Velkommen til skolen!'
      : 'Begynn på oppgavene';
  }

  const messageLines = defaultMsg.messages
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (messageLines.length === 0) {
    return messageType === 'welcome'
      ? 'Velkommen til skolen!'
      : 'Begynn på oppgavene';
  }

  return getRandomMessageWithRotation(
    messageLines,
    `timebased_default_${messageType}`
  );
}

/**
 * Smart rotation: picks random message without repeating until all are used
 */
function getRandomMessageWithRotation(messages: string[], storageKey: string): string {
  if (messages.length === 1) {
    return messages[0];
  }

  try {
    // Get or create queue
    let queue: number[] = [];
    const storedQueue = localStorage.getItem(storageKey);

    if (storedQueue) {
      queue = JSON.parse(storedQueue);
    }

    // If queue is empty or has wrong length, rebuild it
    if (queue.length === 0 || queue.length > messages.length) {
      queue = Array.from({ length: messages.length }, (_, i) => i);
      shuffleArray(queue);
    }

    // Pick next message from queue
    const index = queue.pop()!;

    // Save updated queue
    localStorage.setItem(storageKey, JSON.stringify(queue));

    return messages[index];
  } catch (error) {
    console.error('Error in message rotation:', error);
    // Fallback to random selection
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Check if time-based messages are enabled in settings
 */
export async function isTimeBasedMessagesEnabled(): Promise<boolean> {
  const settings = await db.settings.get('userSettings');
  return settings?.morningDisplaySettings?.useTimeBasedMessages ?? false;
}
