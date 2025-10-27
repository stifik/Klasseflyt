'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import { getTodayTheme, getThemeGradient } from '@/lib/themes';
import { getTimeBasedMessage, isTimeBasedMessagesEnabled } from '@/lib/timeBasedMessages';
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

function MorningDisplayContent() {
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
  const [initialDate, setInitialDate] = useState<string | null>(null);

  useEffect(() => {
    // Check URL parameters
    const slideParam = searchParams.get('slide');
    const showAllParam = searchParams.get('showAll');
    const dateParam = searchParams.get('date');

    if (slideParam === '2') {
      setCurrentSlide(2);
    }
    if (showAllParam === 'true') {
      setShowAllSessions(true);
    }
    if (dateParam) {
      setInitialDate(dateParam);
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

        // Load today's theme
        const theme = await getTodayTheme();
        if (theme) {
          setThemeGradient(getThemeGradient(theme));
        } else {
          // Fallback gradient if no themes
          setThemeGradient('linear-gradient(45deg, #667eea, #764ba2, #f093fb, #667eea)');
        }
      }

      // Check if time-based messages are enabled
      const useTimeBased = await isTimeBasedMessagesEnabled();

      if (useTimeBased) {
        // Load time-based messages
        const welcomeMsg = await getTimeBasedMessage('welcome');
        setWelcomeMessage(welcomeMsg);

        const instructionMsg = await getTimeBasedMessage('instruction');
        setInstructions(instructionMsg);
      } else {
        // Load traditional random messages
        const messages = await db.welcomeMessages.toArray();
        if (messages.length > 0) {
          const randomMessage = getRandomMessage(messages, 'morning_display_welcome_v1');
          setWelcomeMessage(randomMessage.message);
        }

        const instructionsList = await db.instructionMessages.toArray();
        if (instructionsList.length > 0) {
          const randomInstruction = getRandomMessage(instructionsList, 'morning_display_instruction_v1');
          setInstructions(randomInstruction.message);
        }
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

      if (bellTimes.length > 0) {
        setBellTime(bellTimes[0].time);
      }

      // Setup live updates listener
      setupLiveUpdates();
    } catch (error) {
      console.error('Error loading morning display data:', error);
    }
  };

  const getRandomMessage = (messages: (WelcomeMessage | InstructionMessage)[], storageKey?: string) => {
    // Smart random: keep a rotation queue in localStorage so each message is shown once before repeating
    // storageKey: optional key to separate welcome vs instruction rotations
    const key = storageKey || 'morning_display_rotation_v1';

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        // Fallback to pure random if no localStorage
        const idx = Math.floor(Math.random() * messages.length);
        return messages[idx];
      }

      // Ensure we have message ids
      const ids = messages.map(m => (m as any).id).filter(Boolean) as number[];
      if (ids.length === 0) {
        const idx = Math.floor(Math.random() * messages.length);
        return messages[idx];
      }

      const raw = localStorage.getItem(key);
      let queue: number[] = raw ? JSON.parse(raw) : [];

      // If queue is empty or contains ids not matching current set, rebuild a shuffled queue
      const idSet = new Set(ids);
      const queueValid = queue.length > 0 && queue.every(id => idSet.has(id));
      if (!queueValid) {
        // Build new shuffled queue
        queue = ids.slice();
        for (let i = queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
      }

      // Pop the next id
      const nextId = queue.shift();
      // Save updated queue
      localStorage.setItem(key, JSON.stringify(queue));

      // Find message with that id
      const found = messages.find(m => (m as any).id === nextId);
      if (found) return found;

      // Fallback: random
      const idx = Math.floor(Math.random() * messages.length);
      return messages[idx];
    } catch (e) {
      // On any error, fallback to pure random
      const idx = Math.floor(Math.random() * messages.length);
      return messages[idx];
    }
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
        <Slide1
          students={students}
          welcomeMessage={welcomeMessage}
          instructions={instructions}
          className={className}
          bellTime={bellTime}
          checkInSettings={checkInSettings}
          onNavigateToDagsplan={() => setCurrentSlide(2)}
        />
      )}

      {currentSlide === 2 && (
        <>
          <Slide2 showAllSessions={showAllSessions} initialDate={initialDate} />
          <SlideControls
            currentSlide={currentSlide}
            onSlideChange={setCurrentSlide}
          />
        </>
      )}
    </div>
  );
}

export default function MorningDisplayPage() {
  return (
    <Suspense fallback={<div className="morning-display" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Laster...</div>}>
      <MorningDisplayContent />
    </Suspense>
  );
}
