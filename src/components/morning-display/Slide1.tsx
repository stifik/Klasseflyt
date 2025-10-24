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
};

export default function Slide1({
  students,
  welcomeMessage,
  instructions,
  className,
  bellTime,
  checkInSettings,
}: Slide1Props) {
  return (
    <div className="slide slide-1">
      <div className="clock-container">
        <Clock bellTime={bellTime} checkInSettings={checkInSettings} />
      </div>

      <div className="slide-content">
        <div className="student-list-column">
          <StudentList students={students} />
        </div>

        <div className="welcome-column">
          <WelcomeSection
            message={welcomeMessage}
            instructions={instructions}
            className={className}
          />
        </div>
      </div>
    </div>
  );
}
