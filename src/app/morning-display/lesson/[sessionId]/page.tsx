'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import type { LessonPlan } from '@/lib/types';
import './lesson-plan.css';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Target,
  ListTodo,
  MessageSquare,
  Clock
} from 'lucide-react';

export default function LessonPlanPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = parseInt(params.sessionId as string);
  const searchParams = useSearchParams();

  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [displayDate, setDisplayDate] = useState<string>('');

  useEffect(() => {
    // Get date from URL search params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const date = urlParams.get('date');
      if (date) {
        setDisplayDate(date);
      }
    }
  }, []);

  useEffect(() => {
    loadLessonPlan();
  }, [sessionId, displayDate]);

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
      // Use stored displayDate or fallback to today
      const today = displayDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

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

  const handleSubjectChange = (value: string) => {
    if (!lessonPlan) return;
    setLessonPlan({ ...lessonPlan, subject: value });
  };

  const handleTopicChange = (value: string) => {
    if (!lessonPlan) return;
    setLessonPlan({ ...lessonPlan, topic: value });
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
              const backUrl = `/morning-display?slide=2&showAll=true${displayDate ? `&date=${displayDate}` : ''}`;
              router.push(backUrl);
            }}
            className="back-button"
          >
            <ArrowLeft size={18} />
            Tilbake til dagsplan
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
            const backUrl = `/morning-display?slide=2&showAll=true${displayDate ? `&date=${displayDate}` : ''}`;
            router.push(backUrl);
          }}
          className="back-button"
        >
          <ArrowLeft size={18} />
          Tilbake
        </button>
        <div className="lesson-plan-controls">
          {!isEditMode ? (
            <button onClick={() => setIsEditMode(true)} className="edit-button">
              <Edit2 size={16} />
              Rediger
            </button>
          ) : (
            <div className="edit-controls">
              <button onClick={handleSave} className="save-button">
                <Save size={16} />
                Lagre
              </button>
              <button onClick={handleCancel} className="cancel-button">
                <X size={16} />
                Avbryt
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="lesson-plan-content">
        <div className="lesson-plan-title">
          <div className="title-row">
            <span className="lesson-time">
              <Clock size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              {lessonPlan.time}
            </span>
            {!isEditMode ? (
              <h1>{lessonPlan.subject}</h1>
            ) : (
              <input
                type="text"
                value={lessonPlan.subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="subject-input"
                placeholder="Fag"
              />
            )}
            {!isEditMode ? (
              lessonPlan.topic && <span className="lesson-topic">{lessonPlan.topic}</span>
            ) : (
              <input
                type="text"
                value={lessonPlan.topic || ''}
                onChange={(e) => handleTopicChange(e.target.value)}
                className="topic-input"
                placeholder="Tema (valgfritt)"
              />
            )}
          </div>
        </div>

        <div className="lesson-plan-sections">
          <div className="lesson-plan-section">
            <h2>
              <Target size={20} />
              Mål for timen
            </h2>
            {!isEditMode ? (
              <ul className="objectives-list">
                {lessonPlan.objectives.length === 0 ? (
                  <li className="empty-message">Ingen mål lagt til enda</li>
                ) : (
                  lessonPlan.objectives.map((objective, index) => (
                    <li key={index} className="objective-item">
                      <Target size={16} className="item-icon" />
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
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                  placeholder="Skriv hvert læringsmål på en ny linje..."
                  className="bulk-textarea"
                  rows={6}
                />
              </>
            )}
          </div>

          <div className="lesson-plan-section">
            <h2>
              <ListTodo size={20} />
              Timens gang
            </h2>
            {!isEditMode ? (
              <ul className="activities-list">
                {lessonPlan.activities.length === 0 ? (
                  <li className="empty-message">Ingen aktiviteter lagt til enda</li>
                ) : (
                  lessonPlan.activities.map((activity, index) => (
                    <li key={index} className="activity-item">
                      <ListTodo size={16} className="item-icon" />
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
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                  placeholder="Skriv hver aktivitet på en ny linje..."
                  className="bulk-textarea"
                  rows={8}
                />
              </>
            )}
          </div>
        </div>

        <div className="lesson-plan-section">
          <h2>
            <MessageSquare size={20} />
            Notater
          </h2>
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
