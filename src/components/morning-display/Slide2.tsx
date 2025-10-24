'use client';

import { useState } from 'react';
import type { ScheduleSession } from '@/lib/types';

type Slide2Props = {
  sessions: ScheduleSession[];
  onSave?: (sessions: ScheduleSession[]) => void;
};

export default function Slide2({ sessions: initialSessions, onSave }: Slide2Props) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [sessions, setSessions] = useState<ScheduleSession[]>(initialSessions);

  const handleSave = () => {
    if (onSave) {
      onSave(sessions);
    }
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setSessions(initialSessions);
    setIsEditMode(false);
  };

  const handleAddSession = () => {
    const newId = Math.max(...sessions.map(s => s.id), 0) + 1;
    setSessions([
      ...sessions,
      {
        id: newId,
        time: '08:30',
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

  return (
    <div className="slide slide-2">
      <div className="schedule-header">
        <h1 className="schedule-title">
          DAGSPLAN - {getDayName().charAt(0).toUpperCase() + getDayName().slice(1)} {getFormattedDate()}
        </h1>
        <div className="schedule-controls">
          {!isEditMode ? (
            <button
              onClick={() => setIsEditMode(true)}
              className="edit-button"
            >
              🔓 Rediger
            </button>
          ) : (
            <div className="edit-controls">
              <button onClick={handleSave} className="save-button">
                ✅ Lagre
              </button>
              <button onClick={handleCancel} className="cancel-button">
                ❌ Avbryt
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="schedule-content">
        {isEditMode && (
          <button onClick={handleAddSession} className="add-session-button">
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
            sessions.map((session) => (
              <div key={session.id} className="schedule-session">
                {!isEditMode ? (
                  <>
                    <span className="session-time">{session.time}</span>
                    <span className="session-separator">-</span>
                    <span className="session-subject">{session.subject}</span>
                    {session.topic && (
                      <>
                        <span className="session-separator">-</span>
                        <span className="session-topic">{session.topic}</span>
                      </>
                    )}
                  </>
                ) : (
                  <div className="session-edit-row">
                    <input
                      type="time"
                      value={session.time}
                      onChange={(e) =>
                        handleUpdateSession(session.id, 'time', e.target.value)
                      }
                      className="session-input session-time-input"
                    />
                    <input
                      type="text"
                      value={session.subject}
                      onChange={(e) =>
                        handleUpdateSession(session.id, 'subject', e.target.value)
                      }
                      placeholder="Fag"
                      className="session-input session-subject-input"
                    />
                    <input
                      type="text"
                      value={session.topic}
                      onChange={(e) =>
                        handleUpdateSession(session.id, 'topic', e.target.value)
                      }
                      placeholder="Tema"
                      className="session-input session-topic-input"
                    />
                    <button
                      onClick={() => handleDeleteSession(session.id)}
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
