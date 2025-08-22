"use client";

import { useState, useEffect } from "react";
import type { Student, Subject } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStudents, addStudent, deleteStudent, getSubjects, addSubject, deleteSubject, seedDatabase } from "@/lib/firestore";

export default function Admin() {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newStudent, setNewStudent] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, subjectsData] = await Promise.all([getStudents(), getSubjects()]);
      setStudents(studentsData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Feil", description: "Kunne ikke laste data fra databasen.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [toast]);

  const handleAddStudent = async () => {
    if (newStudent.trim()) {
      try {
        const newStudentDoc = await addStudent({ name: newStudent.trim() });
        setStudents([...students, newStudentDoc]);
        setNewStudent("");
        toast({ title: "Elev lagt til", description: `${newStudentDoc.name} er lagt til i klasselisten.` });
      } catch (error) {
        toast({ title: "Feil", description: "Kunne ikke legge til elev.", variant: "destructive" });
      }
    }
  };

  const handleAddSubject = async () => {
    if (newSubject.trim()) {
      try {
        const newSubjectDoc = await addSubject({ name: newSubject.trim() });
        setSubjects([...subjects, newSubjectDoc]);
        setNewSubject("");
        toast({ title: "Fag lagt til", description: `${newSubjectDoc.name} er lagt til i faglisten.` });
      } catch (error) {
         toast({ title: "Feil", description: "Kunne ikke legge til fag.", variant: "destructive" });
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const studentName = students.find(s => s.id === id)?.name;
    try {
      await deleteStudent(id);
      setStudents(students.filter((s) => s.id !== id));
      toast({ title: "Elev slettet", description: `${studentName} er fjernet.`, variant: "destructive" });
    } catch (error) {
       toast({ title: "Feil", description: "Kunne ikke slette elev.", variant: "destructive" });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    const subjectName = subjects.find(s => s.id === id)?.name;
    try {
      await deleteSubject(id);
      setSubjects(subjects.filter((s) => s.id !== id));
      toast({ title: "Fag slettet", description: `${subjectName} er fjernet.`, variant: "destructive" });
    } catch (error) {
       toast({ title: "Feil", description: "Kunne ikke slette fag.", variant: "destructive" });
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      await seedDatabase();
      toast({ title: "Database fylt", description: "Startdata har blitt lagt til i databasen."});
      await loadData();
    } catch(error) {
      console.error("Seeding error:", error);
      toast({ title: "Feil", description: "Kunne ikke legge til startdata.", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  }
  
  if (loading) {
    return <div className="flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /> Laster data...</div>;
  }

  if (students.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Start-oppsett</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-muted-foreground">Databasen er tom. Legg til start-data for å komme i gang.</p>
                <Button onClick={handleSeedDatabase} disabled={isSeeding}>
                    {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="mr-2"/>}
                    Fyll database med start-data
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Administrer Elever</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              value={newStudent}
              onChange={(e) => setNewStudent(e.target.value)}
              placeholder="Ny elev..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
            />
            <Button onClick={handleAddStudent}><Plus className="mr-2"/> Legg til</Button>
          </div>
          <ul className="space-y-2">
            {students.map((student) => (
              <li key={student.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                <span>{student.name}</span>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Administrer Fag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Nytt fag..."
               onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
            />
            <Button onClick={handleAddSubject}><Plus className="mr-2"/> Legg til</Button>
          </div>
          <ul className="space-y-2">
            {subjects.map((subject) => (
              <li key={subject.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                <span>{subject.name}</span>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(subject.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
