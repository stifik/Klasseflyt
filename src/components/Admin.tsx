"use client";

import type { Student, Subject } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useState } from "react";

interface AdminProps {
  initialStudents: Student[];
  initialSubjects: Subject[];
}

export default function Admin({ initialStudents, initialSubjects }: AdminProps) {
  const [students, setStudents] = useLocalStorage<Student[]>("students", initialStudents);
  const [subjects, setSubjects] = useLocalStorage<Subject[]>("subjects", initialSubjects);
  const [newStudent, setNewStudent] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const { toast } = useToast();

  const handleAddStudent = () => {
    if (newStudent.trim()) {
      const student = { id: `s${students.length + 1}`, name: newStudent.trim() };
      setStudents([...students, student]);
      setNewStudent("");
      toast({ title: "Elev lagt til", description: `${student.name} er lagt til i klasselisten.` });
    }
  };

  const handleAddSubject = () => {
    if (newSubject.trim()) {
      const subject = { id: `sub${subjects.length + 1}`, name: newSubject.trim() };
      setSubjects([...subjects, subject]);
      setNewSubject("");
       toast({ title: "Fag lagt til", description: `${subject.name} er lagt til i faglisten.` });
    }
  };

  const handleDeleteStudent = (id: string) => {
    const studentName = students.find(s => s.id === id)?.name;
    setStudents(students.filter((s) => s.id !== id));
    toast({ title: "Elev slettet", description: `${studentName} er fjernet.`, variant: "destructive" });
  };

  const handleDeleteSubject = (id: string) => {
     const subjectName = subjects.find(s => s.id === id)?.name;
    setSubjects(subjects.filter((s) => s.id !== id));
    toast({ title: "Fag slettet", description: `${subjectName} er fjernet.`, variant: "destructive" });
  };

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
