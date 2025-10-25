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
        console.log('[MORNING-DISPLAY] Check-in settings loaded:', settings.checkInSettings?.morning);

        // Load today's theme
        const theme = await getTodayTheme();
        if (theme) {
          setThemeGradient(getThemeGradient(theme));
        } else {
          // Fallback gradient if no themes
          setThemeGradient('linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)');
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
      
      // Check for dev mode weekday override
      const devWeekdayOverride = typeof window !== 'undefined' 
        ? window.localStorage?.getItem('dev_weekday_override') 
        : null;
      
      const weekday = devWeekdayOverride || weekdayNames[today.getDay()];

      const bellTimes = await db.bellTimes
        .where('weekday')
        .equals(weekday as any)
        .and(bt => bt.type === 'morgen')
        .toArray();

      console.log('[MORNING-DISPLAY] Weekday:', weekday, '(dev override:', devWeekdayOverride, ') | Bell times found:', bellTimes);

      if (bellTimes.length > 0) {
        setBellTime(bellTimes[0].time);
        console.log('[MORNING-DISPLAY] Set bellTime to:', bellTimes[0].time);
      } else {
        console.log('[MORNING-DISPLAY] No morning bell time found for', weekday);
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
      // Create date at noon to match the check-in system date format
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];

      // Get check-ins from the new NFC check-in system
      const checkInLogs = await db.checkInLogs.toArray();
      const todaysCheckIns = checkInLogs.filter(log => {
        const logDate = new Date(log.date).toISOString().split('T')[0];
        return logDate === todayString;
      });

      // Get absences
      const allAbsences = await db.absences.toArray();
      const todaysAbsences = allAbsences.filter(a => {
        const absDate = new Date(a.date).toISOString().split('T')[0];
        return absDate === todayString;
      });

      // Get updated student data with current points
      const updatedStudents = await db.students.toArray();
      const studentsMap = new Map(updatedStudents.map(s => [s.id, s]));

      setStudents(prev =>
        prev.map(student => {
          const isCheckedIn = todaysCheckIns.some(log => log.studentId === student.id);
          const isAbsent = todaysAbsences.some(a => a.studentId === student.id);
          
          // Get current points from database
          const currentStudent = studentsMap.get(student.id);
          const currentPoints = currentStudent?.points || student.points;

          let status: 'waiting' | 'checked-in' | 'absent' = 'waiting';
          if (isAbsent) status = 'absent';
          else if (isCheckedIn) status = 'checked-in';

          return { ...student, points: currentPoints, status };
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
