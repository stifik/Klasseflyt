'use client';

import { useState, useEffect } from 'react';
import type { CheckInSettings } from '@/lib/types';

type ClockProps = {
  bellTime?: string; // HH:MM format
  checkInSettings?: CheckInSettings['morning'];
};

type ClockColor = 'green' | 'yellow' | 'orange' | 'red';

export default function Clock({ bellTime, checkInSettings }: ClockProps) {
  const [time, setTime] = useState(new Date());
  const [clockColor, setClockColor] = useState<ClockColor>('green');

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (bellTime && checkInSettings) {
      const minutesSinceBell = getMinutesSinceBellTime(bellTime, time);
      setClockColor(getClockColor(minutesSinceBell, checkInSettings));
    }
  }, [time, bellTime, checkInSettings]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={`clock clock-${clockColor}`}>
      {formatTime(time)}
    </div>
  );
}

function getMinutesSinceBellTime(bellTime: string, currentTime: Date): number {
  const [hours, minutes] = bellTime.split(':').map(Number);
  const bellDate = new Date(currentTime);
  bellDate.setHours(hours, minutes, 0, 0);

  const diffMs = currentTime.getTime() - bellDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  return diffMinutes;
}

function getClockColor(
  minutesSinceBell: number,
  settings: {
    percent100Minutes: number;
    percent50Minutes: number;
    percent10Minutes: number;
  }
): ClockColor {
  if (minutesSinceBell < 0) return 'green'; // Before bell time
  if (minutesSinceBell < settings.percent100Minutes) return 'green'; // 100% points
  if (minutesSinceBell < settings.percent50Minutes) return 'yellow'; // 50% points
  if (minutesSinceBell < settings.percent10Minutes) return 'orange'; // 10% points
  return 'red'; // Too late
}
