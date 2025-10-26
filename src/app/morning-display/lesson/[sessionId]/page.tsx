'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import type { LessonPlan } from '@/lib/types';
import './lesson-plan.css';

export default function LessonPlanPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = parseInt(params.sessionId as string);

  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams();

  useEffect(() => {
    loadLessonPlan();
  }, [sessionId, searchParams]);

  // Reload when window regains focus (e.g., coming back from another tab)
  useEffect(() => {
    const handleFocus = () => {
      loadLessonPlan();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [sessionId]);

  const loadLessonPlan = async () => {
    setIsLoading(true);
    try {
      // Prefer date passed as query param (from Slide2). Fallback to real today.
      const paramDate = searchParams?.get('date');
      const today = paramDate ?? new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Try to find existing lesson plan for the requested date and this session
      const existingPlan = await db.lessonPlans
        .where('date')
        .equals(today)
        .and(plan => plan.sessionId === sessionId)
        .first();

      if (existingPlan) {
        setLessonPlan(existingPlan);
      } else {
        // Create a new lesson plan from the session data
        // First, find the template for today
        const dayOfWeek = getDayOfWeek(today);
        if (!dayOfWeek) {
          setLessonPlan(null);
          setIsLoading(false);
          return;
        }

        const template = await db.scheduleTemplates
          .where('dayOfWeek')
          .equals(dayOfWeek)
          .first();

        if (!template) {
          setLessonPlan(null);
          setIsLoading(false);
          return;
        }

        const session = template.sessions.find(s => s.id === sessionId);
        if (!session) {
          setLessonPlan(null);
          setIsLoading(false);
          return;
        }

        // Create new lesson plan with session data
        const newPlan: LessonPlan = {
          sessionId: sessionId,
          templateId: template.id!,
          date: today,
          subject: session.subject,
          topic: session.topic,
          time: session.time,
          objectives: [],
          activities: [],
          notes: '',
        };

        setLessonPlan(newPlan);
        setIsEditMode(true); // Start in edit mode for new plans
      }
    } catch (error) {
      console.error('Error loading lesson plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayOfWeek = (isoDate?: string): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | null => {
    const days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | null)[] = [
      null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', null
    ];
    const d = isoDate ? new Date(isoDate) : new Date();
    return days[d.getDay()];
  };

  const handleSave = async () => {
    if (!lessonPlan) return;

    try {
      if (lessonPlan.id) {
        // Update existing
        await db.lessonPlans.update(lessonPlan.id, {
          ...lessonPlan,
          updatedAt: new Date(),
        });
      } else {
        // Create new
        const newId = await db.lessonPlans.add({
          ...lessonPlan,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        setLessonPlan({ ...lessonPlan, id: newId as number });
      }
      setIsEditMode(false);
      // Notify other views (morning display / weekly planner) that lesson plans changed
      try {
        const date = lessonPlan.date;
        const sessionIdNum = lessonPlan.sessionId;
        window.dispatchEvent(new CustomEvent('lessonPlansUpdated', { detail: { date, sessionId: sessionIdNum } }));
        // Broadcast to other tabs/windows
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('klasseflyt-lessonplans');
            bc.postMessage({ type: 'lessonPlansUpdated', date, sessionId: sessionIdNum });
            bc.close();
          }
        } catch (e) {
          // ignore broadcast failures
        }
      } catch (e) {
        // ignore in non-browser environments
      }
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      alert('Feil ved lagring av timeplan');
    }
  };

  const handleCancel = () => {
    loadLessonPlan();
    setIsEditMode(false);
  };

  const handleObjectivesTextChange = (value: string) => {
    if (!lessonPlan) return;
    // Split by newlines - keep empty lines to allow natural editing
    const lines = value.split('\n');
    setLessonPlan({ ...lessonPlan, objectives: lines });
  };

  const handleActivitiesTextChange = (value: string) => {
    if (!lessonPlan) return;
    // Split by newlines - keep empty lines to allow natural editing
    const lines = value.split('\n');
    setLessonPlan({ ...lessonPlan, activities: lines });
  };

  const handleUpdateNotes = (value: string) => {
    if (!lessonPlan) return;
    setLessonPlan({ ...lessonPlan, notes: value });
  };

  if (isLoading) {
    return (
      <div className="lesson-plan-page">
        <div className="lesson-plan-loading">
          <h2>Laster timeplan...</h2>
        </div>
      </div>
    );
  }

  if (!lessonPlan) {
    return (
      <div className="lesson-plan-page">
        <div className="lesson-plan-error">
            <h2>Fant ikke økten</h2>
            <button
              onClick={() => {
                const paramDate = new URLSearchParams(window.location.search).get('date');
                const backUrl = `/morning-display?slide=2&showAll=true${paramDate ? `&date=${paramDate}` : ''}`;
                router.push(backUrl);
              }}
              className="back-button"
            >
              ← Tilbake til dagsplan
            </button>
          </div>
      </div>
    );
  }

  return (
    <div className="lesson-plan-page">
      <div className="lesson-plan-header">
        <button
          onClick={() => {
            const paramDate = new URLSearchParams(window.location.search).get('date');
            const backUrl = `/morning-display?slide=2&showAll=true${paramDate ? `&date=${paramDate}` : ''}`;
            router.push(backUrl);
          }}
          className="back-button"
        >
          ← Tilbake til dagsplan
        </button>
        <div className="lesson-plan-controls">
          {!isEditMode ? (
            <button onClick={() => setIsEditMode(true)} className="edit-button">
              🔓 Rediger
            </button>
          ) : (
            <div className="edit-controls">
              <button onClick={handleSave} className="save-button">
                💾 Lagre
              </button>
              <button onClick={handleCancel} className="cancel-button">
                ❌ Avbryt
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="lesson-plan-content">
        <div className="lesson-plan-title">
          <h1>{lessonPlan.subject} - {lessonPlan.topic}</h1>
          <p className="lesson-time">{lessonPlan.time}</p>
        </div>

        <div className="lesson-plan-section">
          <h2>📌 MÅL FOR TIMEN</h2>
          {!isEditMode ? (
            <ul className="objectives-list">
              {lessonPlan.objectives.length === 0 ? (
                <li className="empty-message">Ingen mål lagt til enda</li>
              ) : (
                lessonPlan.objectives.map((objective, index) => (
                  <li key={index} className="objective-item">
                    <span>{objective}</span>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <>
              <p className="help-text">Ett mål per linje</p>
              <textarea
                value={lessonPlan.objectives.join('\n')}
                onChange={(e) => handleObjectivesTextChange(e.target.value)}
                onKeyPress={(e) => {
                  // Allow Enter key for line breaks - don't prevent default
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    // Don't call e.preventDefault() - let the textarea handle Enter naturally
                  }
                }}
                placeholder="Skriv hvert læringsmål på en ny linje...&#10;For eksempel:&#10;Forstå hvordan man multipliserer med tocifrede tall&#10;Kunne bruke standardalgoritmen&#10;Løse praktiske oppgaver"
                className="bulk-textarea"
                rows={6}
              />
            </>
          )}
        </div>

        <div className="lesson-plan-section">
          <h2>📝 TIMENS GANG</h2>
          {!isEditMode ? (
            <ul className="activities-list">
              {lessonPlan.activities.length === 0 ? (
                <li className="empty-message">Ingen aktiviteter lagt til enda</li>
              ) : (
                lessonPlan.activities.map((activity, index) => (
                  <li key={index} className="activity-item">
                    <span>{activity}</span>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <>
              <p className="help-text">Én aktivitet per linje</p>
              <textarea
                value={lessonPlan.activities.join('\n')}
                onChange={(e) => handleActivitiesTextChange(e.target.value)}
                onKeyPress={(e) => {
                  // Allow Enter key for line breaks - don't prevent default
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    // Don't call e.preventDefault() - let the textarea handle Enter naturally
                  }
                }}
                placeholder="Skriv hver aktivitet på en ny linje...&#10;For eksempel:&#10;Oppstart og oppmøte&#10;Repetisjon av forrige time&#10;Gjennomgang på tavla&#10;Elevene jobber med oppgaver&#10;Oppsummering"
                className="bulk-textarea"
                rows={8}
              />
            </>
          )}
        </div>

        <div className="lesson-plan-section">
          <h2>💬 NOTATER</h2>
          {!isEditMode ? (
            <div className="notes-display">
              {lessonPlan.notes || 'Ingen notater'}
            </div>
          ) : (
            <textarea
              value={lessonPlan.notes || ''}
              onChange={(e) => handleUpdateNotes(e.target.value)}
              placeholder="Skriv notater her..."
              className="notes-input"
              rows={4}
            />
          )}
        </div>
      </div>
    </div>
  );
}
