'use client';

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
      </div>
    </div>
  );
}
