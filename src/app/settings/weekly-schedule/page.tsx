"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { ScheduleTemplate, ScheduleSession } from '@/lib/types';
import './weekly-schedule.css';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Mandag' },
  { key: 'tuesday', label: 'Tirsdag' },
  { key: 'wednesday', label: 'Onsdag' },
  { key: 'thursday', label: 'Torsdag' },
  { key: 'friday', label: 'Fredag' },
];

export default function WeeklySchedulePage() {
  const [activeDay, setActiveDay] = useState<DayOfWeek>('monday');
  const [sessions, setSessions] = useState<ScheduleSession[]>([]);
  const [templateId, setTemplateId] = useState<number | undefined>();
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [targetDay, setTargetDay] = useState<DayOfWeek>('tuesday');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTemplate(activeDay);
  }, [activeDay]);

  const loadTemplate = async (day: DayOfWeek) => {
    try {
      // Find template for this day
      const template = await db.scheduleTemplates
        .where('dayOfWeek')
        .equals(day)
        .first();

      if (template) {
        setTemplateId(template.id);
        setSessions(template.sessions || []);
      } else {
        setTemplateId(undefined);
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const addSession = () => {
    const newSession: ScheduleSession = {
      id: Date.now(), // Temporary ID
      time: '08:00',
      subject: '',
      topic: '',
    };
    setSessions([...sessions, newSession]);
  };

  const updateSession = (id: number, field: keyof ScheduleSession, value: string) => {
    setSessions(sessions.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const deleteSession = (id: number) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const saveTemplate = async () => {
    setIsSaving(true);
    try {
      const dayLabel = DAYS.find(d => d.key === activeDay)?.label || activeDay;
      const templateData: ScheduleTemplate = {
        name: `${dayLabel}-mal`,
        dayOfWeek: activeDay,
        sessions: sessions.map((s, index) => ({ ...s, id: index })),
        updatedAt: new Date(),
      };

      if (templateId) {
        // Update existing
        await db.scheduleTemplates.update(templateId, templateData);
      } else {
        // Create new
        templateData.createdAt = new Date();
        const newId = await db.scheduleTemplates.add(templateData as any);
        setTemplateId(newId as number);
      }

      alert('Dagsplan lagret!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Feil ved lagring. Prøv igjen.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToDay = async () => {
    if (!templateId) {
      alert('Ingen mal å kopiere');
      return;
    }

    try {
      const targetDayLabel = DAYS.find(d => d.key === targetDay)?.label || targetDay;
      
      // Check if target day already has a template
      const existingTarget = await db.scheduleTemplates
        .where('dayOfWeek')
        .equals(targetDay)
        .first();

      if (existingTarget) {
        const confirmOverwrite = confirm(
          `${targetDayLabel} har allerede en dagsplan. Vil du overskrive den?`
        );
        if (!confirmOverwrite) return;
        
        // Update existing
        await db.scheduleTemplates.update(existingTarget.id!, {
          sessions: sessions.map((s, index) => ({ ...s, id: index })),
          updatedAt: new Date(),
        });
      } else {
        // Create new
        const newTemplate: ScheduleTemplate = {
          name: `${targetDayLabel}-mal`,
          dayOfWeek: targetDay,
          sessions: sessions.map((s, index) => ({ ...s, id: index })),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.scheduleTemplates.add(newTemplate as any);
      }

      alert(`Mal kopiert til ${targetDayLabel}!`);
      setShowCopyModal(false);
    } catch (error) {
      console.error('Error copying template:', error);
      alert('Feil ved kopiering.');
    }
  };

  return (
    <div className="weekly-schedule-page">
      <div className="page-header">
        <h1>Ukesmaler for dagsplan</h1>
        <p>Rediger dagsplaner for hver ukedag. Systemet laster automatisk riktig mal på Morning Display.</p>
      </div>

      {/* Day selector tabs */}
      <div className="day-selector">
        {DAYS.map(day => (
          <button
            key={day.key}
            className={`day-tab ${activeDay === day.key ? 'active' : ''}`}
            onClick={() => setActiveDay(day.key)}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Template editor */}
      <div className="template-editor">
        <div className="editor-header">
          <h3>{DAYS.find(d => d.key === activeDay)?.label}-mal</h3>
          <button className="add-session-btn" onClick={addSession}>
            + Legg til økt
          </button>
        </div>

        {/* Sessions list */}
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <p>Ingen økter lagt til enda.</p>
              <p>Klikk "+ Legg til økt" for å komme i gang.</p>
            </div>
          ) : (
            sessions.map((session, index) => (
              <div key={session.id} className="session-item">
                <div className="drag-handle">⋮⋮</div>
                <input
                  type="time"
                  className="session-time"
                  value={session.time}
                  onChange={(e) => updateSession(session.id, 'time', e.target.value)}
                />
                <input
                  type="text"
                  className="session-subject"
                  placeholder="Fag"
                  value={session.subject}
                  onChange={(e) => updateSession(session.id, 'subject', e.target.value)}
                />
                <input
                  type="text"
                  className="session-topic"
                  placeholder="Tema (valgfritt)"
                  value={session.topic}
                  onChange={(e) => updateSession(session.id, 'topic', e.target.value)}
                />
                <button
                  className="delete-session-btn"
                  onClick={() => deleteSession(session.id)}
                  title="Slett økt"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="template-actions">
          <button
            className="save-btn"
            onClick={saveTemplate}
            disabled={isSaving}
          >
            {isSaving ? 'Lagrer...' : 'Lagre endringer'}
          </button>
          <button
            className="copy-btn"
            onClick={() => setShowCopyModal(true)}
            disabled={!templateId}
          >
            Kopier til annen dag...
          </button>
        </div>
      </div>

      {/* Copy modal */}
      {showCopyModal && (
        <div className="modal-overlay" onClick={() => setShowCopyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Kopier mal til annen dag</h3>
            <p>Kopier {DAYS.find(d => d.key === activeDay)?.label}-mal til:</p>
            <select
              className="target-day-select"
              value={targetDay}
              onChange={(e) => setTargetDay(e.target.value as DayOfWeek)}
            >
              {DAYS.filter(d => d.key !== activeDay).map(day => (
                <option key={day.key} value={day.key}>
                  {day.label}
                </option>
              ))}
            </select>
            <div className="modal-actions">
              <button className="confirm-btn" onClick={copyToDay}>
                Kopier
              </button>
              <button className="cancel-btn" onClick={() => setShowCopyModal(false)}>
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
