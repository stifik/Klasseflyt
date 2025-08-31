
"use client";

import { useState, useMemo, type FC, type KeyboardEvent, useEffect } from "react";
import type { Student, Subject, Test, TestResult, LearningGoal, GoalAchievement, GoalStatus } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Trash2, Target, Link as LinkIcon, X, Calendar as CalendarIcon, Award } from "lucide-react";
import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Check, Forward, CircleDot } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar } from "./ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

// --- Tests Component ---
interface TestsProps {
  students: Student[];
  subjects: Subject[];
  tests: Test[];
  testResults: TestResult[];
  learningGoals: LearningGoal[];
}

const AddTestDialog: FC<{ subjects: Subject[]; learningGoals: LearningGoal[]; onAddTest: (testData: Omit<Test, 'id'>) => void; }> = ({ subjects, learningGoals, onAddTest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [maxScore, setMaxScore] = useState<number | string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [linkedGoalIds, setLinkedGoalIds] = useState<string[]>([]);

  const subjectGoals = useMemo(() => {
    return learningGoals.filter(g => g.subjectId === subjectId);
  }, [learningGoals, subjectId]);
  
  const handleAdd = () => {
    const score = Number(maxScore);
    if (title && subjectId && date && !isNaN(score) && score > 0) {
      onAddTest({ title, subjectId, maxScore: score, date, linkedGoalIds });
      resetState();
      setIsOpen(false);
    }
  };
  
  const resetState = () => {
      setTitle("");
      setSubjectId("");
      setMaxScore("");
      setDate(new Date());
      setLinkedGoalIds([]);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) resetState();
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          Ny Prøve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Legg til ny prøve</DialogTitle>
          <DialogDescription>Fyll ut detaljene for den nye prøven eller vurderingen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input 
            placeholder="Tittel på prøven" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
          />
           <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: nb }) : <span>Velg en dato</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Select value={subjectId} onValueChange={(val) => {setSubjectId(val); setLinkedGoalIds([])}}>
            <SelectTrigger>
              <SelectValue placeholder="Velg fag" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Maks poengsum"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
          />
           {subjectId && subjectGoals.length > 0 && (
            <div className="space-y-2">
              <Label>Koble til læringsmål (valgfritt)</Label>
              <ScrollArea className="h-32 w-full rounded-md border p-2">
                {subjectGoals.map(goal => (
                  <div key={goal.id} className="flex items-center space-x-2 p-1">
                    <Checkbox
                      id={`goal-${goal.id}`}
                      checked={linkedGoalIds.includes(goal.id)}
                      onCheckedChange={(checked) => {
                        setLinkedGoalIds(prev =>
                          checked ? [...prev, goal.id] : prev.filter(id => id !== goal.id)
                        );
                      }}
                    />
                    <Label htmlFor={`goal-${goal.id}`} className="font-normal text-sm">{goal.title}</Label>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Avbryt</Button>
          <Button onClick={handleAdd} disabled={!title || !subjectId || !date || !maxScore || Number(maxScore) <= 0}>Legg til</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TestsComponent = ({ students, subjects, tests = [], testResults = [], learningGoals }: TestsProps) => {
  const { toast } = useToast();
  
  const getResult = (studentId: string, testId: number) => testResults.find(r => r.studentId === studentId && r.testId === testId);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
  }, [students]);
  
  const sortedTests = useMemo(() => {
    return [...(tests || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tests]);

  const handleScoreChange = async (studentId: string, testId: number, score: string) => {
    const newScore = score === '' ? null : parseFloat(score);
    if (newScore !== null && isNaN(newScore)) return;

    const existingResult = getResult(studentId, testId);

    try {
      if (existingResult) {
        if (newScore === null) {
          await db.testResults.delete(existingResult.id!);
        } else {
          await db.testResults.update(existingResult.id!, { score: newScore });
        }
      } else if (newScore !== null) {
        await db.testResults.add({ studentId, testId, score: newScore });
      }
    } catch (error)
     {
      console.error(error);
      toast({ title: "Feil", description: "Kunne ikke lagre resultat.", variant: "destructive" });
    }
  };

  const handleAddTest = async (testData: Omit<Test, 'id'>) => {
    try {
      await db.tests.add(testData);
      toast({ title: "Prøve lagt til", description: `"${testData.title}" er lagt til i oversikten.` });
    } catch (error) {
      toast({ title: "Feil", description: "Kunne ikke legge til prøve.", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, studentIndex: number, testId: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const nextStudentIndex = studentIndex + 1;
      if (nextStudentIndex < sortedStudents.length) {
        const nextStudent = sortedStudents[nextStudentIndex];
        const nextInput = document.getElementById(`score-input-${nextStudent.id}-${testId}`);
        nextInput?.focus();
      }
    }
  };
  
  const linkedGoalsForTest = (test: Test) => {
      if (!test.linkedGoalIds) return [];
      return test.linkedGoalIds.map(id => learningGoals.find(g => g.id === id)).filter(Boolean);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Prøveresultater</h2>
        <AddTestDialog subjects={subjects} onAddTest={handleAddTest} learningGoals={learningGoals} />
      </div>
      
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 font-bold bg-background">Elev</TableHead>
              {sortedTests.map(t => (
                <TableHead key={t.id} className="text-center group">
                  <div>{subjects.find(s => s.id === t.subjectId)?.name}</div>
                  <div className="font-normal">{t.title}</div>
                  <div className="text-xs font-light text-muted-foreground">Maks: {t.maxScore}p</div>
                  {linkedGoalsForTest(t).length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                                <LinkIcon className="w-3 h-3"/> {linkedGoalsForTest(t).length} mål
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="w-80">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Vurderte læringsmål</h4>
                                <ul className="text-sm text-muted-foreground list-disc pl-4">
                                    {linkedGoalsForTest(t).map(g => g && <li key={g.id}>{g.title}</li>)}
                                </ul>
                            </div>
                        </TooltipContent>
                      </Tooltip>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudents.map((student, studentIndex) => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 z-10 font-medium bg-background">{student.name}</TableCell>
                {sortedTests.map(t => {
                  const result = getResult(student.id!, t.id!);
                  return (
                    <TableCell key={t.id} className="p-1 text-center min-w-[100px]">
                      <Input
                        id={`score-input-${student.id}-${t.id}`}
                        type="number"
                        placeholder="-"
                        defaultValue={result?.score ?? ''}
                        onBlur={(e) => handleScoreChange(student.id!, t.id!, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, studentIndex, t.id!)}
                        className="text-center"
                        max={t.maxScore}
                        min={0}
                      />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Learning Goals Component ---
interface LearningGoalsProps {
  students: Student[];
  subjects: Subject[];
  learningGoals: LearningGoal[];
  goalAchievements: GoalAchievement[];
  tests: Test[];
  testResults: TestResult[];
}

const statusConfig: Record<GoalStatus, { icon: React.ElementType, color: string, label: string }> = {
  NotAchieved: { icon: CircleDot, color: 'text-gray-400', label: 'Ikke startet' },
  InProgress: { icon: Forward, color: 'text-yellow-500', label: 'Jobber med' },
  Achieved: { icon: Check, color: 'text-green-500', label: 'Mål nådd' },
};

const statusOrder: GoalStatus[] = ['NotAchieved', 'InProgress', 'Achieved'];

const LearningGoalsComponent = ({ students, subjects, learningGoals, goalAchievements, tests, testResults }: LearningGoalsProps) => {
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjects[0]?.id || null);
    const [newGoalTitle, setNewGoalTitle] = useState("");
    const { toast } = useToast();

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    }, [students]);

    const filteredGoals = useMemo(() => {
        return (learningGoals || []).filter(g => g.subjectId === selectedSubjectId)
            .sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime());
    }, [learningGoals, selectedSubjectId]);
    
    const testsByGoalId = useMemo(() => {
        const map = new Map<string, Test[]>();
        tests.forEach(test => {
            test.linkedGoalIds?.forEach(goalId => {
                if (!map.has(goalId)) {
                    map.set(goalId, []);
                }
                map.get(goalId)!.push(test);
            });
        });
        return map;
    }, [tests]);


    const handleAddGoal = async () => {
        if (!newGoalTitle.trim() || !selectedSubjectId) return;
        const newGoal: LearningGoal = {
            id: uuidv4(),
            title: newGoalTitle.trim(),
            subjectId: selectedSubjectId,
            createdAt: new Date(),
        };
        try {
            await db.learningGoals.add(newGoal);
            setNewGoalTitle("");
            toast({ title: "Læringsmål lagt til" });
        } catch (error) {
            toast({ title: "Feil", description: "Kunne ikke legge til læringsmål.", variant: "destructive" });
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        try {
            await db.transaction('rw', db.learningGoals, db.goalAchievements, async () => {
                await db.learningGoals.delete(goalId);
                const achievementsToDelete = await db.goalAchievements.where({ goalId }).toArray();
                await db.goalAchievements.bulkDelete(achievementsToDelete.map(a => a.id as string));
            });
            toast({ title: "Læringsmål slettet", variant: "destructive" });
        } catch (error) {
            toast({ title: "Feil", description: "Kunne ikke slette læringsmål.", variant: "destructive" });
        }
    };

    const handleStatusChange = async (studentId: string, goalId: string) => {
        const existing = goalAchievements.find(a => a.studentId === studentId && a.goalId === goalId);
        const currentStatus = existing?.status || 'NotAchieved';
        const nextIndex = (statusOrder.indexOf(currentStatus) + 1) % statusOrder.length;
        const nextStatus = statusOrder[nextIndex];

        try {
            if (existing) {
                await db.goalAchievements.update(existing.id as string, { status: nextStatus, updatedAt: new Date() });
            } else {
                const newAchievement: GoalAchievement = {
                    id: uuidv4(),
                    studentId,
                    goalId,
                    status: nextStatus,
                    updatedAt: new Date(),
                };
                await db.goalAchievements.add(newAchievement);
            }
        } catch (error) {
            toast({ title: "Feil", description: "Kunne ikke oppdatere status.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Læringsmål</h2>
                    <p className="text-muted-foreground">Definer og spor elevens fremgang mot spesifikke faglige mål.</p>
                </div>
            </div>

            <Tabs value={selectedSubjectId || ""} onValueChange={setSelectedSubjectId} className="w-full">
                <TabsList>
                    {subjects.map(s => <TabsTrigger key={s.id} value={s.id!}>{s.name}</TabsTrigger>)}
                </TabsList>
            </Tabs>


            {selectedSubjectId && (
                <div className="p-4 border rounded-lg space-y-2">
                    <h3 className="font-medium">Nytt læringsmål for {subjects.find(s=>s.id === selectedSubjectId)?.name}</h3>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Skriv inn tittel på læringsmål..."
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                        />
                        <Button onClick={handleAddGoal}>
                            <Plus className="mr-2" /> Legg til
                        </Button>
                    </div>
                </div>
            )}
            
            <div className="overflow-x-auto border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 z-10 font-bold bg-background">Elev</TableHead>
                            {filteredGoals.map(goal => (
                                <TableHead key={goal.id} className="text-center group relative min-w-[150px]">
                                    {goal.title}
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 invisible h-6 w-6 group-hover:visible" onClick={() => handleDeleteGoal(goal.id)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedStudents.map(student => (
                            <TableRow key={student.id}>
                                <TableCell className="sticky left-0 z-10 font-medium bg-background">{student.name}</TableCell>
                                {filteredGoals.map(goal => {
                                    const achievement = goalAchievements.find(a => a.studentId === student.id && a.goalId === goal.id);
                                    const status = achievement?.status || 'NotAchieved';
                                    const config = statusConfig[status];
                                    const Icon = config.icon;
                                    
                                    const linkedTests = testsByGoalId.get(goal.id) || [];
                                    const relevantResults = linkedTests.map(test => {
                                        const result = testResults.find(r => r.studentId === student.id && r.testId === test.id);
                                        return result ? { ...result, maxScore: test.maxScore, score: result.score!, testTitle: test.title } : null;
                                    }).filter((r): r is { id: number, studentId: string; testId: number; score: number; comment?: string | undefined; maxScore: number; testTitle: string } => r !== null && r.score !== null);

                                    return (
                                        <TableCell key={goal.id} className="p-1 text-center">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button 
                                                        onClick={() => handleStatusChange(student.id!, goal.id)}
                                                        className={cn("w-full h-12 flex items-center justify-center rounded-md hover:bg-muted relative", config.color)}
                                                    >
                                                        <Icon className="w-6 h-6" />
                                                        {relevantResults.length > 0 && (
                                                            <div className="absolute bottom-1 right-1 flex items-center gap-1 text-xs px-1 py-0.5 rounded bg-background/80 border text-muted-foreground">
                                                                <Award className="w-3 h-3 text-blue-500" />
                                                                {relevantResults[0].score}/{relevantResults[0].maxScore}
                                                            </div>
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent className="w-auto p-2">
                                                    <div className="text-sm">
                                                        <p>Status: <strong>{config.label}</strong></p>
                                                        {achievement && <p className="text-xs text-muted-foreground">Sist endret: {format(achievement.updatedAt, "PPP", { locale: nb })}</p>}
                                                        {relevantResults.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t">
                                                                <h4 className="text-xs font-bold">Relevant resultat:</h4>
                                                                <p className="text-xs">
                                                                    {relevantResults[0].testTitle}: <strong>{relevantResults[0].score}/{relevantResults[0].maxScore}p ({Math.round((relevantResults[0].score / relevantResults[0].maxScore) * 100)}%)</strong>
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};


// --- Main Assessments Component ---
interface AssessmentsProps {
  students: Student[];
  subjects: Subject[];
  tests: Test[];
  testResults: TestResult[];
  learningGoals: LearningGoal[];
  goalAchievements: GoalAchievement[];
  activeSubTab?: string | null;
  onSubTabChange: (subTab: string) => void;
}

export default function Assessments(props: AssessmentsProps) {
    const { activeSubTab, onSubTabChange } = props;
    const defaultSubTab = "tests";
  
    useEffect(() => {
        if (activeSubTab && ["tests", "learning-goals"].includes(activeSubTab)) {
            onSubTabChange(activeSubTab);
        }
    }, [activeSubTab, onSubTabChange]);

    return (
        <Tabs 
            value={activeSubTab || defaultSubTab} 
            onValueChange={onSubTabChange}
            className="w-full"
        >
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tests">Prøver</TabsTrigger>
                <TabsTrigger value="learning-goals">Læringsmål</TabsTrigger>
            </TabsList>
            <TabsContent value="tests">
                <TestsComponent {...props} />
            </TabsContent>
            <TabsContent value="learning-goals">
                <LearningGoalsComponent {...props} />
            </TabsContent>
        </Tabs>
    );
}
