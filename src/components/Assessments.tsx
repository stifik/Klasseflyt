
"use client";

import { useState, useMemo, type FC } from "react";
import type { Student, Subject, Test, TestResult } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Edit2, Copy, Filter, RotateCcw, ChevronDown, CheckCircle, XCircle, AlertTriangle, Thermometer, BookX, Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { db } from "@/lib/db";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Textarea } from "./ui/textarea";

interface AssessmentsProps {
  students: Student[];
  subjects: Subject[];
  tests: Test[];
  testResults: TestResult[];
}

const AddTestDialog: FC<{ subjects: Subject[]; onAddTest: (title: string, subjectId: string, maxPoints: number) => void; }> = ({ subjects, onAddTest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [maxPoints, setMaxPoints] = useState<number | "">("");

  const handleAdd = () => {
    if (title && subjectId && maxPoints > 0) {
      onAddTest(title, subjectId, Number(maxPoints));
      resetState();
      setIsOpen(false);
    }
  };
  
  const resetState = () => {
      setTitle("");
      setSubjectId("");
      setMaxPoints("");
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
          <DialogDescription>Fyll ut detaljene for den nye prøven.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input 
            placeholder="Tittel på prøven" 
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
          <Input
            type="number"
            placeholder="Maks poengsum"
            value={maxPoints}
            onChange={(e) => setMaxPoints(e.target.value === '' ? '' : Number(e.target.value))}
            min="1"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Avbryt</Button>
          <Button onClick={handleAdd} disabled={!title || !subjectId || !maxPoints || maxPoints <= 0}>Legg til</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function Assessments({ students, subjects, tests, testResults }: AssessmentsProps) {
  const [editingCell, setEditingCell] = useState<{ studentId: string; testId: number } | null>(null);
  const [cellValue, setCellValue] = useState<string>("");
  const { toast } = useToast();

  const getTestResult = (studentId: string, testId: number) => {
    return testResults.find(r => r.studentId === studentId && r.testId === testId);
  }

  const handleAddTest = async (title: string, subjectId: string, maxPoints: number) => {
    try {
      await db.tests.add({
        title,
        subjectId,
        maxPoints,
        date: new Date(),
      });
      toast({ title: "Prøve lagt til", description: `"${title}" er lagt til i oversikten.` });
    } catch (error) {
      toast({ title: "Feil", description: "Kunne ikke legge til prøve.", variant: "destructive" });
    }
  };

  const handleCellClick = (studentId: string, testId: number) => {
    const result = getTestResult(studentId, testId);
    setCellValue(result?.points?.toString() || "");
    setEditingCell({ studentId, testId });
  };
  
  const handleCellBlur = async () => {
    if (!editingCell) return;
    const { studentId, testId } = editingCell;
    const points = cellValue.trim() === "" ? null : parseInt(cellValue, 10);

    if (isNaN(points as any)) {
      setEditingCell(null);
      return; // Do nothing if input is not a valid number
    }

    const existingResult = getTestResult(studentId, testId);

    try {
      if (existingResult) {
        if (points === null) {
          await db.testResults.delete(existingResult.id!);
        } else {
          await db.testResults.update(existingResult.id!, { points });
        }
      } else if (points !== null) {
        await db.testResults.add({
          studentId,
          testId,
          points,
        });
      }
      setEditingCell(null);
    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: "Kunne ikke lagre resultat.", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };
  
  const sortedTests = useMemo(() => {
    if (!Array.isArray(tests)) return [];
    return [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tests]);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
  }, [students]);

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
              {sortedTests.map(test => (
                <TableHead key={test.id} className="text-center group">
                  <div>{subjects.find(s => s.id === test.subjectId)?.name}</div>
                  <div className="font-normal">{test.title}</div>
                  <div className="text-xs font-light text-muted-foreground">Maks: {test.maxPoints}p</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudents.map(student => (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 z-10 font-medium bg-background">{student.name}</TableCell>
                {sortedTests.map(test => {
                  const isEditing = editingCell?.studentId === student.id && editingCell?.testId === test.id!;
                  const result = getTestResult(student.id, test.id!);
                  
                  return (
                    <TableCell 
                      key={test.id} 
                      className="p-0 text-center cursor-pointer" 
                      onClick={() => handleCellClick(student.id, test.id!)}
                    >
                      {isEditing ? (
                        <Input
                          type="number"
                          value={cellValue}
                          onChange={(e) => setCellValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="w-20 mx-auto text-center"
                          max={test.maxPoints}
                          min={0}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full p-2 min-h-[58px]">
                          {result?.points !== null && result?.points !== undefined ? (
                            <span className="font-semibold">{result.points}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      )}
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
