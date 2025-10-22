

"use client";

import { useState, useMemo, type FC, useEffect } from "react";
import type { Student, Subject, Homework, Submission, HomeworkStatus, SubmissionAttempt } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, Edit2, Copy, Filter, RotateCcw, ChevronDown, CheckCircle, XCircle, AlertTriangle, Thermometer, BookX, Plus, Trash2, Calendar as CalendarIcon, History, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getWeekNumber, cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar } from "./ui/calendar";
import { useLiveQuery } from "dexie-react-hooks";
import { givePoints } from "@/lib/rewardService";
import { positiveActions } from "@/lib/positiveActions";

interface HomeworkOverviewProps {
  students: Student[];
  subjects: Subject[];
  homework: Homework[];
  submissions: Submission[];
  onUpdate: () => void;
}

const statusIcons: Record<HomeworkStatus, React.ReactElement> = {
  "Godkjent": <CheckCircle className="text-green-500" />,
  "Ikke levert": <XCircle className="text-red-500" />,
  "Må rettes": <AlertTriangle className="text-yellow-500" />,
  "Syk/Fravær": <Thermometer className="text-blue-500" />,
  "Glemt bok": <BookX className="text-orange-500" />,
};

const HomeworkCell: FC<{ studentId: number; homework: Homework; allSubmissions: Submission[]; allAttempts: SubmissionAttempt[] }> = ({ studentId, homework, allSubmissions, allAttempts }) => {
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const { toast } = useToast();

    const submission = useMemo(() => {
        return allSubmissions.find(s => s.studentId === studentId && s.homeworkId === homework.id);
    }, [allSubmissions, studentId, homework.id]);

    const attempts = useMemo(() => {
        if (!submission) return [];
        return allAttempts
            .filter(a => a.submissionId === submission.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allAttempts, submission]);

    const latestAttempt = useMemo(() => attempts[0] || null, [attempts]);
    const hasComment = useMemo(() => attempts.some(a => a.comment), [attempts]);

    const handleNewAttempt = async (status: HomeworkStatus, comment?: string) => {
        let currentSubmissionId = submission?.id;

        // If no submission "folder" exists, create one
        if (!currentSubmissionId) {
            const newSubmissionId = await db.submissions.add({ studentId, homeworkId: homework.id! });
            currentSubmissionId = newSubmissionId as number;
        }

        await db.submissionAttempts.add({
            submissionId: currentSubmissionId!,
            status,
            comment,
            date: new Date(),
        });

        // Gi poeng automatisk ved godkjent lekse
        if (status === "Godkjent") {
            const homeworkAction = positiveActions.find(a => a.actionKey === 'HOMEWORK_APPROVED');
            if (homeworkAction) {
                await givePoints(studentId, homeworkAction.points, homeworkAction.name);
            }
        }
    };
    
    const handleQuickAttempt = async (status: HomeworkStatus) => {
        setIsPopoverOpen(false);
        try {
            await handleNewAttempt(status);
            toast({ title: "Vurdering lagret" });
        } catch (error) {
            console.error("Failed to save quick attempt:", error);
            toast({ title: "Feil", description: "Kunne ikke lagre vurdering.", variant: "destructive" });
        }
    };
    
    return (
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <button className="flex items-center justify-center w-full h-full p-2 relative min-h-[58px]">
                        {latestAttempt ? statusIcons[latestAttempt.status] : <span className="text-muted-foreground">-</span>}
                        {hasComment && <FileText className="absolute w-3 h-3 text-blue-600 bottom-1 right-1" />}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1">
                    <div className="flex flex-col">
                        {Object.entries(statusIcons).map(([status, icon]) => (
                            <Button key={status} variant="ghost" className="justify-start" onClick={() => handleQuickAttempt(status as HomeworkStatus)}>
                                {icon}
                                <span className="ml-2">{status}</span>
                            </Button>
                        ))}
                         <Button variant="ghost" className="justify-start" onClick={() => { setIsPopoverOpen(false); setIsHistoryDialogOpen(true); }}>
                            <History />
                            <span className="ml-2">Historikk / Kommentar</span>
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Vurderingshistorikk & Kommentar</DialogTitle>
                    <DialogDescription>
                        {homework.title || 'Lekse'} for uke {homework.week}
                    </DialogDescription>
                </DialogHeader>
                <SubmissionHistory attempts={attempts} />
                <NewAttemptForm onSubmit={handleNewAttempt} onFinish={() => setIsHistoryDialogOpen(false)} />
            </DialogContent>
        </Dialog>
    );
};


const SubmissionHistory: FC<{ attempts: SubmissionAttempt[] }> = ({ attempts }) => {
    if (attempts.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Ingen tidligere vurderinger.</p>;
    }

    return (
        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
            {attempts.map(attempt => (
                <div key={attempt.id} className="flex gap-4 items-start">
                    <div className="mt-1">{statusIcons[attempt.status]}</div>
                    <div>
                        <p className="font-semibold">{attempt.status}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(attempt.date), "PPP p", { locale: nb })}</p>
                        {attempt.comment && <p className="text-sm italic mt-1 bg-muted p-2 rounded-md">"{attempt.comment}"</p>}
                    </div>
                </div>
            ))}
        </div>
    );
};

const NewAttemptForm: FC<{ onSubmit: (status: HomeworkStatus, comment?: string) => Promise<void>, onFinish: () => void }> = ({ onSubmit, onFinish }) => {
    const [status, setStatus] = useState<HomeworkStatus>("Godkjent");
    const [comment, setComment] = useState("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit(status, comment);
            toast({ title: "Ny vurdering lagret" });
            onFinish(); // Close the dialog after submission
        } catch (error) {
            console.error("Failed to save new attempt:", error);
            toast({ title: "Feil", description: "Kunne ikke lagre vurdering.", variant: "destructive" });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Legg til ny vurdering</h4>
            <Select onValueChange={(v: HomeworkStatus) => setStatus(v)} defaultValue={status}>
                <SelectTrigger>
                    <SelectValue placeholder="Velg status" />
                </SelectTrigger>
                <SelectContent>
                    {Object.keys(statusIcons).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Textarea
                placeholder="Legg til en kommentar (valgfritt)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
            <DialogFooter>
                 <Button type="submit">Lagre vurdering</Button>
            </DialogFooter>
        </form>
    );
};


const AddHomeworkDialog: FC<{ subjects: Subject[]; onAddHomework: (title: string, subjectId: string, date: Date, defaultStatus: HomeworkStatus | "none") => void; }> = ({ subjects, onAddHomework }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleAdd = () => {
    if (subjectId && date) {
      const finalTitle = title.trim();
      // Always start with no status - teachers will use bulk actions to mark students
      onAddHomework(finalTitle, subjectId, date, "none");
      resetState();
      setIsOpen(false);
    }
  };
  
  const resetState = () => {
      setTitle("");
      setSubjectId("");
      setDate(new Date());
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) resetState();
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          Ny Lekse
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Legg til ny lekse</DialogTitle>
          <DialogDescription>Fyll ut detaljene for den nye leksen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input 
            placeholder="Tittel på leksen (valgfritt)" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Velg fag" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Avbryt</Button>
          <Button onClick={handleAdd} disabled={!subjectId || !date}>Legg til</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function HomeworkOverview({ students, subjects, homework: homeworkList, submissions, onUpdate }: HomeworkOverviewProps) {
  const [filters, setFilters] = useState<{ subject: string; week: string; showProblems: boolean }>({ subject: "all", week: "all", showProblems: false });
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<HomeworkStatus>('Godkjent');
  const [remainingStatus, setRemainingStatus] = useState<HomeworkStatus>('Godkjent');
  const [currentHomeworkId, setCurrentHomeworkId] = useState<number | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [showRemainingConfirm, setShowRemainingConfirm] = useState(false);
  const { toast } = useToast();
  
  const allSubmissions = useLiveQuery(() => db.submissions.toArray(), [], []);
  const allAttempts = useLiveQuery(() => db.submissionAttempts.toArray(), [], []);

  const handleAddHomework = async (title: string, subjectId: string, date: Date, defaultStatus: HomeworkStatus | "none") => {
    try {
        const newHomeworkId = await db.homework.add({
          title,
          subjectId,
          date: date,
          week: getWeekNumber(date),
        });
        toast({ title: "Lekse lagt til", description: `"${title || subjects.find(s => s.id === subjectId)?.name}" er lagt til i oversikten.` });

        // Fjernet default status logikk - alle starter uten status
        if (defaultStatus !== "none") {
            const newSubmissions: Omit<Submission, 'id'>[] = students.map(student => ({
                studentId: student.id!,
                homeworkId: newHomeworkId as number,
            }));
            const newSubmissionIds = await db.submissions.bulkAdd(newSubmissions as Submission[], { allKeys: true });

            const newAttempts = newSubmissionIds.map(subId => ({
                submissionId: subId as number,
                status: defaultStatus,
                date: new Date(),
            }));
            await db.submissionAttempts.bulkAdd(newAttempts as SubmissionAttempt[]);
            toast({ title: "Standardstatus satt", description: `Alle elever er satt til "${defaultStatus}".` });
        }
    } catch(error) {
        toast({ title: "Feil", description: "Kunne ikke legge til lekse eller standardstatus.", variant: "destructive" });
    }
  };

  // Bulk actions for selected students
  const handleBulkAction = async (homeworkId: number, status: HomeworkStatus) => {
    if (selectedStudents.size === 0) return;
    
    setCurrentHomeworkId(homeworkId);
    setBulkStatus(status);
    
    // Vis bekreftelsesdialog hvis status er "Godkjent"
    if (status === 'Godkjent') {
      setShowBulkConfirm(true);
    } else {
      await executeBulkAction(homeworkId, status, Array.from(selectedStudents));
    }
  };

  const executeBulkAction = async (homeworkId: number, status: HomeworkStatus, studentIds: number[]) => {
    try {
      const homeworkAction = positiveActions.find(a => a.actionKey === 'HOMEWORK_APPROVED');
      const now = new Date();

      // Batch process: first find/create all submissions
      const submissionMap = new Map<number, number>();
      const newSubmissions: Omit<Submission, 'id'>[] = [];
      
      for (const studentId of studentIds) {
        const submission = allSubmissions?.find(s => s.studentId === studentId && s.homeworkId === homeworkId);
        if (submission?.id) {
          submissionMap.set(studentId, submission.id);
        } else {
          newSubmissions.push({ studentId, homeworkId });
        }
      }
      
      // Bulk add missing submissions
      if (newSubmissions.length > 0) {
        const newIds = await db.submissions.bulkAdd(newSubmissions as Submission[], { allKeys: true }) as number[];
        newSubmissions.forEach((sub, index) => {
          submissionMap.set(sub.studentId, newIds[index]);
        });
      }
      
      // Batch add all attempts
      const attempts: Omit<SubmissionAttempt, 'id'>[] = studentIds.map(studentId => ({
        submissionId: submissionMap.get(studentId)!,
        status,
        date: now,
      }));
      
      await db.submissionAttempts.bulkAdd(attempts as SubmissionAttempt[]);
      
      // Batch give points if status is Godkjent
      if (status === 'Godkjent' && homeworkAction) {
        await Promise.all(
          studentIds.map(studentId => 
            givePoints(studentId, homeworkAction.points, homeworkAction.name)
          )
        );
      }

      setSelectedStudents(new Set());
      toast({ 
        title: "Vurdering lagret", 
        description: `${studentIds.length} elever merket som "${status}"` 
      });
    } catch (error) {
      console.error('Bulk action failed:', error);
      toast({ 
        title: "Feil", 
        description: "Kunne ikke lagre vurderinger", 
        variant: "destructive" 
      });
    }
  };

  // Mark remaining students (without status) with a specific status
  const handleRemainingAction = async (homeworkId: number, status: HomeworkStatus) => {
    const studentsWithoutStatus = getStudentsWithoutStatus(homeworkId);
    
    if (studentsWithoutStatus.length === 0) {
      toast({ 
        title: "Ingen resterende elever", 
        description: "Alle elever har allerede fått en vurdering" 
      });
      return;
    }

    setCurrentHomeworkId(homeworkId);
    setRemainingStatus(status);

    // Vis bekreftelsesdialog hvis status er "Godkjent"
    if (status === 'Godkjent') {
      setShowRemainingConfirm(true);
    } else {
      await executeBulkAction(homeworkId, status, studentsWithoutStatus);
    }
  };

  const getStudentsWithoutStatus = (homeworkId: number): number[] => {
    if (!allSubmissions || !allAttempts) return [];

    return students
      .filter(student => {
        const submission = allSubmissions.find(s => s.studentId === student.id && s.homeworkId === homeworkId);
        if (!submission) return true; // No submission = no status

        const hasAttempts = allAttempts.some(a => a.submissionId === submission.id);
        return !hasAttempts; // Has submission but no attempts = no status
      })
      .map(s => s.id!);
  };

  const toggleStudentSelection = (studentId: number) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudents(newSet);
  };

  const handleCopyHomework = async (homeworkId: number) => {
    const hwToCopy = homeworkList.find(h => h.id === homeworkId);
    if(hwToCopy) {
      const { id, ...hwData } = hwToCopy;
      const newDate = new Date();
      const newHwData = { ...hwData, week: getWeekNumber(newDate), date: newDate };
      
      try {
        await db.homework.add(newHwData as Homework);
        toast({ title: "Lekse kopiert", description: `En ny versjon av "${hwToCopy.title}" er opprettet for denne uken.`});
      } catch(error) {
        toast({ title: "Feil", description: "Kunne ikke kopiere lekse.", variant: "destructive" });
      }
    }
  };

  const handleDeleteHomework = async (homeworkId: number) => {
    try {
        await db.transaction('rw', db.homework, db.submissions, db.submissionAttempts, async () => {
            const subsToDelete = await db.submissions.where('homeworkId').equals(homeworkId).toArray();
            const subIds = subsToDelete.map(s => s.id!);
            
            if (subIds.length > 0) {
                await db.submissionAttempts.where('submissionId').anyOf(subIds).delete();
                await db.submissions.bulkDelete(subIds);
            }
            
            await db.homework.delete(homeworkId);
        });
        toast({ title: "Lekse slettet", description: "Leksen og alle tilhørende data er slettet.", variant: "destructive" });
    } catch (error) {
        console.error("Failed to delete homework:", error);
        toast({ title: "Feil", description: "Kunne ikke slette leksen.", variant: "destructive" });
    }
  };

  const filteredHomework = useMemo(() => {
    if (!Array.isArray(homeworkList)) return [];
    return homeworkList
      .filter(hw => filters.subject === "all" || hw.subjectId === filters.subject)
      .filter(hw => filters.week === "all" || hw.week === parseInt(filters.week))
      .sort((a,b) => {
          const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
          const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
          return dateB - dateA;
      });
  }, [homeworkList, filters]);

  const problemStatuses: HomeworkStatus[] = ["Ikke levert", "Må rettes", "Glemt bok"];

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!filters.showProblems || !allSubmissions || !allAttempts) {
      return sortedStudents;
    }
    
    const visibleHomeworkIds = new Set(filteredHomework.map(hw => hw.id));
    if (visibleHomeworkIds.size === 0) {
      return sortedStudents;
    }

    const studentSubmissionMap = allSubmissions.reduce((map, sub) => {
        const key = `${sub.studentId}-${sub.homeworkId}`;
        map.set(key, sub.id!);
        return map;
    }, new Map<string, number>());

    const latestAttempts = new Map<number, SubmissionAttempt>();
    for (const attempt of allAttempts) {
        if (!latestAttempts.has(attempt.submissionId) || new Date(attempt.date) > new Date(latestAttempts.get(attempt.submissionId)!.date)) {
            latestAttempts.set(attempt.submissionId, attempt);
        }
    }

    return sortedStudents.filter(student => {
      return filteredHomework.some(hw => {
        const submissionId = studentSubmissionMap.get(`${student.id}-${hw.id}`);
        if (!submissionId) return true; // No submission is a "problem"
        const latestAttempt = latestAttempts.get(submissionId);
        return !latestAttempt || problemStatuses.includes(latestAttempt.status);
      });
    });
  }, [sortedStudents, filters.showProblems, filteredHomework, allSubmissions, allAttempts]);
  
  const uniqueWeeks = [...new Set((homeworkList || []).filter(h => h && h.week).map(h => h.week))].sort((a,b) => b-a);
  
  return (
    <div className="space-y-4">
      <Collapsible>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold">Lekseoversikt</h2>
            <div className="flex items-center gap-2">
                 <AddHomeworkDialog subjects={subjects} onAddHomework={handleAddHomework} />
                <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Vis/Skjul Filter
                        <ChevronDown className="ml-2 h-4 w-4"/>
                    </Button>
                </CollapsibleTrigger>
            </div>
        </div>
        <CollapsibleContent className="p-4 mt-4 border rounded-md">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={filters.subject} onValueChange={v => setFilters({...filters, subject: v})}>
                <SelectTrigger><SelectValue placeholder="Filtrer på fag..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Fag</SelectItem>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
               <Select value={filters.week} onValueChange={v => setFilters({...filters, week: v})}>
                <SelectTrigger><SelectValue placeholder="Filtrer på uke..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Uker</SelectItem>
                  {uniqueWeeks.map(w => <SelectItem key={w} value={String(w)}>Uke {w}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Checkbox id="showProblems" checked={filters.showProblems} onCheckedChange={c => setFilters({...filters, showProblems: !!c})} />
                <label htmlFor="showProblems" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Vis kun elever med mangler</label>
              </div>
              <Button onClick={() => setFilters({ subject: "all", week: "all", showProblems: false})} variant="ghost">
                <RotateCcw className="mr-2 h-4 w-4" />
                Nullstill filter
              </Button>
            </div>
        </CollapsibleContent>
      </Collapsible>
      
      {/* Bulk Actions - shown per homework column */}
      
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 w-12 bg-background">
                <Checkbox 
                  checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedStudents(new Set(filteredStudents.map(s => s.id!)));
                    } else {
                      setSelectedStudents(new Set());
                    }
                  }}
                />
              </TableHead>
              <TableHead className="sticky left-12 z-10 font-bold bg-background">
                <div>Elev</div>
                {selectedStudents.size > 0 && (
                  <div className="text-xs font-normal text-muted-foreground mt-1">
                    {selectedStudents.size} valgt
                  </div>
                )}
              </TableHead>
              {filteredHomework.map(hw => (
                <TableHead key={hw.id} className="text-center group relative min-w-[140px]">
                  <div className="font-semibold">{subjects.find(s => s.id === hw.subjectId)?.name}</div>
                  {hw.title && <div className="font-normal text-sm">{hw.title}</div>}
                  <div className="text-xs font-light text-muted-foreground">Uke {hw.week}</div>
                  
                  {/* Action buttons */}
                  <div className="absolute top-1 right-1 flex invisible group-hover:visible">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyHomework(hw.id!)}>
                        <Copy className="h-3 w-3"/>
                    </Button>
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
                              Dette vil slette leksen '{hw.title || subjects.find(s => s.id === hw.subjectId)?.name}' og alle innleveringer for alle elever. Handlingen kan ikke angres.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteHomework(hw.id!)}>
                              Ja, slett leksen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                  </div>
                  
                  {/* Bulk Action per homework column */}
                  {selectedStudents.size > 0 && (
                    <div className="mt-3 pt-2 border-t">
                      <Select value="" onValueChange={(v) => handleBulkAction(hw.id!, v as HomeworkStatus)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Merk valgte..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusIcons).map(([status, icon]) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
                                <span>{status}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Mark Remaining Section */}
                  {getStudentsWithoutStatus(hw.id!).length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-1.5">
                        {getStudentsWithoutStatus(hw.id!).length} resterende
                      </div>
                      <Select value="" onValueChange={(v) => handleRemainingAction(hw.id!, v as HomeworkStatus)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Merk alle..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusIcons).map(([status, icon]) => (
                            <SelectItem key={status} value={status}>
                              <div className="flex items-center gap-2">
                                <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
                                <span>{status}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map(student => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 z-10 w-12 bg-background">
                  <Checkbox 
                    checked={selectedStudents.has(student.id!)}
                    onCheckedChange={() => toggleStudentSelection(student.id!)}
                  />
                </TableCell>
                <TableCell 
                  className="sticky left-12 z-10 font-medium bg-background cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleStudentSelection(student.id!)}
                >
                  {student.name}
                </TableCell>
                {filteredHomework.map(hw => {
                  return (
                    <TableCell key={hw.id} className="p-0 text-center">
                      <HomeworkCell 
                        studentId={student.id!} 
                        homework={hw}
                        allSubmissions={allSubmissions || []}
                        allAttempts={allAttempts || []}
                      />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Confirmation Dialog for Godkjent - Bulk */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekreft godkjenning</AlertDialogTitle>
            <AlertDialogDescription>
              Du er i ferd med å godkjenne lekser for {selectedStudents.size} elev(er).
              <br /><br />
              <strong>Totalt poeng som deles ut: {selectedStudents.size * (positiveActions.find(a => a.actionKey === 'HOMEWORK_APPROVED')?.points || 0)}</strong>
              <br />
              ({selectedStudents.size} × {positiveActions.find(a => a.actionKey === 'HOMEWORK_APPROVED')?.points || 0} poeng)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (currentHomeworkId && bulkStatus) {
                await executeBulkAction(currentHomeworkId, bulkStatus, Array.from(selectedStudents));
                setShowBulkConfirm(false);
              }
            }}>
              Bekreft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Confirmation Dialog for Godkjent - Remaining */}
      <AlertDialog open={showRemainingConfirm} onOpenChange={setShowRemainingConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekreft godkjenning av resterende</AlertDialogTitle>
            <AlertDialogDescription>
              {currentHomeworkId && (() => {
                const remaining = getStudentsWithoutStatus(currentHomeworkId);
                const points = positiveActions.find(a => a.actionKey === 'HOMEWORK_APPROVED')?.points || 0;
                return (
                  <>
                    Du er i ferd med å godkjenne lekser for {remaining.length} resterende elev(er).
                    <br /><br />
                    <strong>Totalt poeng som deles ut: {remaining.length * points}</strong>
                    <br />
                    ({remaining.length} × {points} poeng)
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (currentHomeworkId && remainingStatus) {
                const remaining = getStudentsWithoutStatus(currentHomeworkId);
                await executeBulkAction(currentHomeworkId, remainingStatus, remaining);
                setShowRemainingConfirm(false);
              }
            }}>
              Bekreft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



