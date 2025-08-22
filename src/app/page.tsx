
'use client'

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Admin from "@/components/Admin";
import { BookOpenCheck, Loader2 } from "lucide-react";
import type { Student, Subject, Homework, Submission, DailyCheck } from "@/lib/types";
import { getStudents, getSubjects, getHomework, getSubmissions, getDailyChecks } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { students as mockStudents, subjects as mockSubjects, homework as mockHomework, submissions as mockSubmissions, dailyChecks as mockDailyChecks } from "@/lib/mock-data";

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dailyChecks, setDailyChecks] = useState<DailyCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      let [studentsData, subjectsData, homeworkData, submissionsData, dailyChecksData] = await Promise.all([
        getStudents(),
        getSubjects(),
        getHomework(),
        getSubmissions(),
        getDailyChecks()
      ]);

      // If there are no students, assume the database is empty and use mock data
      if (studentsData.length === 0) {
        toast({ title: "Bruker demodata", description: "Databasen er tom, viser innebygd demodata." });
        setStudents(mockStudents);
        setSubjects(mockSubjects);
        setHomework(mockHomework);
        setSubmissions(mockSubmissions);
        setDailyChecks(mockDailyChecks);
      } else {
        setStudents(studentsData);
        setSubjects(subjectsData);
        setHomework(homeworkData);
        setSubmissions(submissionsData);
        setDailyChecks(dailyChecksData);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: "Kunne ikke laste data. Viser demodata.", variant: "destructive" });
      // Fallback to mock data on error
      setStudents(mockStudents);
      setSubjects(mockSubjects);
      setHomework(mockHomework);
      setSubmissions(mockSubmissions);
      setDailyChecks(mockDailyChecks);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [toast]);
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p>Laster data fra databasen...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center h-16 px-4 border-b bg-background sm:px-6">
        <div className="flex items-center gap-2 text-primary-foreground">
          <BookOpenCheck className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-headline">Leksehjelperen</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:w-auto sm:inline-flex">
            <TabsTrigger value="overview">Lekseoversikt</TabsTrigger>
            <TabsTrigger value="daily">Daglig Sjekk</TabsTrigger>
            <TabsTrigger value="reports">Rapporter</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <HomeworkOverview
              students={students}
              subjects={subjects}
              homeworkList={homework}
              submissions={submissions}
              onUpdate={loadData}
            />
          </TabsContent>
          <TabsContent value="daily">
            <DailyChecklist
              students={students}
              initialChecks={dailyChecks}
            />
          </TabsContent>
          <TabsContent value="reports">
             <Reports
                students={students}
                subjects={subjects}
                homework={homework}
                submissions={submissions}
                dailyChecks={dailyChecks}
             />
          </TabsContent>
          <TabsContent value="admin">
            <Admin
              initialStudents={students}
              initialSubjects={subjects}
              onUpdate={loadData}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
