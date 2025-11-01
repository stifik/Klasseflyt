"use client";

import * as React from "react";
import { useState } from "react";
import type { Student, Subject } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { db } from "@/lib/db";

interface StudentsAndSubjectsProps {
  students: Student[];
  subjects: Subject[];
}

export default function StudentsAndSubjects({ students, subjects }: StudentsAndSubjectsProps) {
  const [newStudent, setNewStudent] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [editingStudentName, setEditingStudentName] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState("");
  const { toast } = useToast();

  const handleAddStudent = async () => {
    if (newStudent.trim()) {
      try {
        await db.students.add({ name: newStudent.trim(), points: 0 });
        setNewStudent("");
        toast({ title: "Elev lagt til", description: `${newStudent.trim()} er lagt til i klasselisten.` });
      } catch (error) {
        toast({ title: "Feil", description: "Kunne ikke legge til elev.", variant: "destructive" });
      }
    }
  };

  const handleAddSubject = async () => {
    if (newSubject.trim()) {
      try {
        await db.subjects.add({ name: newSubject.trim() });
        setNewSubject("");
        toast({ title: "Fag lagt til", description: `${newSubject.trim()} er lagt til i faglisten.` });
      } catch (error) {
        toast({ title: "Feil", description: "Kunne ikke legge til fag.", variant: "destructive" });
      }
    }
  };

  const handleDeleteStudent = async (id: number) => {
    const studentName = students.find(s => s.id === id)?.name;
    try {
      await db.students.delete(id);
      toast({ title: "Elev slettet", description: `${studentName} er fjernet.`, variant: "destructive" });
    } catch (error) {
      toast({ title: "Feil", description: "Kunne ikke slette elev.", variant: "destructive" });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    const subjectName = subjects.find(s => s.id === id)?.name;
    try {
      await db.subjects.delete(id);
      toast({ title: "Fag slettet", description: `${subjectName} er fjernet.`, variant: "destructive" });
    } catch (error) {
      toast({ title: "Feil", description: "Kunne ikke slette fag.", variant: "destructive" });
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudentId(student.id!);
    setEditingStudentName(student.name);
  };

  const handleSaveStudent = async () => {
    if (editingStudentId && editingStudentName.trim()) {
      try {
        // Get the old student name before updating
        const oldStudent = await db.students.get(editingStudentId);
        const oldName = oldStudent?.name;
        const newName = editingStudentName.trim();
        
        // Update student name
        await db.students.update(editingStudentId, { name: newName });
        
        // Update name in all seating charts if it changed
        if (oldName && oldName !== newName) {
          const seatingRecords = await db.seatingChartHistory.toArray();
          
          for (const record of seatingRecords) {
            // Parse the chart JSON
            const chart = JSON.parse(record.chartJson) as (string[] | null)[][];
            let updated = false;
            
            // Update names in the chart
            const newChart = chart.map((row: (string[] | null)[]) => 
              row.map((cell: string[] | null) => {
                if (cell && cell.includes(oldName)) {
                  updated = true;
                  return cell.map((name: string) => name === oldName ? newName : name);
                }
                return cell;
              })
            );
            
            if (updated) {
              await db.seatingChartHistory.update(record.id!, { 
                chartJson: JSON.stringify(newChart) 
              });
            }
          }
        }
        
        toast({ title: "Elev oppdatert", description: "Elevens navn er endret." });
        setEditingStudentId(null);
        setEditingStudentName("");
      } catch (error) {
        toast({ title: "Feil", description: "Kunne ikke oppdatere elev.", variant: "destructive" });
      }
    }
  };

  const handleCancelEditStudent = () => {
    setEditingStudentId(null);
    setEditingStudentName("");
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id!);
    setEditingSubjectName(subject.name);
  };

  const handleSaveSubject = async () => {
    if (editingSubjectId && editingSubjectName.trim()) {
      try {
        await db.subjects.update(editingSubjectId, { name: editingSubjectName.trim() });
        toast({ title: "Fag oppdatert", description: "Fagets navn er endret." });
        setEditingSubjectId(null);
        setEditingSubjectName("");
      } catch (error) {
        toast({ title: "Feil", description: "Kunne ikke oppdatere fag.", variant: "destructive" });
      }
    }
  };

  const handleCancelEditSubject = () => {
    setEditingSubjectId(null);
    setEditingSubjectName("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Elever og Fag</CardTitle>
        <CardDescription>Administrer elever og fag i appen</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={[]} className="w-full">
          {/* Students Section */}
          <AccordionItem value="students">
            <AccordionTrigger>Elever ({students?.length || 0})</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newStudent}
                  onChange={(e) => setNewStudent(e.target.value)}
                  placeholder="Ny elev..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                />
                <Button onClick={handleAddStudent}>
                  <Plus className="mr-2" /> Legg til
                </Button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {students?.map((student) => (
                  <li key={student.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary">
                    {editingStudentId === student.id ? (
                      <>
                        <Input
                          value={editingStudentName}
                          onChange={(e) => setEditingStudentName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveStudent();
                            if (e.key === 'Escape') handleCancelEditStudent();
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={handleSaveStudent}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEditStudent}>
                            <X className="w-4 h-4 text-gray-600" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{student.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditStudent(student)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Dette vil permanent slette eleven {student.name} og all relatert data. Handlingen kan ikke angres.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStudent(student.id!)}>
                                  Ja, slett elev
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Subjects Section */}
          <AccordionItem value="subjects" className="border-b-0">
            <AccordionTrigger>Fag ({subjects?.length || 0})</AccordionTrigger>
            <AccordionContent className="pt-2 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Nytt fag..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                />
                <Button onClick={handleAddSubject}>
                  <Plus className="mr-2" /> Legg til
                </Button>
              </div>
              <ul className="space-y-2">
                {subjects?.map((subject) => (
                  <li key={subject.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary">
                    {editingSubjectId === subject.id ? (
                      <>
                        <Input
                          value={editingSubjectName}
                          onChange={(e) => setEditingSubjectName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSubject();
                            if (e.key === 'Escape') handleCancelEditSubject();
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={handleSaveSubject}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEditSubject}>
                            <X className="w-4 h-4 text-gray-600" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{subject.name}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditSubject(subject)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Dette vil permanent slette faget {subject.name}. Handlingen kan ikke angres.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSubject(subject.id!)}>
                                  Ja, slett fag
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
