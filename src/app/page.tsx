
'use client'

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import SeatingChart from "@/components/SeatingChart";
import Remarks from "@/components/Remarks";
import GroupTool from "@/components/GroupTool";
import withAuth from '@/components/withAuth';
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Loader2, LogOut } from "lucide-react";
import type { Student, Subject, Homework, Submission, DailyCheck, SeatingChartData, SeatingChartRecord, Remark, TabKey, AppSettings } from "@/lib/types";
import { getStudents, getSubjects, getHomework, getSubmissions, getDailyChecks, getLatestSeatingChart, saveSeatingChart, getSeatingChartHistory, getRemarks } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";


const tabComponents: Record<TabKey, React.FC<any>> = {
  overview: HomeworkOverview,
  dailyCheck: DailyChecklist,
  remarks: Remarks,
  reports: Reports,
  seatingChart: SeatingChart,
  groupTool: GroupTool,
};

const tabLabels: Record<TabKey, string> = {
  overview: "Lekseoversikt",
  dailyCheck: "Daglig Sjekk",
  remarks: "Anmerkninger",
  reports: "Rapporter",
  seatingChart: "Klassekart",
  groupTool: "Gruppeverktøy",
};

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
  const { settings, saveSettings, loading: settingsLoading } = useSettings(userId);

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

  if (initialLoading || settingsLoading) {
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

  const visibleTabs = settings.tabOrder.filter(tabKey => settings.tabs[tabKey]);

  const tabGridCols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-3 md:grid-cols-6',
  };
  
  const numVisibleTabs = visibleTabs.length + 1; // +1 for settings tab
  const gridClass = tabGridCols[numVisibleTabs] || 'sm:grid-cols-3 md:grid-cols-6';

  const componentProps = {
    overview: { userId, students, subjects, homeworkList: homework, submissions, onUpdate: handleDataUpdate },
    dailyCheck: { userId, students, initialChecks: dailyChecks, onUpdate: handleDataUpdate, seatingChart },
    remarks: { userId, students, initialRemarks: remarks, onUpdate: handleDataUpdate, seatingChart },
    reports: { students, subjects, homework, submissions, dailyChecks, remarks, settings: settings.reportSettings },
    seatingChart: { userId, students, seatingChart, onSeatingChartChange: handleSeatingChartChange, settings: seatingChartSettings, onSettingsChange: handleSettingsChange, history: seatingChartHistory },
    groupTool: { students },
  };

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
        <Tabs defaultValue={visibleTabs[0] || 'settings'} className="w-full">
          <TabsList className={`grid w-full mb-4 ${gridClass}`}>
            {visibleTabs.map(tabKey => (
              <TabsTrigger key={tabKey} value={tabKey}>{tabLabels[tabKey]}</TabsTrigger>
            ))}
            <TabsTrigger value="settings">Innstillinger</TabsTrigger>
          </TabsList>

          {visibleTabs.map(tabKey => {
              const Component = tabComponents[tabKey];
              const props = componentProps[tabKey];
              return (
                  <TabsContent key={tabKey} value={tabKey}>
                      <Component {...props} />
                  </TabsContent>
              );
          })}

          <TabsContent value="settings">
            <Settings
              userId={userId}
              initialStudents={students}
              initialSubjects={subjects}
              onUpdate={handleDataUpdate}
              settings={settings}
              onSettingsChange={saveSettings}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default withAuth(Home);
