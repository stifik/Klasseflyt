'use client';

import { useEffect, useState } from 'react';
import Clock from './Clock';
import StudentList from './StudentList';
import WelcomeSection from './WelcomeSection';
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
  return (
    <div className="slide slide-1">
      <div className="left-column">
        <StudentList students={students} />
      </div>

      <div className="right-side">
        {/* HEADER SEKSJON */}
        <div className="welcome-header">
          <div className="clock-display-wrapper">
            <Clock bellTime={bellTime} checkInSettings={checkInSettings} />
          </div>
          <button 
            className="dagsplan-btn"
            onClick={onNavigateToDagsplan}
          >
            Dagsplan →
          </button>
        </div>

        {/* MAIN SEKSJON (tekst) */}
        <div className="welcome-main">
          <WelcomeSection
            message={welcomeMessage}
            instructions={instructions}
            className={className}
          />
        </div>

        {/* FOOTER SEKSJON (tom for nå) */}
        <div className="welcome-footer">
          {/* Tom for nå - plass for fremtidige knapper */}
        </div>
        {/* Subtil fullskjerm-knapp nederst til høyre */}
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
    </div>
  );
}
