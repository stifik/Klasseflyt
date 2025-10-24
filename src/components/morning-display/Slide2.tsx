'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadTodaySchedule();
  }, []);

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

  const getTodayDayOfWeek = (): DayOfWeek | null => {
    const days: (DayOfWeek | null)[] = [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', null];
    const dayIndex = new Date().getDay();
    return days[dayIndex];
  };

  const loadTodaySchedule = async () => {
    setIsLoading(true);
    try {
      const dayOfWeek = getTodayDayOfWeek();

      if (!dayOfWeek) {
        // Weekend - no schedule
        setSessions([]);
        setTemplateId(undefined);
        setIsLoading(false);
        return;
      }

      // Find template for today
      const template = await db.scheduleTemplates
        .where('dayOfWeek')
        .equals(dayOfWeek)
        .first();

      if (template) {
        setTemplateId(template.id);
        setSessions(template.sessions || []);
        setVisibleSessionCount(0); // Reset visible sessions when loading new schedule
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

  const handleSave = async () => {
    try {
      const dayOfWeek = getTodayDayOfWeek();
      if (!dayOfWeek) return;

      const dayNames = {
        monday: 'Mandag',
        tuesday: 'Tirsdag',
        wednesday: 'Onsdag',
        thursday: 'Torsdag',
        friday: 'Fredag',
      };

      const templateData: ScheduleTemplate = {
        name: `${dayNames[dayOfWeek]}-mal`,
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
    return days[new Date().getDay()];
  };

  const getFormattedDate = () => {
    const date = new Date();
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

  const isWeekend = getTodayDayOfWeek() === null;

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
          <h1 className="schedule-title">
            DAGSPLAN - {getDayName().charAt(0).toUpperCase() + getDayName().slice(1)} {getFormattedDate()}
          </h1>
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
        <h1 className="schedule-title">
          DAGSPLAN - {getDayName().charAt(0).toUpperCase() + getDayName().slice(1)} {getFormattedDate()}
        </h1>
        <div className="schedule-controls">
          {!isEditMode ? (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent slide click when clicking edit button
                setIsEditMode(true);
              }}
              className="edit-button"
              title="Rediger dagsplan"
            >
              🔓
            </button>
          ) : (
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
          )}
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

        <div className="schedule-list">
          {sessions.length === 0 ? (
            <div className="empty-schedule">
              <p>Ingen dagsplan lagt til enda.</p>
              <p>Klikk &quot;Rediger&quot; for å legge til økter.</p>
            </div>
          ) : (
            sessions.map((session, index) => (
              <div
                key={session.id}
                className="schedule-session"
                style={{
                  display: isEditMode || index < visibleSessionCount ? 'flex' : 'none'
                }}
              >
                {!isEditMode ? (
                  <div
                    className="session-display"
                    onClick={(e) => handleSessionClick(e, session.id)}
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <span className="session-time">{session.time}</span>
                    <span className="session-separator">-</span>
                    <span className="session-subject">{session.subject}</span>
                    {session.topic && (
                      <>
                        <span className="session-separator">-</span>
                        <span className="session-topic">{session.topic}</span>
                      </>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
