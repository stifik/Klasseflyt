
"use client";

import { useState, useMemo, type FC, useEffect } from "react";
import type { Student, Subject, Homework, Submission, HomeworkStatus } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, Edit2, Copy, Filter, RotateCcw, ChevronDown, CheckCircle, XCircle, AlertTriangle, Thermometer, BookX, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addHomework, setSubmission } from "@/lib/firestore";
import { Input } from "./ui/input";

interface HomeworkOverviewProps {
  students: Student[];
  subjects: Subject[];
  homeworkList: Homework[];
  submissions: Submission[];
  onUpdate: () => void;
  usingMockData?: boolean;
  onLocalUpdate?: (data: { homework?: Homework[], submissions?: Submission[] }) => void;
}

const statusIcons: Record<HomeworkStatus, React.ReactElement> = {
  "Godkjent": <CheckCircle className="text-green-500" />,
  "Ikke levert": <XCircle className="text-red-500" />,
  "Må rettes": <AlertTriangle className="text-yellow-500" />,
  "Syk/Fravær": <Thermometer className="text-blue-500" />,
  "Glemt bok": <BookX className="text-orange-500" />,
};

const StatusPopover: FC<{ submission?: Submission; onStatusChange: (status: HomeworkStatus) => void; onComment: () => void; hasComment: boolean; }> = ({ submission, onStatusChange, onComment, hasComment }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
          <button className="flex items-center justify-center w-full h-full p-2 relative min-h-[58px]">
            {submission ? statusIcons[submission.status] : <span className="text-muted-foreground">-</span>}
            {hasComment && <FileText className="absolute w-3 h-3 text-blue-600 bottom-1 right-1" />}
          </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1">
        <div className="flex flex-col gap-1">
          {Object.keys(statusIcons).map((status) => (
            <Button 
              key={status} 
              variant="ghost" 
              className="justify-start gap-2 px-2" 
              onClick={() => {
                onStatusChange(status as HomeworkStatus);
                setIsOpen(false);
              }}>
              {statusIcons[status as HomeworkStatus]}
              <span>{status}</span>
            </Button>
          ))}
          <Button 
            variant="ghost" 
            className="justify-start gap-2 px-2" 
            onClick={() => {
                onComment();
                setIsOpen(false);
            }}>
            <Edit2 className="w-4 h-4" />
            <span>{hasComment ? "Rediger" : "Legg til"} kommentar</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const AddHomeworkDialog: FC<{ subjects: Subject[]; onAddHomework: (title: string, subjectId: string) => void; }> = ({ subjects, onAddHomework }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const handleAdd = () => {
    if (title && subjectId) {
      onAddHomework(title, subjectId);
      setTitle("");
      setSubjectId("");
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            placeholder="Tittel på leksen" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Velg fag" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Avbryt</Button>
          <Button onClick={handleAdd} disabled={!title || !subjectId}>Legg til</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function HomeworkOverview({ students, subjects, homeworkList, submissions, onUpdate, usingMockData, onLocalUpdate }: HomeworkOverviewProps) {
  const [commentModal, setCommentModal] = useState<{ open: boolean; studentId?: string; homeworkId?: string; }>({ open: false });
  const [currentComment, setCurrentComment] = useState("");
  const [filters, setFilters] = useState<{ subject: string; week: string; showProblems: boolean }>({ subject: "all", week: "all", showProblems: false });
  const { toast } = useToast();
  
  const getSubmission = (studentId: string, homeworkId: string) => submissions.find(s => s.studentId === studentId && s.homeworkId === homeworkId);

  const handleStatusChange = async (studentId: string, homeworkId: string, status: HomeworkStatus) => {
    if (usingMockData && onLocalUpdate) {
        let submissionUpdated = false;
        const newSubmissions = submissions.map(s => {
            if (s.studentId === studentId && s.homeworkId === homeworkId) {
                submissionUpdated = true;
                return { ...s, status };
            }
            return s;
        });
        if (!submissionUpdated) {
            newSubmissions.push({ id: `sub${submissions.length + 1}`, studentId, homeworkId, status });
        }
        onLocalUpdate({ submissions: newSubmissions });
        return;
    }

    const existingSubmission = getSubmission(studentId, homeworkId);
    const submissionData = {
        studentId,
        homeworkId,
        status,
        comment: existingSubmission?.comment || "",
    };

    try {
        await setSubmission(submissionData);
        onUpdate();
    } catch (error) {
        toast({ title: "Feil", description: "Kunne ikke lagre status.", variant: "destructive" });
    }
  };
  
  const handleCommentSave = async () => {
    if (!commentModal.studentId || !commentModal.homeworkId) return;
    const { studentId, homeworkId } = commentModal;

    if (usingMockData && onLocalUpdate) {
        let submissionUpdated = false;
        const newSubmissions = submissions.map(s => {
            if (s.studentId === studentId && s.homeworkId === homeworkId) {
                submissionUpdated = true;
                return { ...s, comment: currentComment };
            }
            return s;
        });
        if (!submissionUpdated) {
            newSubmissions.push({ id: `sub${submissions.length + 1}`, studentId, homeworkId, status: "Godkjent", comment: currentComment });
        }
        onLocalUpdate({ submissions: newSubmissions });
        setCommentModal({ open: false });
        setCurrentComment("");
        toast({ title: "Kommentar lagret (Demo)" });
        return;
    }

    const existingSubmission = getSubmission(studentId, homeworkId);
    const submissionData = {
        studentId,
        homeworkId,
        status: existingSubmission?.status || "Godkjent",
        comment: currentComment,
    };
    
    try {
        await setSubmission(submissionData);
        onUpdate();
        setCommentModal({ open: false });
        setCurrentComment("");
        toast({ title: "Kommentar lagret" });
    } catch(error) {
        toast({ title: "Feil", description: "Kunne ikke lagre kommentar.", variant: "destructive" });
    }
  };
  
  const openCommentModal = (studentId: string, homeworkId: string) => {
    const submission = getSubmission(studentId, homeworkId);
    setCurrentComment(submission?.comment || "");
    setCommentModal({ open: true, studentId, homeworkId });
  };

  const handleAddHomework = async (title: string, subjectId: string) => {
    const newDate = new Date();
    if (!('getWeek' in Date.prototype)) {
        Date.prototype.getWeek = function() {
            var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
            var dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
            return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7)
        };
    }
    const newHomeworkData: Omit<Homework, 'id'> = {
      title,
      subjectId,
      date: newDate,
      week: newDate.getWeek(),
    };
    if (usingMockData && onLocalUpdate) {
        const newHomework: Homework = { id: `hw${homeworkList.length + 1}`, ...newHomeworkData };
        onLocalUpdate({ homework: [...homeworkList, newHomework] });
        toast({ title: "Lekse lagt til (Demo)", description: `"${title}" er lagt til i oversikten.` });
        return;
    }
    try {
        await addHomework(newHomeworkData);
        onUpdate();
        toast({ title: "Lekse lagt til", description: `"${title}" er lagt til i oversikten.` });
    } catch(error) {
        toast({ title: "Feil", description: "Kunne ikke legge til lekse.", variant: "destructive" });
    }
  };

  const handleCopyHomework = async (homeworkId: string) => {
    const hwToCopy = homeworkList.find(h => h.id === homeworkId);
    if(hwToCopy) {
      const { id, ...hwData } = hwToCopy;
      const newHwData = { ...hwData, week: new Date().getWeek(), date: new Date() };
      
      if (usingMockData && onLocalUpdate) {
          const newHomework: Homework = { id: `hw${homeworkList.length + 1}`, ...newHwData };
          onLocalUpdate({ homework: [...homeworkList, newHomework] });
          toast({ title: "Lekse kopiert (Demo)", description: `En ny versjon av "${hwToCopy.title}" er opprettet for denne uken.`});
          return;
      }

      try {
        await addHomework(newHwData);
        onUpdate();
        toast({ title: "Lekse kopiert", description: `En ny versjon av "${hwToCopy.title}" er opprettet for denne uken.`});
      } catch(error) {
        toast({ title: "Feil", description: "Kunne ikke kopiere lekse.", variant: "destructive" });
      }
    }
  };

  useEffect(() => {
    if (!('getWeek' in Date.prototype)) {
        Date.prototype.getWeek = function() {
            var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
            var dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
            return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7)
        };
    }
  }, []);

  const filteredHomework = useMemo(() => {
    return homeworkList
      .filter(hw => filters.subject === "all" || hw.subjectId === filters.subject)
      .filter(hw => filters.week === "all" || hw.week === parseInt(filters.week))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [homeworkList, filters]);

  const problemStudentIds = useMemo(() => {
    return new Set(submissions
      .filter(s => s.status === 'Ikke levert' || s.status === 'Må rettes')
      .map(s => s.studentId));
  }, [submissions]);

  const filteredStudents = useMemo(() => {
    return filters.showProblems ? students.filter(s => problemStudentIds.has(s.id)) : students;
  }, [students, filters.showProblems, problemStudentIds]);
  
  const uniqueWeeks = [...new Set(homeworkList.map(h => h.week))].sort((a,b) => b-a);
  
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
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
      
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 font-bold bg-background">Elev</TableHead>
              {filteredHomework.map(hw => (
                <TableHead key={hw.id} className="text-center group">
                  <div>{subjects.find(s => s.id === hw.subjectId)?.name}</div>
                  <div className="font-normal">{hw.title}</div>
                  <div className="text-xs font-light text-muted-foreground">Uke {hw.week}</div>
                  <Button variant="ghost" size="icon" className="absolute top-0 right-0 invisible h-6 w-6 group-hover:visible" onClick={() => handleCopyHomework(hw.id)}>
                    <Copy className="h-4 w-4"/>
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map(student => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 z-10 font-medium bg-background">{student.name}</TableCell>
                {filteredHomework.map(hw => {
                  const submission = getSubmission(student.id, hw.id);
                  return (
                    <TableCell key={hw.id} className="p-0 text-center">
                      <StatusPopover 
                        submission={submission}
                        hasComment={!!submission?.comment}
                        onStatusChange={(status) => handleStatusChange(student.id, hw.id, status)}
                        onComment={() => openCommentModal(student.id, hw.id)}
                      />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={commentModal.open} onOpenChange={(open) => setCommentModal({ ...commentModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kommentar</DialogTitle>
          </DialogHeader>
          <Textarea value={currentComment} onChange={e => setCurrentComment(e.target.value)} placeholder="Skriv en kommentar..." />
          <DialogFooter>
            <Button onClick={handleCommentSave}>Lagre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
