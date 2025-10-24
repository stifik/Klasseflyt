'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

  useEffect(() => {
    loadLessonPlan();
  }, [sessionId]);

  const loadLessonPlan = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Try to find existing lesson plan for today and this session
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
        const dayOfWeek = getDayOfWeek();
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

  const getDayOfWeek = (): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | null => {
    const days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | null)[] = [
      null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', null
    ];
    return days[new Date().getDay()];
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
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      alert('Feil ved lagring av timeplan');
    }
  };

  const handleCancel = () => {
    loadLessonPlan();
    setIsEditMode(false);
  };

  const handleAddObjective = () => {
    if (!lessonPlan) return;
    setLessonPlan({
      ...lessonPlan,
      objectives: [...lessonPlan.objectives, ''],
    });
  };

  const handleUpdateObjective = (index: number, value: string) => {
    if (!lessonPlan) return;
    const newObjectives = [...lessonPlan.objectives];
    newObjectives[index] = value;
    setLessonPlan({ ...lessonPlan, objectives: newObjectives });
  };

  const handleDeleteObjective = (index: number) => {
    if (!lessonPlan) return;
    setLessonPlan({
      ...lessonPlan,
      objectives: lessonPlan.objectives.filter((_, i) => i !== index),
    });
  };

  const handleAddActivity = () => {
    if (!lessonPlan) return;
    setLessonPlan({
      ...lessonPlan,
      activities: [...lessonPlan.activities, ''],
    });
  };

  const handleUpdateActivity = (index: number, value: string) => {
    if (!lessonPlan) return;
    const newActivities = [...lessonPlan.activities];
    newActivities[index] = value;
    setLessonPlan({ ...lessonPlan, activities: newActivities });
  };

  const handleDeleteActivity = (index: number) => {
    if (!lessonPlan) return;
    setLessonPlan({
      ...lessonPlan,
      activities: lessonPlan.activities.filter((_, i) => i !== index),
    });
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
          <button onClick={() => router.push('/morning-display?slide=2&showAll=true')} className="back-button">
            ← Tilbake til dagsplan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-plan-page">
      <div className="lesson-plan-header">
        <button onClick={() => router.push('/morning-display?slide=2&showAll=true')} className="back-button">
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
          {isEditMode && (
            <button onClick={handleAddObjective} className="add-item-button">
              + Legg til mål
            </button>
          )}
          <ul className="objectives-list">
            {lessonPlan.objectives.length === 0 && !isEditMode ? (
              <li className="empty-message">Ingen mål lagt til enda</li>
            ) : (
              lessonPlan.objectives.map((objective, index) => (
                <li key={index} className="objective-item">
                  {!isEditMode ? (
                    <span>{objective}</span>
                  ) : (
                    <div className="edit-item-row">
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => handleUpdateObjective(index, e.target.value)}
                        placeholder="Skriv læringsmål..."
                        className="item-input"
                      />
                      <button
                        onClick={() => handleDeleteObjective(index)}
                        className="delete-item-button"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="lesson-plan-section">
          <h2>📝 TIMENS GANG</h2>
          {isEditMode && (
            <button onClick={handleAddActivity} className="add-item-button">
              + Legg til aktivitet
            </button>
          )}
          <ul className="activities-list">
            {lessonPlan.activities.length === 0 && !isEditMode ? (
              <li className="empty-message">Ingen aktiviteter lagt til enda</li>
            ) : (
              lessonPlan.activities.map((activity, index) => (
                <li key={index} className="activity-item">
                  {!isEditMode ? (
                    <span>{activity}</span>
                  ) : (
                    <div className="edit-item-row">
                      <input
                        type="text"
                        value={activity}
                        onChange={(e) => handleUpdateActivity(index, e.target.value)}
                        placeholder="Skriv aktivitet..."
                        className="item-input"
                      />
                      <button
                        onClick={() => handleDeleteActivity(index)}
                        className="delete-item-button"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
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
