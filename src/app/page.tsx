
'use client'

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Admin from "@/components/Admin";
import SeatingChart from "@/components/SeatingChart";
import Remarks from "@/components/Remarks";
import StudentLookup from "@/components/StudentLookup";
import withAuth from '@/components/withAuth';
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Loader2, LogOut } from "lucide-react";
import type { Student, Subject, Homework, Submission, DailyCheck, SeatingChartData, SeatingChartRecord, Remark } from "@/lib/types";
import { getStudents, getSubjects, getHomework, getSubmissions, getDailyChecks, getLatestSeatingChart, saveSeatingChart, getSeatingChartHistory, getRemarks } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";


function Home({ userId }: { userId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dailyChecks, setDailyChecks] = useState<DailyCheck[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [seatingChart, setSeatingChart] = useState<SeatingChartData | null>(null);
  const [seatingChartHistory, setSeatingChartHistory] = useState<SeatingChartRecord[]>([]);
  const [seatingChartSettings, setSeatingChartSettings] = useState({
    rows: 4,
    cols: 5,
    groupSize: 2,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth();

  const loadData = async (isUpdate = false) => {
    if (!userId) return;
    if (isUpdate) {
      setIsUpdating(true);
    } else {
      setInitialLoading(true);
    }

    try {
      const [
        studentsData, 
        subjectsData, 
        homeworkData, 
        submissionsData, 
        dailyChecksData,
        remarksData,
        seatingChartResult,
        historyData
      ] = await Promise.all([
        getStudents(userId),
        getSubjects(userId),
        getHomework(userId),
        getSubmissions(userId),
        getDailyChecks(userId),
        getRemarks(userId),
        getLatestSeatingChart(userId),
        getSeatingChartHistory(userId)
      ]);

      setStudents(studentsData);
      setSubjects(subjectsData);
      setHomework(homeworkData);
      setSubmissions(submissionsData);
      setDailyChecks(dailyChecksData);
      setRemarks(remarksData);
      setSeatingChartHistory(historyData);
      
      if (seatingChartResult) {
        setSeatingChart(seatingChartResult.chart);
        setSeatingChartSettings(seatingChartResult.settings);
      }

    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: "Kunne ikke laste data fra databasen.", variant: "destructive" });
    } finally {
      if (isUpdate) {
        setIsUpdating(false);
      } else {
        setInitialLoading(false);
      }
    }
  }

  useEffect(() => {
    loadData(false);
  }, [userId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: "Feil", description: "Kunne ikke logge ut.", variant: "destructive" });
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p>Laster data fra databasen...</p>
      </div>
    );
  }

  const handleDataUpdate = () => loadData(true);

  const handleSeatingChartChange = async (newChart: SeatingChartData | null, source: 'generation' | 'drag' | 'load') => {
    setSeatingChart(newChart);
    if (newChart && (source === 'generation' || source === 'drag')) {
      try {
        await saveSeatingChart(userId, newChart, seatingChartSettings);
        if(source === 'generation') {
           toast({ title: "Klassekart lagret", description: "Et nytt klassekart er generert og lagret i arkivet."});
           // reload history
           getSeatingChartHistory(userId).then(setSeatingChartHistory);
        }
      } catch (error) {
        console.error("Failed to save seating chart:", error);
        toast({ title: "Feil", description: "Kunne ikke lagre klassekartet.", variant: "destructive" });
        // Optional: revert optimistic update if saving fails
        loadData(true); 
      }
    }
  };
  
  const handleSettingsChange = async (newSettings: {rows: number; cols: number; groupSize: number}) => {
    setSeatingChartSettings(newSettings);
     // Settings are only saved when a chart is saved.
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background sm:px-6">
        <div className="flex items-center gap-2 text-primary-foreground">
          <BookOpenCheck className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-headline">Leksehjelperen</h1>
        </div>
        <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2" /> Logg ut
        </Button>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:grid-cols-4 md:grid-cols-7">
            <TabsTrigger value="overview">Lekseoversikt</TabsTrigger>
            <TabsTrigger value="daily">Daglig Sjekk</TabsTrigger>
            <TabsTrigger value="remarks">Anmerkninger</TabsTrigger>
            <TabsTrigger value="student-lookup">Elevsøk</TabsTrigger>
            <TabsTrigger value="reports">Rapporter</TabsTrigger>
            <TabsTrigger value="seating-chart">Klassekart</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <HomeworkOverview
              userId={userId}
              students={students}
              subjects={subjects}
              homeworkList={homework}
              submissions={submissions}
              onUpdate={handleDataUpdate}
            />
          </TabsContent>
          <TabsContent value="daily">
            <DailyChecklist
              userId={userId}
              students={students}
              initialChecks={dailyChecks}
              onUpdate={handleDataUpdate}
              seatingChart={seatingChart}
            />
          </TabsContent>
           <TabsContent value="remarks">
            <Remarks
              userId={userId}
              students={students}
              initialRemarks={remarks}
              onUpdate={handleDataUpdate}
              seatingChart={seatingChart}
            />
          </TabsContent>
          <TabsContent value="student-lookup">
            <StudentLookup
              students={students}
              subjects={subjects}
              homework={homework}
              submissions={submissions}
              dailyChecks={dailyChecks}
              remarks={remarks}
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
           <TabsContent value="seating-chart">
            <SeatingChart
              userId={userId}
              students={students}
              seatingChart={seatingChart}
              onSeatingChartChange={handleSeatingChartChange}
              settings={seatingChartSettings}
              onSettingsChange={handleSettingsChange}
              history={seatingChartHistory}
            />
          </TabsContent>
          <TabsContent value="admin">
            <Admin
              userId={userId}
              initialStudents={students}
              initialSubjects={subjects}
              onUpdate={handleDataUpdate}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default withAuth(Home);
