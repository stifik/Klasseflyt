
"use client";

import { useState } from "react";
import type { Student, Subject } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Database, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addStudent, deleteStudent, addSubject, deleteSubject, resetAndSeedDatabase } from "@/lib/firestore";
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
} from "@/components/ui/alert-dialog"

interface AdminProps {
  initialStudents: Student[];
  initialSubjects: Subject[];
  onUpdate: () => void;
}

export default function Admin({ initialStudents, initialSubjects, onUpdate }: AdminProps) {
  const [newStudent, setNewStudent] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

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
    const studentName = initialStudents.find(s => s.id === id)?.name;
    try {
      await deleteStudent(id);
      onUpdate();
      toast({ title: "Elev slettet", description: `${studentName} er fjernet.`, variant: "destructive" });
    } catch (error) {
       toast({ title: "Feil", description: "Kunne ikke slette elev.", variant: "destructive" });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    const subjectName = initialSubjects.find(s => s.id === id)?.name;
    try {
      await deleteSubject(id);
      onUpdate();
      toast({ title: "Fag slettet", description: `${subjectName} er fjernet.`, variant: "destructive" });
    } catch (error) {
       toast({ title: "Feil", description: "Kunne ikke slette fag.", variant: "destructive" });
    }
  };

  const handleResetDatabase = async () => {
    setIsSeeding(true);
    try {
      await resetAndSeedDatabase();
      toast({
        title: "Database nullstilt og fylt!",
        description: "Databasen er fylt med fersk demodata.",
      });
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({
        title: "Feil ved nullstilling",
        description: "Kunne ikke nullstille databasen. Sjekk konsollen for feil.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };


  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Demodata</CardTitle>
        </CardHeader>
        <CardContent>
           <p className="mb-4 text-sm text-muted-foreground">
            {initialStudents.length === 0 
              ? "Databasen din er tom. Klikk her for å fylle den med demodata for å komme i gang."
              : "Dette vil slette all nåværende data og fylle databasen med et nytt sett med demodata."
            }
           </p>
           <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant={initialStudents.length > 0 ? "destructive" : "default"} disabled={isSeeding}>
                  <Database className="mr-2" />
                  {isSeeding ? 'Jobber...' : (initialStudents.length === 0 ? 'Fyll database med demodata' : 'Nullstill og fyll database')}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle><AlertTriangle className="inline-block mr-2 text-yellow-500" />Er du helt sikker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dette vil permanent slette all data i databasen, inkludert alle elever, fag, lekser og innleveringer. Handlingen kan ikke angres.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetDatabase}>Ja, slett alt og start på nytt</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

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
              {initialStudents.map((student) => (
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
              {initialSubjects.map((subject) => (
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
