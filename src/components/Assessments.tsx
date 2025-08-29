
"use client";

import { useState, useMemo, type FC } from "react";
import type { Student, Subject, Test, TestResult } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";

interface AssessmentsProps {
  students: Student[];
  subjects: Subject[];
  tests: Test[];
  testResults: TestResult[];
}

const AddTestDialog: FC<{ subjects: Subject[]; onAddTest: (title: string, subjectId: string, maxScore: number) => void; }> = ({ subjects, onAddTest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [maxScore, setMaxScore] = useState<number | string>("");

  const handleAdd = () => {
    const score = Number(maxScore);
    if (title && subjectId && !isNaN(score) && score > 0) {
      onAddTest(title, subjectId, score);
      setTitle("");
      setSubjectId("");
      setMaxScore("");
      setIsOpen(false);
    }
  };
  
  const resetState = () => {
      setTitle("");
      setSubjectId("");
      setMaxScore("");
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) resetState();
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          Ny Vurdering
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Legg til ny vurdering</DialogTitle>
          <DialogDescription>Fyll ut detaljene for den nye prøven eller vurderingen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input 
            placeholder="Tittel på vurderingen" 
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
          <Input
            type="number"
            placeholder="Maks poengsum"
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Avbryt</Button>
          <Button onClick={handleAdd} disabled={!title || !subjectId || !maxScore || Number(maxScore) <= 0}>Legg til</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function Assessments({ students, subjects, tests = [], testResults = [] }: AssessmentsProps) {
  const { toast } = useToast();
  
  const getResult = (studentId: string, testId: number) => testResults.find(r => r.studentId === studentId && r.testId === testId);

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
      // No toast for every input change to avoid being spammy
    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: "Kunne ikke lagre resultat.", variant: "destructive" });
    }
  };

  const handleAddTest = async (title: string, subjectId: string, maxScore: number) => {
    try {
      await db.tests.add({
        title,
        subjectId,
        maxScore,
        date: new Date(),
      });
      toast({ title: "Vurdering lagt til", description: `"${title}" er lagt til i oversikten.` });
    } catch (error) {
      toast({ title: "Feil", description: "Kunne ikke legge til vurdering.", variant: "destructive" });
    }
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
  }, [students]);
  
  const sortedTests = useMemo(() => {
    return [...(tests || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tests]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Vurderingsoversikt</h2>
        <AddTestDialog subjects={subjects} onAddTest={handleAddTest} />
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
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudents.map(student => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 z-10 font-medium bg-background">{student.name}</TableCell>
                {sortedTests.map(t => {
                  const result = getResult(student.id!, t.id!);
                  return (
                    <TableCell key={t.id} className="p-1 text-center min-w-[100px]">
                      <Input
                        type="number"
                        placeholder="-"
                        defaultValue={result?.score ?? ''}
                        onBlur={(e) => handleScoreChange(student.id!, t.id!, e.target.value)}
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
