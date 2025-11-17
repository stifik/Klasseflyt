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
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

export default function LessonPlanModal({
  session,
  templateId,
  initialDate,
  existingPlan,
  onClose,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
}: LessonPlanModalProps) {
  const [date, setDate] = useState(initialDate);
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

  const [time, setTime] = useState<string>(normalizeToHHMM(existingPlan?.time || session.time));
  const [subjectOverride, setSubjectOverride] = useState<string>(existingPlan?.subject || session.subject);
  const [topicOverride, setTopicOverride] = useState<string>(existingPlan?.topic || session.topic);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCopyList, setShowCopyList] = useState(false);
  const [previousPlans, setPreviousPlans] = useState<LessonPlan[]>([]);

  useEffect(() => {
    // Update date when initialDate changes (from navigation)
    setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    // Handle ESC key to close and save modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [objectives, activities, notes, time, subjectOverride, topicOverride]);

  useEffect(() => {
    // Reset all fields when session or existingPlan changes
    if (existingPlan) {
      setObjectives(existingPlan.objectives || []);
      setActivities(existingPlan.activities || []);
      setNotes(existingPlan.notes || '');
      setTime(normalizeToHHMM(existingPlan.time || session.time));
      setSubjectOverride(existingPlan.subject || session.subject);
      setTopicOverride(existingPlan.topic || session.topic);
    } else {
      // No existing plan - reset to session defaults
      setObjectives([]);
      setActivities([]);
      setNotes('');
      setTime(normalizeToHHMM(session.time));
      setSubjectOverride(session.subject);
      setTopicOverride(session.topic);
    }
    loadPreviousPlans();
  }, [existingPlan, session.id, session.subject, session.topic, session.time]);

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
      await saveLessonPlan();
      onClose();
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      alert('Feil ved lagring av timeplan');
    } finally {
      setIsSaving(false);
    }
  };

  const saveLessonPlan = async () => {
    // Check if there's actual content or changes
    const filteredObjectives = objectives.filter((o) => o.trim());
    const filteredActivities = activities.filter((a) => a.trim());
    const trimmedNotes = notes.trim();
    
    const hasContent = filteredObjectives.length > 0 || 
                      filteredActivities.length > 0 || 
                      trimmedNotes.length > 0;
    
    const hasChanges = subjectOverride !== session.subject ||
                      topicOverride !== session.topic ||
                      time !== normalizeToHHMM(session.time);
    
    if (!hasContent && !hasChanges) {
      // No content and no changes - don't create an empty plan
      return;
    }

    const planData: Omit<LessonPlan, 'id' | 'createdAt' | 'updatedAt'> = {
      sessionId: session.id,
      templateId,
      date,
      subject: subjectOverride,
      topic: topicOverride,
      time: time,
      objectives: filteredObjectives,
      activities: filteredActivities,
      notes: trimmedNotes,
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

    // Notify other views that lesson plans changed
    try {
      window.dispatchEvent(new CustomEvent('lessonPlansUpdated', { detail: { date } }));
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('klasseflyt-lessonplans');
          bc.postMessage({ type: 'lessonPlansUpdated', date });
          bc.close();
        }
      } catch (e) {
        // ignore broadcast failures
      }
    } catch (e) {
      // ignore if dispatch not supported
    }
  };

  const handleNavigate = async (direction: 'prev' | 'next') => {
    if (!onNavigate) return;
    
    // Auto-save before navigating
    try {
      await saveLessonPlan();
    } catch (error) {
      console.error('Error auto-saving:', error);
    }
    
    onNavigate(direction);
  };

  const handleClose = async () => {
    // Auto-save before closing
    try {
      await saveLessonPlan();
    } catch (error) {
      console.error('Error auto-saving on close:', error);
    }
    onClose();
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
    const weekday = d.toLocaleDateString('nb-NO', { weekday: 'short' });
    const day = d.getDate();
    const month = d.toLocaleDateString('nb-NO', { month: 'short' });
    return `${weekday} ${day}. ${month}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content lesson-plan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-left">
            <div className="date-time-stack">
              <span className="compact-date">{formatDate(date)}</span>
              <div className="time-selector">
                <span className="time-icon">🕐</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="time-input"
                />
              </div>
            </div>
          </div>
          <div className="header-right">
            <input
              value={subjectOverride}
              onChange={(e) => setSubjectOverride(e.target.value)}
              className="subject-input"
              aria-label="Fag"
              placeholder="Fag"
            />
            <input
              value={topicOverride}
              onChange={(e) => setTopicOverride(e.target.value)}
              className="topic-input"
              aria-label="Tema"
              placeholder="Tema for timen"
            />
          </div>
        </div>

        <div className="modal-body">

          {previousPlans.length > 0 && (
            <div className="copy-section-card">
              <button
                className="copy-trigger-btn"
                onClick={() => setShowCopyList(!showCopyList)}
              >
                <span className="copy-icon">📋</span>
                <span>Kopier fra tidligere timeplan</span>
                <span className="copy-badge">{previousPlans.length}</span>
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
                          {plan.objectives.length} mål · {plan.activities.length} aktiviteter
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="section-card">
            <div className="section-header">
              <div className="section-title">
                <span className="section-icon">🎯</span>
                <h3>Mål for timen</h3>
              </div>
              <p className="help-text">Ett mål per linje</p>
            </div>
            <textarea
              value={objectives.join('\n')}
              onChange={(e) => handleObjectivesTextChange(e.target.value)}
              placeholder={`Skriv hvert læringsmål på en ny linje...\nFor eksempel:\nForstå hvordan man multipliserer med tosifrede tall\nKunne bruke standardalgoritmen\nLøse praktiske oppgaver`}
              className="section-textarea"
              rows={6}
            />
          </div>

          <div className="section-card">
            <div className="section-header">
              <div className="section-title">
                <span className="section-icon">📝</span>
                <h3>Timens gang</h3>
              </div>
              <p className="help-text">Én aktivitet per linje</p>
            </div>
            <textarea
              value={activities.join('\n')}
              onChange={(e) => handleActivitiesTextChange(e.target.value)}
              placeholder={`Skriv hver aktivitet på en ny linje...\nFor eksempel:\nOppstart og oppmøte\nRepetisjon av forrige time\nGjennomgang på tavla\nElevene jobber med oppgaver\nOppsummering`}
              className="section-textarea"
              rows={8}
            />
          </div>

          <div className="section-card notes-section">
            <div className="section-header">
              <div className="section-title">
                <span className="section-icon">💬</span>
                <h3>Notater</h3>
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Skriv notater her..."
              className="section-textarea notes-textarea"
              rows={4}
            />
          </div>
        </div>

        <div className="modal-footer">
          {onNavigate && (
            <div className="footer-navigation">
              <button
                className="nav-btn prev-btn"
                onClick={() => handleNavigate('prev')}
                disabled={!canNavigatePrev}
                title="Forrige time"
              >
                ← Forrige
              </button>
              <button
                className="nav-btn next-btn"
                onClick={() => handleNavigate('next')}
                disabled={!canNavigateNext}
                title="Neste time"
              >
                Neste →
              </button>
            </div>
          )}
          <div className="footer-actions">
            <button className="cancel-btn" onClick={handleClose}>
              Lukk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
