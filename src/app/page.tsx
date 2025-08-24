
'use client'

import { useState, useEffect } from "react";
import withAuth from '@/components/withAuth';
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Loader2, LogOut, Settings as SettingsIcon } from "lucide-react";
import type { Student, Subject, Homework, Submission, DailyCheck, SeatingChartData, SeatingChartRecord, Remark, TabKey, AppSettings, SeatingLayout } from "@/lib/types";
import { getStudents, getSubjects, getHomework, getSubmissions, getDailyChecks, getLatestSeatingChart, saveSeatingChart, getSeatingChartHistory, getRemarks, getSeatingLayouts } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";
import AppView from "@/components/AppView";
import Dashboard from "@/components/Dashboard";

function Home({ userId }: { userId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dailyChecks, setDailyChecks] = useState<DailyCheck[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [seatingChart, setSeatingChart] = useState<SeatingChartData | null>(null);
  const [seatingChartHistory, setSeatingChartHistory] = useState<SeatingChartRecord[]>([]);
  const [seatingLayouts, setSeatingLayouts] = useState<SeatingLayout[]>([]);
  const [seatingChartSettings, setSeatingChartSettings] = useState({
    rows: 4,
    cols: 5,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'app' | 'settings'>('dashboard');
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth();
  const { settings, saveSettings, loading: settingsLoading } = useSettings(userId);
  
  const activeLayout = seatingLayouts.find(l => l.id === settings.selectedSeatingLayoutId);

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
        historyData,
        layoutsData
      ] = await Promise.all([
        getStudents(userId),
        getSubjects(userId),
        getHomework(userId),
        getSubmissions(userId),
        getDailyChecks(userId),
        getRemarks(userId),
        getLatestSeatingChart(userId),
        getSeatingChartHistory(userId),
        getSeatingLayouts(userId)
      ]);

      setStudents(studentsData);
      setSubjects(subjectsData);
      setHomework(homeworkData);
      setSubmissions(submissionsData);
      setDailyChecks(dailyChecksData);
      setRemarks(remarksData);
      setSeatingChartHistory(historyData);
      setSeatingLayouts(layoutsData);
      
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
  
  const navigateToTab = (tab: TabKey) => {
    setActiveTab(tab);
    setActiveView('app');
  };

  const navigateToSettings = () => {
      setActiveView('settings');
  }

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
        const layoutId = settings.selectedSeatingLayoutId;
        const activeLayout = seatingLayouts.find(l => l.id === layoutId);
        if (!activeLayout) {
          toast({ title: "Feil", description: "Ingen layout er valgt.", variant: "destructive" });
          return;
        }
        await saveSeatingChart(userId, newChart, {rows: activeLayout.rows, cols: activeLayout.cols});
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
  
  const handleSettingsChange = async (newSettings: {rows: number; cols: number}) => {
    setSeatingChartSettings(newSettings);
     // Settings are only saved when a chart is saved.
  }

  const componentProps = {
    overview: { userId, students, subjects, homeworkList: homework, submissions, onUpdate: handleDataUpdate },
    dailyCheck: { userId, students, initialChecks: dailyChecks, onUpdate: handleDataUpdate, seatingChart },
    remarks: { userId, students, initialRemarks: remarks, onUpdate: handleDataUpdate, seatingChart, settings: settings },
    reports: { students, subjects, homework, submissions, dailyChecks, remarks, settings: settings.reportSettings },
    seatingChart: { userId, students, seatingChart, onSeatingChartChange: handleSeatingChartChange, settings: seatingChartSettings, onSettingsChange: handleSettingsChange, history: seatingChartHistory, appSettings: settings, onAppSettingsChange: saveSettings, layouts: seatingLayouts, onLayoutsChange: setSeatingLayouts },
    groupTool: { students },
    studentPicker: { students, seatingChart, activeLayout },
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background sm:px-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveView('dashboard')} className="flex items-center gap-2 text-primary-foreground">
            <BookOpenCheck className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground font-headline">Leksehjelperen</h1>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={navigateToSettings}>
              <SettingsIcon className="mr-2" /> Innstillinger
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2" /> Logg ut
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        {activeView === 'dashboard' && <Dashboard settings={settings} onNavigate={navigateToTab} />}
        {activeView === 'app' && (
            <AppView 
                settings={settings}
                activeTab={activeTab}
                componentProps={componentProps}
                onTabChange={setActiveTab}
            />
        )}
         {activeView === 'settings' && (
            <AppView 
                settings={settings}
                activeTab={null} // or a specific string like 'settings'
                componentProps={componentProps}
                forceSettingsView={true}
                 initialStudents={students}
                initialSubjects={subjects}
                onUpdate={handleDataUpdate}
                onSettingsChange={saveSettings}
                userId={userId}
            />
        )}
      </main>
    </div>
  );
}

export default withAuth(Home);
