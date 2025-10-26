'use client';

import { useState, useEffect } from 'react';
import { getCurrentTime } from '@/lib/autoCheckInService';
import type { CheckInSettings } from '@/lib/types';

type ClockProps = {
  bellTime?: string; // HH:MM format
  checkInSettings?: CheckInSettings['morning'];
};

type ClockColor = 'green' | 'yellow' | 'orange' | 'red';

export default function Clock({ bellTime, checkInSettings }: ClockProps) {
  const [time, setTime] = useState<Date | null>(null);
  const [displayTime, setDisplayTime] = useState<string>('');
  const [clockColor, setClockColor] = useState<ClockColor | null>(null); // null når ingen bellTime

  // Initialize time on client side only
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now);
      
      // Check for dev mode time override
      const devTimeOverride = typeof window !== 'undefined' 
        ? window.localStorage?.getItem('dev_time_override') 
        : null;
      
      if (devTimeOverride) {
        // Use dev time override
        const [hours, minutes] = devTimeOverride.split(':').map(Number);
        setDisplayTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      } else {
        // Use actual time
        setDisplayTime(now.toLocaleTimeString('nb-NO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (time && bellTime && checkInSettings) {
      const minutesSinceBell = getMinutesSinceBellTime(bellTime);
      const color = getClockColor(minutesSinceBell, checkInSettings);
      setClockColor(color);
    } else {
      // No bellTime or checkInSettings - show clock without color
      setClockColor(null);
    }
  }, [time, bellTime, checkInSettings]);

  // Prevent hydration mismatch by not rendering until client-side
  if (!time) {
    return (
      <div className="clock">
        --:--:--
      </div>
    );
  }

  return (
    <div className={`clock ${clockColor ? `clock-${clockColor}` : ''}`}>
      {displayTime}
    </div>
  );
}

function getMinutesSinceBellTime(bellTime: string): number {
  // Use the same getCurrentTime function as check-in to respect dev overrides
  const currentTime = getCurrentTime();
  const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
  const [bellHours, bellMinutes] = bellTime.split(':').map(Number);

  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const bellTotalMinutes = bellHours * 60 + bellMinutes;

  return currentTotalMinutes - bellTotalMinutes;
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
  if (minutesSinceBell <= 2) return 'green'; // 0-2 minutes
  if (minutesSinceBell <= 4) return 'yellow'; // 3-4 minutes
  if (minutesSinceBell <= 6) return 'orange'; // 5-6 minutes
  return 'red'; // 7+ minutes
}
