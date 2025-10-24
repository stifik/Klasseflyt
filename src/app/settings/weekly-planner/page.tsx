'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { ScheduleTemplate, ScheduleSession, LessonPlan } from '@/lib/types';
import LessonPlanModal from './LessonPlanModal';
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
  } | null>(null);

  useEffect(() => {
    loadWeekData();
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
    existingPlan?: LessonPlan
  ) => {
    setSelectedSession({
      session,
      templateId,
      date,
      existingPlan,
    });
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
    loadWeekData(); // Refresh data after closing modal
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
      <div className="planner-header">
        <h1>Ukesplanlegger</h1>
        <p className="subtitle">Planlegg timeplaner for hele uken</p>
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

      <div className="week-grid">
        {DAYS.map((day, dayIndex) => {
          const dayData = weekData.days[day.key];
          const template = dayData.template;
          // Parse date from YYYY-MM-DD format correctly without timezone conversion
          const dateParts = dayData.date.split('-');
          const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          const isToday = dayData.date === new Date().toISOString().split('T')[0];

          return (
            <div key={day.key} className={`day-column ${isToday ? 'today' : ''}`}>
              <div className="day-header">
                <h3>{day.label}</h3>
                <span className="day-date">{date.getDate()}. {date.toLocaleDateString('nb-NO', { month: 'short' })}</span>
              </div>

              <div className="sessions-container">
                {!template || template.sessions.length === 0 ? (
                  <div className="empty-day">
                    <p>Ingen dagsplan</p>
                    <a href="/settings/weekly-schedule" className="setup-link">
                      Sett opp mal →
                    </a>
                  </div>
                ) : (
                  template.sessions.map(session => {
                    const hasLessonPlan = dayData.lessonPlans.has(session.id);
                    const lessonPlan = dayData.lessonPlans.get(session.id);

                    return (
                      <div
                        key={session.id}
                        className={`session-card ${hasLessonPlan ? 'has-plan' : ''}`}
                        onClick={() => handleSessionClick(session, template.id!, dayData.date, lessonPlan)}
                      >
                        <div className="session-time">{session.time}</div>
                        <div className="session-info">
                          <div className="session-subject">{session.subject}</div>
                          {session.topic && (
                            <div className="session-topic">{session.topic}</div>
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
            </div>
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
        />
      )}
    </div>
  );
}
