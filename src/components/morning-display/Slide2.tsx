'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import type { ScheduleSession, ScheduleTemplate } from '@/lib/types';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

interface Slide2Props {
  showAllSessions?: boolean;
  initialDate?: string | null;
}

export default function Slide2({ showAllSessions = false, initialDate = null }: Slide2Props) {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [templateId, setTemplateId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [visibleSessionCount, setVisibleSessionCount] = useState(0);
  const [displayedDate, setDisplayedDate] = useState<Date>(new Date());
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Set initial date from prop if provided
  useEffect(() => {
    if (initialDate) {
      const date = new Date(initialDate);
      if (!isNaN(date.getTime())) {
        setDisplayedDate(date);
      }
    }
  }, [initialDate]);

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
      const items = Array.from(grid.querySelectorAll<HTMLElement>('.schedule-session'));

      if (items.length === 0) {
        grid.style.removeProperty('--session-height');
        return;
      }

      // Temporarily show all items to measure them (but keep them invisible)
      const originalDisplays = items.map(el => el.style.display);
      const originalVisibilities = items.map(el => el.style.visibility);
      items.forEach(el => { 
        el.style.display = 'block'; 
        el.style.visibility = 'hidden'; // Hide visually but still measure
      });

      // Measure after forcing all to be visible
      requestAnimationFrame(() => {
        const max = items.reduce((m, el) => Math.max(m, el.offsetHeight), 0);
        // Restore original display and visibility states
        items.forEach((el, idx) => { 
          el.style.display = originalDisplays[idx]; 
          el.style.visibility = originalVisibilities[idx];
        });
        // Set the max height (add padding to avoid clipping)
        grid.style.setProperty('--session-height', `${max + 4}px`);
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [sessions, isEditMode]);

  const getDayOfWeekForDate = (date: Date): DayOfWeek | null => {
    const days: (DayOfWeek | null)[] = [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', null];
    const dayIndex = date.getDay();
    return days[dayIndex];
  };

  const loadTodaySchedule = async () => {
    setIsLoading(true);
    try {
      const dateToUse = displayedDate;
      const isoDate = dateToUse.toISOString().split('T')[0];
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
        const baseSessions = template.sessions || [];

        // Load any lessonPlan overrides for this date and apply them to the base sessions
        const plansForDate = await db.lessonPlans.where('date').equals(isoDate).toArray();
        const plansMap = new Map<number, any>();
        for (const p of plansForDate) plansMap.set(p.sessionId, p);

        const sessionsList = baseSessions.map(s => {
          const override = plansMap.get(s.id);
          if (!override) return s;
          return {
            ...s,
            subject: override.subject || s.subject,
            topic: override.topic || s.topic,
            time: override.time || s.time,
          } as ScheduleSession;
        });

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

  // Listen for external changes to lesson plans (saved via weekly-planner or lesson page)
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const custom = e as CustomEvent;
        const updatedDate = custom?.detail?.date;
        if (!updatedDate) {
          // No date specified - reload anyway
          loadTodaySchedule();
          return;
        }
        const d = new Date(updatedDate);
        // If the updated date matches the currently displayed date, reload
        const currentIso = displayedDate.toISOString().split('T')[0];
        const updatedIso = d.toISOString().split('T')[0];
        if (currentIso === updatedIso) {
          loadTodaySchedule();
        }
      } catch (err) {
        // best-effort: reload
        loadTodaySchedule();
      }
    };

    window.addEventListener('lessonPlansUpdated', handler as EventListener);

    // Also listen on BroadcastChannel for cross-tab updates
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('klasseflyt-lessonplans');
        bc.onmessage = (msg) => {
          try {
            const data = msg?.data;
            if (data?.type === 'lessonPlansUpdated') {
              const updatedDate = data.date;
              if (!updatedDate) {
                loadTodaySchedule();
                return;
              }
              const d = new Date(updatedDate);
              const currentIso = displayedDate.toISOString().split('T')[0];
              const updatedIso = d.toISOString().split('T')[0];
              if (currentIso === updatedIso) loadTodaySchedule();
            }
          } catch (err) {
            loadTodaySchedule();
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
  }, [displayedDate]);

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
      // Include the currently displayed date so the lesson page looks up the
      // correct day's template instead of always using the real current date.
      const dateParam = displayedDate.toISOString().split('T')[0];
      router.push(`/morning-display/lesson/${sessionId}?date=${dateParam}`);
    }
  };

  // Normalize various time string formats to 24-hour "HH:MM"
  const formatTo24 = (t?: string) => {
    if (!t) return '';
    const s = t.trim();
    // If string already like HH:MM (24h), return first 5 chars
    const hhmm = s.match(/^(\d{1,2}):(\d{2})/);
    if (hhmm && !/[AaPp][Mm]/.test(s)) {
      const h = String(Number(hhmm[1])).padStart(2, '0');
      const m = hhmm[2];
      return `${h}:${m}`;
    }
    // Handle AM/PM forms
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
    // Fallback: try Date parsing
    const parsed = new Date(`1970-01-01T${s}`);
    if (!isNaN(parsed.getTime())) {
      return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
    }
    return s;
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
    <div className={`slide slide-2 ${isEditMode ? 'editing' : ''}`} onClick={handleSlideClick} style={{ cursor: !isEditMode && visibleSessionCount < sessions.length ? 'pointer' : 'default' }}>
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
              
              // In edit mode: use single column (CSS handles this)
              // In display mode: use 3 columns for larger lists to avoid overflowing the viewport
              let gridStyle: React.CSSProperties = {
                display: 'grid',
                gap: '18px',
                width: '100%'
              };

              if (!isEditMode) {
                // Determine number of columns: use 3 when there are more than 6 items,
                // 2 for moderate lists (5-6), otherwise 1.
                const cols = total > 6 ? 3 : total >= 5 ? 2 : 1;
                const rows = Math.ceil(total / cols);
                
                gridStyle = {
                  ...gridStyle,
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridAutoFlow: 'column',
                  gridTemplateRows: `repeat(${rows}, auto)`,
                };
              } else {
                // Edit mode: single column (also enforced by CSS)
                gridStyle = {
                  ...gridStyle,
                  gridAutoFlow: 'row',
                  gridTemplateColumns: '1fr',
                  gap: '12px'
                };
              }

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
                              <span className="session-time">{formatTo24(session.time)}</span>
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
