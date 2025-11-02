'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import { getTodayTheme, getThemeGradient } from '@/lib/themes';
import { getTimeBasedMessage, isTimeBasedMessagesEnabled } from '@/lib/timeBasedMessages';
import { getCurrentTime } from '@/lib/autoCheckInService';
import Slide1 from '@/components/morning-display/Slide1';
import Slide2 from '@/components/morning-display/Slide2';
import Slide3 from '@/components/morning-display/Slide3';
import SlideControls from '@/components/morning-display/SlideControls';
import MorningDisplayGuide from '@/components/MorningDisplayGuide';
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
  const [bellType, setBellType] = useState<'morgen' | 'ordinær' | undefined>();
  const [bellTimeId, setBellTimeId] = useState<number | undefined>();
  const [checkInSettings, setCheckInSettings] = useState<any>();
  const [themeGradient, setThemeGradient] = useState<string>('');
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [initialDate, setInitialDate] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showPointsList, setShowPointsList] = useState(true);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [showSecretAgent, setShowSecretAgent] = useState(true);

  // Check if guide should be shown on first visit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenGuide = localStorage.getItem('morningDisplayGuideShown');
      if (!hasSeenGuide) {
        setShowGuide(true);
      }
    }
  }, []);

  useEffect(() => {
    // Check URL parameters
    const slideParam = searchParams.get('slide');
    const showAllParam = searchParams.get('showAll');
    const dateParam = searchParams.get('date');

    if (slideParam === '2') {
      setCurrentSlide(2);
    }
    if (slideParam === '3') {
      setCurrentSlide(3);
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

  // Update active bell time every minute to handle transitions
  useEffect(() => {
    const updateActiveBellTime = async () => {
      try {
        const settings = await db.settings.get('userSettings');
        if (!settings?.checkInSettings) return;

        const today = new Date();
        const weekdayNames = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

        const devWeekdayOverride = typeof window !== 'undefined'
          ? window.localStorage?.getItem('dev_weekday_override')
          : null;

        const weekday = devWeekdayOverride || weekdayNames[today.getDay()];

        const bellTimes = await db.bellTimes
          .where('weekday')
          .equals(weekday as any)
          .toArray();

        if (bellTimes.length > 0) {
          const currentTimeStr = getCurrentTime();
          const [currentHours, currentMinutesInHour] = currentTimeStr.split(':').map(Number);
          const currentMinutes = currentHours * 60 + currentMinutesInHour;

          const isCheckInActive = (bt: any) => {
            if (!settings?.checkInSettings) return false;

            const [h, m] = bt.time.split(':').map(Number);
            const bellMinutes = h * 60 + m;
            const minutesSinceBell = currentMinutes - bellMinutes;

            if (bt.type === 'morgen') {
              const { absenceMinutes, postCloseGraceMinutes } = settings.checkInSettings.morning;
              const grace = postCloseGraceMinutes ?? 2;
              return minutesSinceBell >= 0 && minutesSinceBell <= absenceMinutes + grace;
            } else {
              const { stopMinutes, postCloseGraceMinutes } = settings.checkInSettings.regular;
              const grace = postCloseGraceMinutes ?? 2;
              return minutesSinceBell >= -5 && minutesSinceBell <= stopMinutes + grace;
            }
          };

          const activeBellTime = bellTimes.find(isCheckInActive);

          if (activeBellTime) {
            console.debug('[MorningDisplay] Active bell time found:', {
              time: activeBellTime.time,
              type: activeBellTime.type,
              id: activeBellTime.id
            });
            setBellTime(activeBellTime.time);
            setBellType(activeBellTime.type);
            setBellTimeId(activeBellTime.id);
          } else {
            console.debug('[MorningDisplay] No active bell time - clearing');
            setBellTime(undefined);
            setBellType(undefined);
            setBellTimeId(undefined);
          }
        }
      } catch (error) {
        console.error('Error updating active bell time:', error);
      }
    };

    // Update immediately and then every 5 seconds for faster response
    updateActiveBellTime();
    const interval = setInterval(updateActiveBellTime, 5000);

    return () => clearInterval(interval);
  }, []);

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
  setCheckInSettings(settings.checkInSettings);
        
        // Load display toggles
        setShowPointsList(settings.morningDisplaySettings?.showPointsList ?? true);
        setShowProgressBar(settings.morningDisplaySettings?.showProgressBar ?? true);
        setShowSecretAgent(settings.morningDisplaySettings?.showSecretAgent ?? true);

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
        .toArray();

      if (bellTimes.length > 0 && settings?.checkInSettings) {
        // Find active check-in session (if any)
        const currentTimeStr = getCurrentTime();
        const [currentHours, currentMinutesInHour] = currentTimeStr.split(':').map(Number);
        const currentMinutes = currentHours * 60 + currentMinutesInHour;

        // Helper to check if a bellTime is currently active
        const isCheckInActive = (bt: any) => {
          if (!settings?.checkInSettings) return false;

          const [h, m] = bt.time.split(':').map(Number);
          const bellMinutes = h * 60 + m;
          const minutesSinceBell = currentMinutes - bellMinutes;

          if (bt.type === 'morgen') {
            const { absenceMinutes, postCloseGraceMinutes } = settings.checkInSettings.morning;
            const grace = postCloseGraceMinutes ?? 2;
            // Active from bell time until absenceMinutes + grace
            return minutesSinceBell >= 0 && minutesSinceBell <= absenceMinutes + grace;
          } else {
            const { stopMinutes, postCloseGraceMinutes } = settings.checkInSettings.regular;
            const grace = postCloseGraceMinutes ?? 2;
            // Active from 5 minutes before bell until stopMinutes + grace
            return minutesSinceBell >= -5 && minutesSinceBell <= stopMinutes + grace;
          }
        };

        // Find active bell time
        const activeBellTime = bellTimes.find(isCheckInActive);

        if (activeBellTime) {
          setBellTime(activeBellTime.time);
          setBellType(activeBellTime.type);
          setBellTimeId(activeBellTime.id);
        } else {
          // No active check-in session - clear bell time to make header transparent
          setBellTime(undefined);
          setBellType(undefined);
          setBellTimeId(undefined);
        }
      }

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
        // If we're on slide 3 (Agent Reveal), go back to slide 2 (dagsplan) to keep chronological order.
        setCurrentSlide(prev => (prev === 3 ? 2 : 1));
      } else if (e.key === 'ArrowRight') {
        // Only navigate to slide 2 if we're not already on slide 2; when on slide 2
        // the Slide2 component handles ArrowRight to reveal sessions and can
        // call back to advance to slide 3 when fully revealed.
        setCurrentSlide(prev => (prev === 2 ? prev : 2));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  };

  // Setup live updates listener - runs when bellTimeId changes
  useEffect(() => {
    console.debug('[MorningDisplay] Student status useEffect triggered with bellTimeId:', bellTimeId);

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
        // Filter by today AND current bellTimeId to only show check-ins for active session
        return logDate === todayString && (bellTimeId ? log.bellTimeId === bellTimeId : true);
      });

      console.debug('[MorningDisplay] Filtered check-ins for bellTimeId', bellTimeId, ':', todaysCheckIns.length);

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
  }, [bellTimeId]); // Re-run when bellTimeId changes to reset student status

  return (
    <>
      {/* Guide popup */}
      <MorningDisplayGuide
        open={showGuide}
        onClose={() => setShowGuide(false)}
      />

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
            bellType={bellType}
            onNavigateToDagsplan={() => setCurrentSlide(2)}
            showPointsList={showPointsList}
            showProgressBar={showProgressBar}
          />
        )}

        {currentSlide === 2 && (
          <>
            <Slide2 showAllSessions={showAllSessions} initialDate={initialDate} onAdvanceToNext={() => showSecretAgent ? setCurrentSlide(3) : setCurrentSlide(1)} />
            <SlideControls
              currentSlide={currentSlide}
              onSlideChange={setCurrentSlide}
              maxSlide={showSecretAgent ? 3 : 2}
            />
          </>
        )}

        {showSecretAgent && currentSlide === 3 && (
          <>
            <Slide3 />
            <SlideControls
              currentSlide={currentSlide}
              onSlideChange={setCurrentSlide}
              maxSlide={3}
            />
          </>
        )}
      </div>
    </>
  );
}

export default function MorningDisplayPage() {
  return (
    <Suspense fallback={<div className="morning-display" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Laster...</div>}>
      <MorningDisplayContent />
    </Suspense>
  );
}
