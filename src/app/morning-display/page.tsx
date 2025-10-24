'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import { getTodayTheme, getThemeGradient } from '@/lib/themes';
import Slide1 from '@/components/morning-display/Slide1';
import Slide2 from '@/components/morning-display/Slide2';
import SlideControls from '@/components/morning-display/SlideControls';
import type { Student, WelcomeMessage, InstructionMessage, BellTime } from '@/lib/types';
import './morning-display.css';

type StudentWithStatus = {
  id: number;
  name: string;
  points: number;
  status: 'waiting' | 'checked-in' | 'absent';
};

export default function MorningDisplayPage() {
  const searchParams = useSearchParams();
  const [currentSlide, setCurrentSlide] = useState(1);
  const [students, setStudents] = useState<StudentWithStatus[]>([]);
  const [welcomeMessage, setWelcomeMessage] = useState('God morgen!');
  const [instructions, setInstructions] = useState('Velkommen til en ny dag!');
  const [className, setClassName] = useState('klassen');
  const [bellTime, setBellTime] = useState<string | undefined>();
  const [checkInSettings, setCheckInSettings] = useState<any>();
  const [themeGradient, setThemeGradient] = useState<string>('');
  const [showAllSessions, setShowAllSessions] = useState(false);

  useEffect(() => {
    // Check URL parameters
    const slideParam = searchParams.get('slide');
    const showAllParam = searchParams.get('showAll');

    if (slideParam === '2') {
      setCurrentSlide(2);
    }
    if (showAllParam === 'true') {
      setShowAllSessions(true);
    }

    loadData();
    setupKeyboardNavigation();
  }, [searchParams]);

  const loadData = async () => {
    try {
      // Load students
      const allStudents = await db.students.toArray();
      const studentsWithStatus: StudentWithStatus[] = allStudents
        .filter(s => s.id !== undefined)
        .map(s => ({
          id: s.id!,
          name: s.name,
          points: s.points || 0,
          status: 'waiting' as const,
        }));
      setStudents(studentsWithStatus);

      // Load settings
      const settings = await db.settings.get('userSettings');
      if (settings) {
        setClassName(settings.morningDisplaySettings?.className || 'klassen');
        setCheckInSettings(settings.checkInSettings?.morning);

        // Load theme
        const theme = getTodayTheme(
          settings.morningDisplaySettings?.lastThemeId,
          settings.morningDisplaySettings?.lastThemeDate
        );
        setThemeGradient(getThemeGradient(theme));

        // Save theme for today
        const today = new Date().toISOString().split('T')[0];
        if (settings.morningDisplaySettings?.lastThemeDate !== today) {
          await db.settings.update('userSettings', {
            morningDisplaySettings: {
              className: settings.morningDisplaySettings?.className || 'klassen',
              messageRotationMode: settings.morningDisplaySettings?.messageRotationMode || 'daily',
              instructionRotationMode: settings.morningDisplaySettings?.instructionRotationMode || 'daily',
              lastThemeId: theme.id,
              lastThemeDate: today,
            },
          });
        }
      }

      // Load welcome message
      const messages = await db.welcomeMessages.toArray();
      if (messages.length > 0) {
        const randomMessage = getRandomMessage(messages);
        setWelcomeMessage(randomMessage.message);
      }

      // Load instructions
      const instructionsList = await db.instructionMessages.toArray();
      if (instructionsList.length > 0) {
        const randomInstruction = getRandomMessage(instructionsList);
        setInstructions(randomInstruction.message);
      }

      // Load bell time for today
      const today = new Date();
      const weekdayNames = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
      const weekday = weekdayNames[today.getDay()];

      const bellTimes = await db.bellTimes
        .where('weekday')
        .equals(weekday as any)
        .and(bt => bt.type === 'morgen')
        .toArray();

      if (bellTimes.length > 0) {
        setBellTime(bellTimes[0].time);
      }

      // Setup live updates listener
      setupLiveUpdates();
    } catch (error) {
      console.error('Error loading morning display data:', error);
    }
  };

  const getRandomMessage = (messages: (WelcomeMessage | InstructionMessage)[]) => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  };

  const setupKeyboardNavigation = () => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentSlide(1);
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide(2);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  };

  const setupLiveUpdates = () => {
    // Poll for check-in updates every 2 seconds
    const interval = setInterval(async () => {
      const todayString = new Date().toISOString().split('T')[0];
      const todayDate = new Date(todayString);

      // Get check-ins from the new NFC check-in system
      const checkInLogs = await db.checkInLogs
        .where('date')
        .equals(todayDate)
        .toArray();

      const absentStudents = await db.absences
        .where('date')
        .equals(todayDate)
        .toArray();

      setStudents(prev =>
        prev.map(student => {
          const isCheckedIn = checkInLogs.some(log => log.studentId === student.id);
          const isAbsent = absentStudents.some(a => a.studentId === student.id);

          if (isAbsent) return { ...student, status: 'absent' as const };
          if (isCheckedIn) return { ...student, status: 'checked-in' as const };
          return { ...student, status: 'waiting' as const };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  };

  return (
    <div
      className="morning-display"
      style={{
        backgroundImage: themeGradient,
        backgroundSize: '400% 400%',
      }}
    >
      {currentSlide === 1 && (
        <>
          <Slide1
            students={students}
            welcomeMessage={welcomeMessage}
            instructions={instructions}
            className={className}
            bellTime={bellTime}
            checkInSettings={checkInSettings}
          />
          <SlideControls
            currentSlide={currentSlide}
            onSlideChange={setCurrentSlide}
          />
        </>
      )}

      {currentSlide === 2 && (
        <>
          <Slide2 showAllSessions={showAllSessions} />
          <SlideControls
            currentSlide={currentSlide}
            onSlideChange={setCurrentSlide}
          />
        </>
      )}
    </div>
  );
}
