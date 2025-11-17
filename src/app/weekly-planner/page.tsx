'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { ScheduleTemplate, ScheduleSession, LessonPlan } from '@/lib/types';
import LessonPlanModal from './LessonPlanModal';
import SettingsButton from '@/components/navigation/SettingsButton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import './weekly-planner.css';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const DAYS: { key: DayOfWeek; label: string; shortLabel: string }[] = [
  { key: 'monday', label: 'Mandag', shortLabel: 'Man' },
  { key: 'tuesday', label: 'Tirsdag', shortLabel: 'Tir' },
  { key: 'wednesday', label: 'Onsdag', shortLabel: 'Ons' },
  { key: 'thursday', label: 'Torsdag', shortLabel: 'Tor' },
  { key: 'friday', label: 'Fredag', shortLabel: 'Fre' },
];

type WeekData = {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: {
    [key in DayOfWeek]: {
      date: string; // YYYY-MM-DD
      template: ScheduleTemplate | null;
      lessonPlans: Map<number, LessonPlan>; // sessionId -> LessonPlan
    };
  };
};

export default function WeeklyPlannerPage() {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = this week, 1 = next week, etc.
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [selectedSession, setSelectedSession] = useState<{
    session: ScheduleSession;
    templateId: number;
    date: string;
    existingPlan?: LessonPlan;
    dayKey: DayOfWeek;
    sessionIndex: number;
  } | null>(null);
  const [openDays, setOpenDays] = useState<Set<DayOfWeek>>(new Set()); // All closed by default

  useEffect(() => {
    loadWeekData();
  }, [currentWeekOffset]);

  // Listen for external updates to lesson plans (from lesson page or other modals)
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        // Could inspect e.detail.date to decide if reload is necessary,
        // but for simplicity refresh the week view whenever lessonPlans change.
        loadWeekData();
      } catch (err) {
        loadWeekData();
      }
    };

    window.addEventListener('lessonPlansUpdated', handler as EventListener);

    // Also listen via BroadcastChannel for cross-tab updates
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('klasseflyt-lessonplans');
        bc.onmessage = (msg) => {
          try {
            if (msg?.data?.type === 'lessonPlansUpdated') loadWeekData();
          } catch (err) {
            loadWeekData();
          }
        };
      }
    } catch (err) {
      // ignore
    }

    return () => {
      window.removeEventListener('lessonPlansUpdated', handler as EventListener);
      try { if (bc) bc.close(); } catch (e) {/* ignore */}
    };
  }, [currentWeekOffset]);

  const getWeekDates = (offset: number = 0) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate Monday of current week
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (offset * 7));
    monday.setHours(0, 0, 0, 0);

    // Calculate Friday
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return { monday, friday };
  };

  const normalizeToHHMM = (t?: string) => {
    if (!t) return '';
    const s = t.trim();
    const ampm = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (ampm) {
      let h = Number(ampm[1]);
      const m = ampm[2];
      const mer = ampm[3].toUpperCase();
      if (mer === 'AM') {
        if (h === 12) h = 0;
      } else {
        if (h !== 12) h = h + 12;
      }
      return `${String(h).padStart(2, '0')}:${m}`;
    }
    const hhmm = s.match(/^(\d{1,2}):(\d{2})/);
    if (hhmm) {
      return `${String(Number(hhmm[1])).padStart(2, '0')}:${hhmm[2]}`;
    }
    return s;
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const loadWeekData = async () => {
    const { monday, friday } = getWeekDates(currentWeekOffset);
    const weekNumber = getWeekNumber(monday);

    const newWeekData: WeekData = {
      weekNumber,
      startDate: monday,
      endDate: friday,
      days: {} as any,
    };

    // Load templates and lesson plans for each day
    for (let i = 0; i < 5; i++) {
      const day = DAYS[i];
      // Create a new date for each day to avoid mutation issues
      const date = new Date(monday.getTime());
      date.setDate(date.getDate() + i);
      // Format date as YYYY-MM-DD without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayOfMonth}`;

      // Load template for this day of week
      const template = await db.scheduleTemplates
        .where('dayOfWeek')
        .equals(day.key)
        .first();

      // Load all lesson plans for this date
      const plans = await db.lessonPlans
        .where('date')
        .equals(dateStr)
        .toArray();

      const lessonPlansMap = new Map<number, LessonPlan>();
      plans.forEach(plan => {
        lessonPlansMap.set(plan.sessionId, plan);
      });

      newWeekData.days[day.key] = {
        date: dateStr,
        template: template || null,
        lessonPlans: lessonPlansMap,
      };
    }

    setWeekData(newWeekData);
  };

  const handleSessionClick = (
    session: ScheduleSession,
    templateId: number,
    date: string,
    existingPlan: LessonPlan | undefined,
    dayKey: DayOfWeek,
    sessionIndex: number
  ) => {
    setSelectedSession({
      session,
      templateId,
      date,
      existingPlan,
      dayKey,
      sessionIndex,
    });
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
    loadWeekData(); // Refresh data after closing modal
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!selectedSession || !weekData) return;

    // Find all sessions across all days
    const allSessions: Array<{
      session: ScheduleSession;
      templateId: number;
      date: string;
      existingPlan?: LessonPlan;
      dayKey: DayOfWeek;
      sessionIndex: number;
    }> = [];

    DAYS.forEach((day) => {
      const dayData = weekData.days[day.key];
      const template = dayData.template;
      if (template && template.sessions.length > 0) {
        template.sessions.forEach((session, index) => {
          const lessonPlan = dayData.lessonPlans.get(session.id);
          allSessions.push({
            session,
            templateId: template.id!,
            date: dayData.date,
            existingPlan: lessonPlan,
            dayKey: day.key,
            sessionIndex: index,
          });
        });
      }
    });

    // Find current session index in the flat list
    const currentIndex = allSessions.findIndex(
      (s) =>
        s.dayKey === selectedSession.dayKey &&
        s.sessionIndex === selectedSession.sessionIndex
    );

    if (currentIndex === -1) return;

    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < allSessions.length) {
      const nextSession = allSessions[newIndex];
      setSelectedSession(nextSession);
    }
  };

  const getNavigationAvailability = () => {
    if (!selectedSession || !weekData) return { canPrev: false, canNext: false };

    // Count all sessions
    let totalSessions = 0;
    let currentPosition = 0;
    let found = false;

    DAYS.forEach((day) => {
      const dayData = weekData.days[day.key];
      const template = dayData.template;
      if (template && template.sessions.length > 0) {
        template.sessions.forEach((session, index) => {
          if (
            day.key === selectedSession.dayKey &&
            index === selectedSession.sessionIndex
          ) {
            currentPosition = totalSessions;
            found = true;
          }
          totalSessions++;
        });
      }
    });

    return {
      canPrev: found && currentPosition > 0,
      canNext: found && currentPosition < totalSessions - 1,
    };
  };

  const toggleDay = (dayKey: DayOfWeek) => {
    setOpenDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
      }
      return newSet;
    });
  };

  const formatDateRange = () => {
    if (!weekData) return '';
    const start = weekData.startDate.getDate();
    const end = weekData.endDate.getDate();
    const month = weekData.startDate.toLocaleDateString('nb-NO', { month: 'long' });
    return `${start}.-${end}. ${month}`;
  };

  if (!weekData) {
    return (
      <div className="weekly-planner-page">
        <div className="loading">Laster ukesplanlegger...</div>
      </div>
    );
  }

  return (
    <div className="weekly-planner-page">
      <div className="planner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Ukesplanlegger</h1>
          <p className="subtitle">Planlegg timeplaner for hele uken</p>
        </div>
        <SettingsButton href="/settings/weekly-schedule" />
      </div>

      <div className="week-selector">
        <button
          className="week-nav-btn"
          onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
        >
          ← Forrige uke
        </button>
        <div className="week-info">
          <span className="week-number">Uke {weekData.weekNumber}</span>
          <span className="week-dates">{formatDateRange()}</span>
        </div>
        <button
          className="week-nav-btn"
          onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
        >
          Neste uke →
        </button>
      </div>

      <div className="week-days-vertical">
        {DAYS.map((day, dayIndex) => {
          const dayData = weekData.days[day.key];
          const template = dayData.template;
          // Parse date from YYYY-MM-DD format correctly without timezone conversion
          const dateParts = dayData.date.split('-');
          const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          const isToday = dayData.date === new Date().toISOString().split('T')[0];
          const isOpen = openDays.has(day.key);

          return (
            <Collapsible
              key={day.key}
              open={isOpen}
              onOpenChange={() => toggleDay(day.key)}
              className={`day-accordion ${isToday ? 'today' : ''}`}
            >
              <CollapsibleTrigger className="day-accordion-trigger">
                <div className="day-accordion-header">
                  <div className="day-info">
                    <h3>{day.label}</h3>
                    <span className="day-date">
                      {date.getDate()}. {date.toLocaleDateString('nb-NO', { month: 'short' })}
                    </span>
                  </div>
                  <ChevronDown className={`chevron ${isOpen ? 'open' : ''}`} size={20} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="day-accordion-content">
                <div className="sessions-container">
                  {!template || template.sessions.length === 0 ? (
                    <div className="empty-day">
                      <p>Ingen dagsplan</p>
                      <a href="/settings/weekly-schedule" className="setup-link">
                        Sett opp mal →
                      </a>
                    </div>
                  ) : (
                    template.sessions.map((session, sessionIndex) => {
                      const hasLessonPlan = dayData.lessonPlans.has(session.id);
                      const lessonPlan = dayData.lessonPlans.get(session.id);

                      return (
                        <div
                          key={session.id}
                          className={`session-card ${hasLessonPlan ? 'has-plan' : ''}`}
                          onClick={() => handleSessionClick(session, template.id!, dayData.date, lessonPlan, day.key, sessionIndex)}
                        >
                          <div className="session-time">{normalizeToHHMM(lessonPlan?.time) || normalizeToHHMM(session.time)}</div>
                          <div className="session-info">
                            <div className="session-subject">{lessonPlan?.subject || session.subject}</div>
                            { (lessonPlan?.topic || session.topic) && (
                              <div className="session-topic">{lessonPlan?.topic || session.topic}</div>
                            )}
                          </div>
                          {hasLessonPlan && (
                            <div className="plan-indicator" title="Har timeplan">
                              📝
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {selectedSession && (
        <LessonPlanModal
          session={selectedSession.session}
          templateId={selectedSession.templateId}
          initialDate={selectedSession.date}
          existingPlan={selectedSession.existingPlan}
          onClose={handleCloseModal}
          onNavigate={handleNavigate}
          canNavigatePrev={getNavigationAvailability().canPrev}
          canNavigateNext={getNavigationAvailability().canNext}
        />
      )}
    </div>
  );
}
