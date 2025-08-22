
'use client'

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Admin from "@/components/Admin";
import SeatingChart from "@/components/SeatingChart";
import { BookOpenCheck, Loader2 } from "lucide-react";
import type { Student, Subject, Homework, Submission, DailyCheck, SeatingChartData, SeatingChartRecord } from "@/lib/types";
import { getStudents, getSubjects, getHomework, getSubmissions, getDailyChecks, getLatestSeatingChart, saveSeatingChart, getSeatingChartHistory } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dailyChecks, setDailyChecks] = useState<DailyCheck[]>([]);
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

  const loadData = async (isUpdate = false) => {
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
        seatingChartResult,
        historyData
      ] = await Promise.all([
        getStudents(),
        getSubjects(),
        getHomework(),
        getSubmissions(),
        getDailyChecks(),
        getLatestSeatingChart(),
        getSeatingChartHistory()
      ]);

      setStudents(studentsData);
      setSubjects(subjectsData);
      setHomework(homeworkData);
      setSubmissions(submissionsData);
      setDailyChecks(dailyChecksData);
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
  }, []);

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
        await saveSeatingChart(newChart, seatingChartSettings);
        if(source === 'generation') {
           toast({ title: "Klassekart lagret", description: "Et nytt klassekart er generert og lagret i arkivet."});
           // reload history
           getSeatingChartHistory().then(setSeatingChartHistory);
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
      <header className="sticky top-0 z-10 flex items-center h-16 px-4 border-b bg-background sm:px-6">
        <div className="flex items-center gap-2 text-primary-foreground">
          <BookOpenCheck className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-headline">Leksehjelperen</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="overview">Lekseoversikt</TabsTrigger>
            <TabsTrigger value="daily">Daglig Sjekk</TabsTrigger>
            <TabsTrigger value="reports">Rapporter</TabsTrigger>
            <TabsTrigger value="seating-chart">Klassekart</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <HomeworkOverview
              students={students}
              subjects={subjects}
              homeworkList={homework}
              submissions={submissions}
              onUpdate={handleDataUpdate}
            />
          </TabsContent>
          <TabsContent value="daily">
            <DailyChecklist
              students={students}
              initialChecks={dailyChecks}
              onUpdate={handleDataUpdate}
              seatingChart={seatingChart}
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
