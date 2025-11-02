'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface QuickStartWizardProps {
  open: boolean;
  onComplete: () => void;
  onBack?: () => void;
}

export function QuickStartWizard({ open, onComplete, onBack }: QuickStartWizardProps) {
  const [step, setStep] = useState(1);
  const [teacherName, setTeacherName] = useState('');
  const [studentsText, setStudentsText] = useState('');
  const [subjects, setSubjects] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddSubject = () => {
    setSubjects([...subjects, '']);
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index: number, value: string) => {
    const newSubjects = [...subjects];
    newSubjects[index] = value;
    setSubjects(newSubjects);
  };

  const handleNext = () => {
    if (step === 1 && teacherName.trim()) {
      setStep(2);
    } else if (step === 2 && studentsText.trim()) {
      setStep(3);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Parse students from textarea (one per line)
      const studentNames = studentsText
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      // Save students to database
      const studentData = studentNames.map(name => ({
        name,
        points: 0
      }));
      await db.students.bulkAdd(studentData);

      // Save subjects to database (filter out empty ones)
      const validSubjects = subjects
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      const subjectData = validSubjects.map(name => ({
        id: uuidv4(),
        name
      }));
      await db.subjects.bulkAdd(subjectData);

      // Save teacher name to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('teacherName', teacherName);
        localStorage.setItem('onboardingCompleted', 'true');
      }

      // Also persist teacher name into app settings so Dashboard can read it
      try {
        const existingSettings = await db.settings.get('userSettings');
        if (existingSettings) {
          await db.settings.put({
            id: 'userSettings',
            ...existingSettings,
            reportSettings: {
              ...(existingSettings.reportSettings || {}),
              teacherName: teacherName
            }
          });
        } else {
          await db.settings.put({
            id: 'userSettings',
            reportSettings: { teacherName }
          });
        }
      } catch (err) {
        console.error('Failed to persist teacher name to settings:', err);
      }

      onComplete();
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Hva heter du?'}
            {step === 2 && 'Legg til elever'}
            {step === 3 && 'Hvilke fag underviser du i?'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Vi vil gjerne vite hva vi skal kalle deg'}
            {step === 2 && 'Skriv inn navn på elevene dine, ett navn per linje'}
            {step === 3 && 'Legg til fagene du underviser i (kan også gjøres senere)'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Step 1: Teacher Name */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="teacherName">Navn</Label>
                <Input
                  id="teacherName"
                  placeholder="F.eks. Kari Nordmann"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && teacherName.trim()) {
                      handleNext();
                    }
                  }}
                  autoFocus
                  className="text-lg py-6"
                />
              </div>
            </div>
          )}

          {/* Step 2: Students */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="students">Elevnavn</Label>
                <Textarea
                  id="students"
                  placeholder={"Emma Hansen\nNoah Johansen\nOlivia Berg\n..."}
                  value={studentsText}
                  onChange={(e) => setStudentsText(e.target.value)}
                  rows={12}
                  autoFocus
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  💡 Tips: Kopier fra Excel/klasseliste ved å lime inn her
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Subjects */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {subjects.map((subject, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="F.eks. Matematikk"
                      value={subject}
                      onChange={(e) => handleSubjectChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (subject.trim() && index === subjects.length - 1) {
                            handleAddSubject();
                          }
                        }
                      }}
                      autoFocus={index === 0}
                    />
                    {subjects.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSubject(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSubject}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Legg til fag
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Du kan hoppe over dette og legge til fag senere hvis du vil
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Steg {step} av 3
          </div>
          <div className="flex gap-2">
            {step === 1 && onBack && (
              <Button variant="ghost" onClick={onBack}>
                Tilbake
              </Button>
            )}
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Tilbake
              </Button>
            )}
            {step < 3 && (
              <Button 
                onClick={handleNext}
                disabled={
                  (step === 1 && !teacherName.trim()) ||
                  (step === 2 && !studentsText.trim())
                }
              >
                Neste
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleComplete} disabled={isLoading}>
                {isLoading ? 'Lagrer...' : 'Fullfør'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
