'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import type { ScheduleSession, ScheduleTemplate } from '@/lib/types';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

interface Slide2Props {
  showAllSessions?: boolean;
}

export default function Slide2({ showAllSessions = false }: Slide2Props) {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [templateId, setTemplateId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [visibleSessionCount, setVisibleSessionCount] = useState(0);
  const [displayedDate, setDisplayedDate] = useState<Date>(new Date());
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadTodaySchedule();
  }, [displayedDate]);

  useEffect(() => {
    // If showAllSessions is true, reveal all sessions
    if (showAllSessions && sessions.length > 0) {
      setVisibleSessionCount(sessions.length);
    }
  }, [showAllSessions, sessions.length]);

  useEffect(() => {
    // Add keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !isEditMode && visibleSessionCount < sessions.length) {
        setVisibleSessionCount(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, visibleSessionCount, sessions.length]);

  // Measure visible session cards and set a CSS variable so all cards can share the
  // same height (the tallest). This prevents the jarring horizontal stretch/shrink
  // when only one/few cards are visible during reveal.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // In edit mode we don't enforce uniform heights
    if (isEditMode) {
      grid.style.removeProperty('--session-height');
      return;
    }

    // Use rAF to wait for layout to stabilise after render
    const raf = requestAnimationFrame(() => {
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.schedule-session'))
        // only consider visible items
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none';
        });

      if (items.length === 0) {
        grid.style.removeProperty('--session-height');
        return;
      }

      const max = items.reduce((m, el) => Math.max(m, el.offsetHeight), 0);
      // add a tiny padding to avoid clipping text due to rounding
      grid.style.setProperty('--session-height', `${max + 4}px`);
    });

    return () => cancelAnimationFrame(raf);
  }, [sessions, visibleSessionCount, isEditMode]);

  const getDayOfWeekForDate = (date: Date): DayOfWeek | null => {
    const days: (DayOfWeek | null)[] = [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', null];
    const dayIndex = date.getDay();
    return days[dayIndex];
  };

  const loadTodaySchedule = async () => {
    setIsLoading(true);
    try {
      const dateToUse = displayedDate;
      const dayOfWeek = getDayOfWeekForDate(dateToUse);

      if (!dayOfWeek) {
        // Weekend - no schedule
        setSessions([]);
        setTemplateId(undefined);
        setIsLoading(false);
        return;
      }

      // Find template for this day
      const template = await db.scheduleTemplates
        .where('dayOfWeek')
        .equals(dayOfWeek)
        .first();

      if (template) {
        setTemplateId(template.id);
        const sessionsList = template.sessions || [];
        setSessions(sessionsList);
        // If showAllSessions is true, show all immediately
        setVisibleSessionCount(showAllSessions ? sessionsList.length : 0);
      } else {
        setTemplateId(undefined);
        setSessions([]);
        setVisibleSessionCount(0);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeDisplayedDate = (deltaDays: number) => {
    setDisplayedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + deltaDays);
      return d;
    });
  };

  const handleSave = async () => {
    try {
      const dayOfWeek = getDayOfWeekForDate(displayedDate);
      if (!dayOfWeek) return;

      const dayNames = {
        monday: 'Mandag',
        tuesday: 'Tirsdag',
        wednesday: 'Onsdag',
        thursday: 'Torsdag',
        friday: 'Fredag',
      };

      const templateData: ScheduleTemplate = {
        name: `${dayNames[dayOfWeek as keyof typeof dayNames]}-mal`,
        dayOfWeek,
        sessions: sessions.map((s, index) => ({ ...s, id: index })),
        updatedAt: new Date(),
      };

      if (templateId) {
        await db.scheduleTemplates.update(templateId, templateData);
      } else {
        templateData.createdAt = new Date();
        const newId = await db.scheduleTemplates.add(templateData as any);
        setTemplateId(newId as number);
      }

      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Feil ved lagring av dagsplan');
    }
  };

  const handleCancel = () => {
    loadTodaySchedule();
    setIsEditMode(false);
  };

  const handleAddSession = () => {
    const newId = sessions.length > 0 ? Math.max(...sessions.map(s => s.id)) + 1 : 0;
    setSessions([
      ...sessions,
      {
        id: newId,
        time: '08:00',
        subject: '',
        topic: '',
      },
    ]);
  };

  const handleDeleteSession = (id: number) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const handleUpdateSession = (
    id: number,
    field: 'time' | 'subject' | 'topic',
    value: string
  ) => {
    setSessions(
      sessions.map(s => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const getDayName = () => {
    const days = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
    return days[displayedDate.getDay()];
  };

  const getFormattedDate = () => {
    const date = displayedDate;
    const day = date.getDate();
    const months = [
      'januar', 'februar', 'mars', 'april', 'mai', 'juni',
      'juli', 'august', 'september', 'oktober', 'november', 'desember'
    ];
    const month = months[date.getMonth()];
    return `${day}. ${month}`;
  };

  const handleSlideClick = () => {
    // Only allow revealing in non-edit mode and if there are more sessions to reveal
    if (!isEditMode && visibleSessionCount < sessions.length) {
      setVisibleSessionCount(visibleSessionCount + 1);
    }
  };

  const handleSessionClick = (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation(); // Prevent slide click
    if (!isEditMode) {
      router.push(`/morning-display/lesson/${sessionId}`);
    }
  };

  const isWeekend = getDayOfWeekForDate(displayedDate) === null;

  if (isLoading) {
    return (
      <div className="slide slide-2">
        <div className="schedule-content">
          <div className="empty-schedule">
            <h2>Laster dagsplan...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (isWeekend) {
    return (
      <div className="slide slide-2">
        <div className="schedule-header">
          <button
            className="schedule-nav-left"
            onClick={(e) => { e.stopPropagation(); changeDisplayedDate(-1); }}
            aria-label="Forrige dag"
          >
            {'<'}
          </button>

          <h1 className="schedule-title">
            DAGSPLAN - {getDayName().charAt(0).toUpperCase() + getDayName().slice(1)} {getFormattedDate()}
          </h1>

          <button
            className="schedule-nav-right"
            onClick={(e) => { e.stopPropagation(); changeDisplayedDate(1); }}
            aria-label="Neste dag"
          >
            {'>'}
          </button>
        </div>
        <div className="schedule-content">
          <div className="empty-schedule">
            <h2>Ingen skole i dag! 🎉</h2>
            <p>God helg!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="slide slide-2" onClick={handleSlideClick} style={{ cursor: !isEditMode && visibleSessionCount < sessions.length ? 'pointer' : 'default' }}>
      <div className="schedule-header">
        <button
          className="schedule-nav-left"
          onClick={(e) => { e.stopPropagation(); changeDisplayedDate(-1); }}
          aria-label="Forrige dag"
        >
          {'<'}
        </button>

        <h1 className="schedule-title">
          DAGSPLAN - {getDayName().charAt(0).toUpperCase() + getDayName().slice(1)} {getFormattedDate()}
        </h1>

        <button
          className="schedule-nav-right"
          onClick={(e) => { e.stopPropagation(); changeDisplayedDate(1); }}
          aria-label="Neste dag"
        >
          {'>'}
        </button>

        <div className="schedule-controls">
          {isEditMode ? (
            <div className="edit-controls">
              <button onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }} className="save-button">
                💾 Lagre
              </button>
              <button onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }} className="cancel-button">
                ❌ Avbryt
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="schedule-content">
        {isEditMode && (
          <button onClick={(e) => {
            e.stopPropagation();
            handleAddSession();
          }} className="add-session-button">
            + Legg til økt
          </button>
        )}

        {/* Discreet lock button placed in the lower-right footer when not in edit mode */}
        {!isEditMode && (
          <button
            className="schedule-lock"
            onClick={(e) => { e.stopPropagation(); setIsEditMode(true); }}
            aria-label="Rediger dagsplan"
          >
            🔒
          </button>
        )}

        <div className={`schedule-list ${isEditMode ? 'edit-mode' : ''}`}>
          {sessions.length === 0 ? (
            <div className="empty-schedule">
              <p>Ingen dagsplan lagt til enda.</p>
              <p>Klikk &quot;Rediger&quot; for å legge til økter.</p>
            </div>
          ) : (
            (() => {
              const total = sessions.length;
              // Determine number of columns: use 3 columns for larger lists to avoid
              // overflowing the viewport. Use 3 when there are more than 6 items,
              // 2 for moderate lists (5-6), otherwise 1.
              const cols = total > 6 ? 3 : total >= 5 ? 2 : 1;
              const rows = Math.ceil(total / cols);

              const gridStyle: React.CSSProperties = {
                display: 'grid',
                gap: '18px',
                gridAutoFlow: 'column',
                gridAutoColumns: '1fr', // ensure columns have equal width and prevent odd stretching
                gridTemplateRows: `repeat(${rows}, auto)`,
                width: '100%'
              };

              return (
                <div ref={gridRef} className="schedule-grid" style={gridStyle}>
                  {sessions.map((session, idx) => {
                    const visible = isEditMode || idx < visibleSessionCount;
                    return (
                      <div
                        key={session.id}
                        className="schedule-session"
                        style={{ display: visible ? 'block' : 'none' }}
                      >
                        {!isEditMode ? (
                          <div
                            className="session-display"
                            onClick={(e) => handleSessionClick(e, session.id)}
                          >
                            <div className="session-header">
                              <span className="session-time">{session.time}</span>
                              <span className="session-subject">{session.subject}</span>
                            </div>
                            {session.topic && (
                              <div className="session-topic">{session.topic}</div>
                            )}
                          </div>
                        ) : (
                          <div className="session-edit-row">
                            <input
                              type="time"
                              value={session.time}
                              onChange={(e) =>
                                handleUpdateSession(session.id, 'time', e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="session-input session-time-input"
                            />
                            <input
                              type="text"
                              value={session.subject}
                              onChange={(e) =>
                                handleUpdateSession(session.id, 'subject', e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Fag"
                              className="session-input session-subject-input"
                            />
                            <input
                              type="text"
                              value={session.topic}
                              onChange={(e) =>
                                handleUpdateSession(session.id, 'topic', e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Tema"
                              className="session-input session-topic-input"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                              className="delete-session-button"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
