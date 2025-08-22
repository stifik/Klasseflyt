
"use client";

import { useState } from "react";
import type { Student, Subject } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addStudent, deleteStudent, addSubject, deleteSubject, seedDatabase } from "@/lib/firestore";

interface AdminProps {
  initialStudents: Student[];
  initialSubjects: Subject[];
  onUpdate: () => void;
}

export default function Admin({ initialStudents, initialSubjects, onUpdate }: AdminProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [newStudent, setNewStudent] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  // Update local state when props change
  useState(() => {
    setStudents(initialStudents);
    setSubjects(initialSubjects);
  });

  const handleAddStudent = async () => {
    if (newStudent.trim()) {
      try {
        await addStudent({ name: newStudent.trim() });
        setNewStudent("");
        onUpdate(); 
        toast({ title: "Elev lagt til", description: `${newStudent.trim()} er lagt til i klasselisten.` });
      } catch (error) {
        toast({ title: "Feil", description: "Kunne ikke legge til elev.", variant: "destructive" });
      }
    }
  };

  const handleAddSubject = async () => {
    if (newSubject.trim()) {
      try {
        await addSubject({ name: newSubject.trim() });
        setNewSubject("");
        onUpdate();
        toast({ title: "Fag lagt til", description: `${newSubject.trim()} er lagt til i faglisten.` });
      } catch (error) {
         toast({ title: "Feil", description: "Kunne ikke legge til fag.", variant: "destructive" });
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const studentName = students.find(s => s.id === id)?.name;
    try {
      await deleteStudent(id);
      onUpdate();
      toast({ title: "Elev slettet", description: `${studentName} er fjernet.`, variant: "destructive" });
    } catch (error) {
       toast({ title: "Feil", description: "Kunne ikke slette elev.", variant: "destructive" });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    const subjectName = subjects.find(s => s.id === id)?.name;
    try {
      await deleteSubject(id);
      onUpdate();
      toast({ title: "Fag slettet", description: `${subjectName} er fjernet.`, variant: "destructive" });
    } catch (error) {
       toast({ title: "Feil", description: "Kunne ikke slette fag.", variant: "destructive" });
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      await seedDatabase();
      toast({
        title: "Database fylt!",
        description: "Demodata er lagt til i databasen.",
      });
      onUpdate();
    } catch (error) {
      console.error("Seeding failed", error);
      toast({
        title: "Feil ved fylling av database",
        description: "Kunne ikke legge til demodata.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {initialStudents.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Start med demodata</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Databasen er tom. Klikk her for å fylle den med eksempel-elever, fag og lekser for å komme i gang.</p>
              <Button onClick={handleSeedDatabase} disabled={isSeeding}>
                <Database className="mr-2" />
                {isSeeding ? "Fyller database..." : "Fyll database med demodata"}
              </Button>
            </CardContent>
          </Card>
        )}
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
    </div>
  );
}
