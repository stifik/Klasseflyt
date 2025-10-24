'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { ScheduleSession, LessonPlan } from '@/lib/types';

interface LessonPlanModalProps {
  session: ScheduleSession;
  templateId: number;
  initialDate: string;
  existingPlan?: LessonPlan;
  onClose: () => void;
}

export default function LessonPlanModal({
  session,
  templateId,
  initialDate,
  existingPlan,
  onClose,
}: LessonPlanModalProps) {
  const [date, setDate] = useState(initialDate);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCopyList, setShowCopyList] = useState(false);
  const [previousPlans, setPreviousPlans] = useState<LessonPlan[]>([]);

  useEffect(() => {
    if (existingPlan) {
      setObjectives(existingPlan.objectives || []);
      setActivities(existingPlan.activities || []);
      setNotes(existingPlan.notes || '');
    }
    loadPreviousPlans();
  }, [existingPlan]);

  const loadPreviousPlans = async () => {
    // Find all previous lesson plans for this subject
    const allPlans = await db.lessonPlans
      .where('subject')
      .equals(session.subject)
      .and(plan => plan.date !== date) // Exclude current date
      .reverse()
      .sortBy('date');

    setPreviousPlans(allPlans);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const planData: Omit<LessonPlan, 'id' | 'createdAt' | 'updatedAt'> = {
        sessionId: session.id,
        templateId,
        date,
        subject: session.subject,
        topic: session.topic,
        time: session.time,
        objectives,
        activities,
        notes,
      };

      if (existingPlan?.id) {
        // Update existing
        await db.lessonPlans.update(existingPlan.id, {
          ...planData,
          updatedAt: new Date(),
        });
      } else {
        // Create new - first check if one exists for this date/session combo
        const existing = await db.lessonPlans
          .where('date')
          .equals(date)
          .and(plan => plan.sessionId === session.id)
          .first();

        if (existing) {
          // Update the existing one
          await db.lessonPlans.update(existing.id!, {
            ...planData,
            updatedAt: new Date(),
          });
        } else {
          // Create new
          await db.lessonPlans.add({
            ...planData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      alert('Feil ved lagring av timeplan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyFrom = (plan: LessonPlan) => {
    setObjectives([...plan.objectives]);
    setActivities([...plan.activities]);
    setNotes(plan.notes || '');
    setShowCopyList(false);
  };

  const handleObjectivesTextChange = (value: string) => {
    // Split by newlines - keep empty lines to allow natural editing
    const lines = value.split('\n');
    setObjectives(lines);
  };

  const handleActivitiesTextChange = (value: string) => {
    // Split by newlines - keep empty lines to allow natural editing
    const lines = value.split('\n');
    setActivities(lines);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('nb-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content lesson-plan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{session.subject} - {session.topic}</h2>
            <p className="session-time">{session.time}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="date-selector">
            <label>
              <strong>Dato:</strong>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="date-input"
              />
            </label>
            <span className="date-display">{formatDate(date)}</span>
          </div>

          {previousPlans.length > 0 && (
            <div className="copy-section">
              <button
                className="copy-trigger-btn"
                onClick={() => setShowCopyList(!showCopyList)}
              >
                📋 Kopier fra tidligere timeplan ({previousPlans.length})
              </button>

              {showCopyList && (
                <div className="previous-plans-list">
                  {previousPlans.map(plan => (
                    <div
                      key={plan.id}
                      className="previous-plan-item"
                      onClick={() => handleCopyFrom(plan)}
                    >
                      <div className="plan-date">{formatDate(plan.date)}</div>
                      <div className="plan-preview">
                        {plan.topic && <span className="plan-topic">{plan.topic}</span>}
                        <span className="plan-stats">
                          {plan.objectives.length} mål, {plan.activities.length} aktiviteter
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="section">
            <div className="section-header">
              <h3>📌 Mål for timen</h3>
              <p className="help-text">Ett mål per linje</p>
            </div>
            <textarea
              value={objectives.join('\n')}
              onChange={(e) => handleObjectivesTextChange(e.target.value)}
              placeholder="Skriv hvert læringsmål på en ny linje...&#10;For eksempel:&#10;Forstå hvordan man multipliserer med tocifrede tall&#10;Kunne bruke standardalgoritmen&#10;Løse praktiske oppgaver"
              className="bulk-textarea"
              rows={6}
            />
          </div>

          <div className="section">
            <div className="section-header">
              <h3>📝 Timens gang</h3>
              <p className="help-text">Én aktivitet per linje</p>
            </div>
            <textarea
              value={activities.join('\n')}
              onChange={(e) => handleActivitiesTextChange(e.target.value)}
              placeholder="Skriv hver aktivitet på en ny linje...&#10;For eksempel:&#10;Oppstart og oppmøte&#10;Repetisjon av forrige time&#10;Gjennomgang på tavla&#10;Elevene jobber med oppgaver&#10;Oppsummering"
              className="bulk-textarea"
              rows={8}
            />
          </div>

          <div className="section">
            <h3>💬 Notater</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Skriv notater her..."
              className="notes-textarea"
              rows={4}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Avbryt
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Lagrer...' : 'Lagre timeplan'}
          </button>
        </div>
      </div>
    </div>
  );
}
