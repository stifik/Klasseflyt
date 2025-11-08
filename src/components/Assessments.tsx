
"use client";

import { useState, useMemo, type FC, type KeyboardEvent, useEffect } from "react";
import type { Student, Subject, Test, TestResult, LearningGoal, GoalAchievement, GoalStatus } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Trash2, Target, Link as LinkIcon, X, Calendar as CalendarIcon, Award, Filter, RotateCcw, ChevronDown } from "lucide-react";
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
                locale={nb}
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
  const [filters, setFilters] = useState<{ 
    subject: string;
    searchQuery: string;
    scoreFilter: 'all' | 'minimum' | 'range' | 'percent';
    minScore: string;
    maxScore: string;
    percentThreshold: string;
    selectedStudent: string;
  }>({ 
    subject: "all",
    searchQuery: "",
    scoreFilter: "all",
    minScore: "",
    maxScore: "",
    percentThreshold: "90",
    selectedStudent: "all"
  });
  
  const getResult = (studentId: number, testId: number) => testResults.find(r => r.studentId === studentId && r.testId === testId);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
  }, [students]);
  
  const sortedTests = useMemo(() => {
    return [...(tests || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tests]);

  // Filter tests by subject and search query only
  const filteredTests = useMemo(() => {
    if (!Array.isArray(sortedTests)) return [];
    
    return sortedTests.filter(test => {
      // Filter by subject
      if (filters.subject !== "all" && test.subjectId !== filters.subject) {
        return false;
      }
      
      // Filter by search query (in test title)
      if (filters.searchQuery.trim() !== "") {
        const searchLower = filters.searchQuery.toLowerCase();
        if (!test.title.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }, [sortedTests, filters.subject, filters.searchQuery]);

  // Filter students based on their scores on the filtered tests
  const filteredStudents = useMemo(() => {
    // If no score filter is active, show all students (or just selected student)
    if (filters.scoreFilter === 'all') {
      if (filters.selectedStudent !== "all") {
        return sortedStudents.filter(s => s.id === Number(filters.selectedStudent));
      }
      return sortedStudents;
    }

    // If no tests are visible after filtering, show no students
    if (filteredTests.length === 0) {
      return [];
    }

    // Filter students who meet the score criteria on ANY of the filtered tests
    return sortedStudents.filter(student => {
      // If a specific student is selected, only show that student
      if (filters.selectedStudent !== "all" && student.id !== Number(filters.selectedStudent)) {
        return false;
      }

      // Check if this student meets the score criteria on at least one filtered test
      const meetsScoreCriteria = filteredTests.some(test => {
        const result = testResults.find(r => r.testId === test.id && r.studentId === student.id);
        
        if (!result || result.score === null) {
          return false; // No score means doesn't meet criteria
        }

        // Check against the selected filter type
        if (filters.scoreFilter === 'minimum') {
          const min = parseFloat(filters.minScore);
          return !isNaN(min) && result.score >= min;
        } else if (filters.scoreFilter === 'range') {
          const min = parseFloat(filters.minScore);
          const max = parseFloat(filters.maxScore);
          return !isNaN(min) && !isNaN(max) && result.score >= min && result.score <= max;
        } else if (filters.scoreFilter === 'percent') {
          const threshold = parseFloat(filters.percentThreshold);
          if (isNaN(threshold)) return true;
          const percentage = (result.score / test.maxScore) * 100;
          return percentage >= threshold;
        }
        
        return true;
      });

      return meetsScoreCriteria;
    });
  }, [sortedStudents, filteredTests, filters, testResults]);

  // Calculate statistics for filtered students and tests
  const filterStats = useMemo(() => {
    if (filteredTests.length === 0 || filteredStudents.length === 0) return null;
    
    const allScores = filteredTests.flatMap(test => {
      const results = testResults.filter(r => 
        r.testId === test.id && 
        r.score !== null &&
        filteredStudents.some(s => s.id === r.studentId)
      );
      return results.map(r => r.score!);
    });
    
    if (allScores.length === 0) return null;
    
    const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    
    return {
      avgScore: avgScore.toFixed(1),
      totalTests: filteredTests.length,
      totalStudents: filteredStudents.length,
    };
  }, [filteredTests, filteredStudents, testResults]);

  const handleScoreChange = async (studentId: number, testId: number, score: string) => {
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

  const handleDeleteTest = async (testId: number) => {
    try {
      await db.transaction('rw', db.tests, db.testResults, async () => {
        // Delete all test results for this test
        await db.testResults.where('testId').equals(testId).delete();
        // Delete the test itself
        await db.tests.delete(testId);
      });
      toast({ title: "Prøve slettet", description: "Prøven og alle resultater er slettet.", variant: "destructive" });
    } catch (error) {
      console.error("Failed to delete test:", error);
      toast({ title: "Feil", description: "Kunne ikke slette prøven.", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, studentIndex: number, testId: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const nextStudentIndex = studentIndex + 1;
      if (nextStudentIndex < filteredStudents.length) {
        const nextStudent = filteredStudents[nextStudentIndex];
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
      <Collapsible>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold">Prøveresultater</h2>
          <div className="flex items-center gap-2">
            <AddTestDialog subjects={subjects} onAddTest={handleAddTest} learningGoals={learningGoals} />
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Vis/Skjul Filter
                <ChevronDown className="ml-2 h-4 w-4"/>
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent className="p-4 mt-4 border rounded-md space-y-4">
          {/* Search and basic filters */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Søk i prøvenavn</Label>
              <Input 
                id="search"
                placeholder="f.eks. 'gangeprøven', 'kapittel 3'..." 
                value={filters.searchQuery}
                onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Fag</Label>
              <Select value={filters.subject} onValueChange={v => setFilters({...filters, subject: v})}>
                <SelectTrigger id="subject"><SelectValue placeholder="Filtrer på fag..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Fag</SelectItem>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="student">Elev (valgfritt)</Label>
              <Select value={filters.selectedStudent} onValueChange={v => setFilters({...filters, selectedStudent: v})}>
                <SelectTrigger id="student"><SelectValue placeholder="Alle elever" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Elever</SelectItem>
                  {sortedStudents.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Score filters */}
          <div className="space-y-3 p-4 border rounded-md bg-muted/30">
            <Label className="text-sm font-semibold">Filtrer på poengsum</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="score-all" 
                  checked={filters.scoreFilter === 'all'}
                  onCheckedChange={() => setFilters({...filters, scoreFilter: 'all'})}
                />
                <Label htmlFor="score-all" className="font-normal cursor-pointer">
                  Vis alle (ingen poengfilter)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="score-minimum" 
                  checked={filters.scoreFilter === 'minimum'}
                  onCheckedChange={() => setFilters({...filters, scoreFilter: 'minimum'})}
                />
                <Label htmlFor="score-minimum" className="font-normal cursor-pointer">
                  Minimum
                </Label>
                <Input 
                  type="number" 
                  placeholder="f.eks. 90"
                  className="w-24"
                  value={filters.minScore}
                  onChange={(e) => setFilters({...filters, minScore: e.target.value})}
                  disabled={filters.scoreFilter !== 'minimum'}
                />
                <span className="text-sm text-muted-foreground">poeng</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="score-range" 
                  checked={filters.scoreFilter === 'range'}
                  onCheckedChange={() => setFilters({...filters, scoreFilter: 'range'})}
                />
                <Label htmlFor="score-range" className="font-normal cursor-pointer">
                  Mellom
                </Label>
                <Input 
                  type="number" 
                  placeholder="min"
                  className="w-20"
                  value={filters.minScore}
                  onChange={(e) => setFilters({...filters, minScore: e.target.value})}
                  disabled={filters.scoreFilter !== 'range'}
                />
                <span className="text-sm">og</span>
                <Input 
                  type="number" 
                  placeholder="maks"
                  className="w-20"
                  value={filters.maxScore}
                  onChange={(e) => setFilters({...filters, maxScore: e.target.value})}
                  disabled={filters.scoreFilter !== 'range'}
                />
                <span className="text-sm text-muted-foreground">poeng</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="score-percent" 
                  checked={filters.scoreFilter === 'percent'}
                  onCheckedChange={() => setFilters({...filters, scoreFilter: 'percent'})}
                />
                <Label htmlFor="score-percent" className="font-normal cursor-pointer">
                  Prosent over
                </Label>
                <Select 
                  value={filters.percentThreshold} 
                  onValueChange={v => setFilters({...filters, percentThreshold: v})}
                  disabled={filters.scoreFilter !== 'percent'}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="70">70%</SelectItem>
                    <SelectItem value="60">60%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="40">40%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Statistics */}
          {filterStats && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="text-sm space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">📊 Statistikk for filtrerte prøver:</p>
                <p className="text-blue-800 dark:text-blue-200">
                  Viser <strong>{filterStats.totalTests}</strong> av <strong>{sortedTests.length}</strong> prøver
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  Viser <strong>{filterStats.totalStudents}</strong> av <strong>{sortedStudents.length}</strong> elever
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  Gjennomsnittsscore: <strong>{filterStats.avgScore}</strong> poeng
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={() => setFilters({ 
                subject: "all", 
                searchQuery: "",
                scoreFilter: "all",
                minScore: "",
                maxScore: "",
                percentThreshold: "90",
                selectedStudent: "all"
              })} 
              variant="ghost"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Nullstill alle filter
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 font-bold bg-background">Elev</TableHead>
              {filteredTests.map(t => (
                <TableHead key={t.id} className="text-center group relative min-w-[140px]">
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
                  
                  {/* Delete button */}
                  <div className="absolute top-1 right-1 invisible group-hover:visible">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Trash2 className="h-3 w-3 text-destructive"/>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Dette vil slette prøven '{t.title}' og alle resultater for alle elever. Handlingen kan ikke angres.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTest(t.id!)}>
                            Ja, slett prøven
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student, studentIndex) => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 z-10 font-medium bg-background">{student.name}</TableCell>
                {filteredTests.map(t => {
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
            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={filteredTests.length + 1} className="text-center text-muted-foreground py-8">
                  {filters.scoreFilter !== 'all' 
                    ? "Ingen elever møter de valgte kriteriene" 
                    : "Ingen prøver funnet"}
                </TableCell>
              </TableRow>
            )}
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

    const handleStatusChange = async (studentId: number, goalId: string) => {
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
                                    }).filter((r): r is { id: number, studentId: number; testId: number; score: number; comment?: string | undefined; maxScore: number; testTitle: string } => r !== null && r.score !== null);

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
