'use client';

import { useEffect, useState } from 'react';
import Clock from './Clock';
import StudentList from './StudentList';
import WelcomeSection from './WelcomeSection';
import ClassGoalProgressBar from '@/components/ClassGoalProgressBar';
import { db } from '@/lib/db';
import { getCurrentTime } from '@/lib/autoCheckInService';
import type { CheckInSettings } from '@/lib/types';

type Student = {
  id: number;
  name: string;
  points: number;
  status: 'waiting' | 'checked-in' | 'absent';
};

type Slide1Props = {
  students: Student[];
  welcomeMessage: string;
  instructions: string;
  className: string;
  bellTime?: string;
  checkInSettings?: CheckInSettings['morning'];
  onNavigateToDagsplan: () => void;
};

type ClockColor = 'green' | 'yellow' | 'orange' | 'red';

// include transparent when outside check-in
type HeaderColor = ClockColor | 'transparent';

export default function Slide1({
  students,
  welcomeMessage,
  instructions,
  className,
  bellTime,
  checkInSettings,
  onNavigateToDagsplan,
}: Slide1Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [classTotal, setClassTotal] = useState<number>(0);
  const [goal, setGoal] = useState<{ target: number; lastAchieved?: string }>({ target: 200 });
  const [goalTitle, setGoalTitle] = useState<string>('Felles belønning');
  const [showReset, setShowReset] = useState(false);
  const [headerColor, setHeaderColor] = useState<HeaderColor>('transparent');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Oppdater tid hvert sekund
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Beregn header-farge basert på tid siden bellTime og check-in settings
  useEffect(() => {
    if (currentTime && bellTime && checkInSettings) {
      const minutesSinceBell = getMinutesSinceBellTime(bellTime);
      const color = getClockColor(minutesSinceBell, checkInSettings);
      setHeaderColor(color);
    } else {
      setHeaderColor('transparent');
    }
  }, [currentTime, bellTime, checkInSettings]);

  // Hent klassens totale poeng og mål
  useEffect(() => {
    let mounted = true;
    
    async function getClassTotalPoints() {
      const transactions = await db.transactions.toArray();
      return transactions.reduce((sum, t) => {
        const change = t.pointsChange || 0;
        return change > 0 ? sum + change : sum;
      }, 0);
    }

    async function getClassGoal() {
      const settings = await db.settings.get('userSettings');
      return settings?.classGoal || { target: 200 };
    }

    async function fetchData() {
      const [total, g] = await Promise.all([getClassTotalPoints(), getClassGoal()]);
      const settings = await db.settings.get('userSettings');
      if (mounted) {
        setClassTotal(total);
        setGoal(g);
        setGoalTitle(settings?.communityGoalTitle || 'Felles belønning');
        setShowReset(total >= (g.target || 1));
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        // Ensure we exit fullscreen if ESC is pressed
        document.exitFullscreen().catch(() => {});
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      // ignore
    }
  };

  const handleReset = async () => {
    const settings = await db.settings.get('userSettings');
    if (settings) {
      const target = settings.classGoal?.target ?? 200;
      settings.classGoal = { target, lastAchieved: new Date().toISOString() };
      await db.settings.put(settings);
      await db.transactions.clear();
      setClassTotal(0);
      setShowReset(false);
    }
  };

  // Hjelpefunksjoner for å beregne tid siden bellTime og farge
  function getMinutesSinceBellTime(bellTime: string): number {
    const currentTime = getCurrentTime();
    const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
    const [bellHours, bellMinutes] = bellTime.split(':').map(Number);

    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    const bellTotalMinutes = bellHours * 60 + bellMinutes;

    return currentTotalMinutes - bellTotalMinutes;
  }

  // Use morning check-in settings to compute color, and return 'transparent' when outside period
  function getClockColor(
    minutesSinceBell: number,
    morning: { percent100Minutes: number; percent50Minutes: number; percent10Minutes: number; absenceMinutes: number }
  ): HeaderColor {
    // If before bell time, keep transparent
    if (minutesSinceBell < 0) return 'transparent';

    const { percent100Minutes, percent50Minutes, percent10Minutes, absenceMinutes } = morning;

    if (minutesSinceBell <= percent100Minutes) return 'green';
    if (minutesSinceBell <= percent50Minutes) return 'yellow';
    if (minutesSinceBell <= percent10Minutes) return 'orange';
    if (minutesSinceBell <= absenceMinutes) return 'red';

    // Keep red for 2 minutes after absence window (grace period)
    const postCloseGrace = 2; // minutes to remain red after check-in closes
    if (minutesSinceBell <= absenceMinutes + postCloseGrace) return 'red';

    // Outside check-in + grace period -> transparent
    return 'transparent';
  }

  // Beregn bakgrunnsfarge for header basert på clockColor
  const getHeaderBackgroundColor = () => {
    const colorMap: Record<HeaderColor, string> = {
      'green': 'rgba(34, 197, 94, 0.8)',
      'yellow': 'rgba(234, 179, 8, 0.8)',
      'orange': 'rgba(249, 115, 22, 0.8)',
      'red': 'rgba(239, 68, 68, 0.8)',
      'transparent': 'transparent',
    };
    return colorMap[headerColor];
  };

  return (
    <div className="slide slide-1">
      {/* HEADER - spenner over begge kolonner */}
      <div className="slide-1-header" style={{ backgroundColor: getHeaderBackgroundColor() }}>
        <div className="header-left"></div>
        <div className="header-center">
          <Clock bellTime={bellTime} checkInSettings={checkInSettings} />
        </div>
        <div className="header-right">
          <button 
            className="dagsplan-btn-header"
            onClick={onNavigateToDagsplan}
          >
            Dagsplan →
          </button>
        </div>
      </div>

      {/* PROGRESS BAR - går hele bredden */}
      <div className="slide-1-progress">
        <ClassGoalProgressBar
          title={goalTitle}
          current={classTotal}
          goal={goal.target}
          showReset={showReset}
          onReset={handleReset}
          fullBleed={true}
        />
      </div>

      {/* CONTENT - to kolonner */}
      <div className="slide-1-content">
        <div className="left-column">
          <StudentList students={students} />
        </div>

        <div className="right-column">
          <WelcomeSection
            message={welcomeMessage}
            instructions={instructions}
            className={className}
          />
        </div>
      </div>

      {/* Fullskjerm-knapp */}
      <button
        className="fullscreen-toggle"
        onClick={toggleFullscreen}
        aria-pressed={isFullscreen}
        aria-label={isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M3 9 V3 H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 9 V3 H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 15 V21 H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 15 V21 H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
