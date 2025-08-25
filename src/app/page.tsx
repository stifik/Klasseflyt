
'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Loader2, LogOut, Settings as SettingsIcon } from "lucide-react";
import type { Student, Subject, Homework, Submission, DailyCheck, SeatingChartData, SeatingChartRecord, Remark, TabKey, AppSettings, SeatingLayout } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import AppView from "@/components/AppView";
import Dashboard from "@/components/Dashboard";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { db, resetDatabase } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import Onboarding from "@/components/Onboarding";


const defaultSettings: AppSettings = {
  tabs: {
    overview: true, dailyCheck: true, remarks: true, reports: true,
    seatingChart: true, groupTool: true, studentPicker: true, remarkAnalysis: true,
    settings: true,
  },
  tabOrder: ['overview', 'dailyCheck', 'remarks', 'reports', 'seatingChart', 'groupTool', 'studentPicker', 'remarkAnalysis'],
  reportSettings: {
    includeHomework: true, includeIpad: true, includeRemarks: true,
    includePositiveFeedback: false, greeting: "Hei,", closing: "Vennlig hilsen,", teacherName: "Læreren"
  },
  schedule: Array.from({ length: 6 }, (_, i) => ({ period: i + 1, startTime: "", endTime: "" })),
  selectedSeatingLayoutId: null,
  remarkTypes: ["Generell", "Forstyrrer andre", "Mangler utstyr", "Upassende språk"],
  onboardingCompleted: false,
};

function Home() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'app'>('dashboard');
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  // Live queries that automatically update when data changes
  const students = useLiveQuery(() => db.students.toArray(), []);
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const homework = useLiveQuery(() => db.homework.toArray(), []);
  const submissions = useLiveQuery(() => db.submissions.toArray(), []);
  const dailyChecks = useLiveQuery(() => db.dailyChecks.toArray(), []);
  const remarks = useLiveQuery(() => db.remarks.toArray(), []);
  const seatingChartHistory = useLiveQuery(() => db.seatingChartHistory.orderBy('createdAt').reverse().toArray(), []);
  const seatingLayouts = useLiveQuery(() => db.seatingLayouts.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('userSettings'), []);
  
  const currentSettings = settings || defaultSettings;
  const seatingChart = useLiveQuery(async () => {
      const latest = await db.seatingChartHistory.orderBy('createdAt').last();
      return latest ? JSON.parse(latest.chartJson) : null;
  }, []);

  useEffect(() => {
    // This effect now only controls the initial loading state.
    // It waits until the students array is no longer undefined.
    if (students !== undefined) {
        setInitialLoading(false);
    }
  }, [students]);


  const handleLogout = async () => {
    try {
        await instance.logoutPopup();
    } catch (error) {
        console.error(error);
        toast({ title: "Utloggingsfeil", description: "Kunne ikke logge ut.", variant: "destructive"});
    }
  };
  
  const navigateToTab = (tab: TabKey) => {
    setActiveTab(tab);
    setActiveView('app');
  };

  const navigateToSettings = () => {
      setActiveTab('settings');
      setActiveView('app');
  }
  
  const handleDataUpdate = async (tableName: string) => {
    // This function can be used to trigger re-renders if needed,
    // but useLiveQuery should handle most cases.
    console.log(`${tableName} was updated.`);
  };

  const handleSeatingChartChange = async (newChart: SeatingChartData | null, source: 'generation' | 'drag' | 'load') => {
    if (newChart) {
        const activeLayout = seatingLayouts?.find(l => l.id === currentSettings.selectedSeatingLayoutId);
        if (activeLayout) {
             await db.seatingChartHistory.add({
                chartJson: JSON.stringify(newChart),
                rows: activeLayout.rows,
                cols: activeLayout.cols,
                createdAt: new Date(),
            });
        }
    }
  };
  
  const handleSettingsChange = async (newSettings: AppSettings) => {
    await db.settings.put({ id: 'userSettings', ...newSettings });
  }

  const handleLayoutsChange = async (layouts: SeatingLayout[]) => {
      // This is a simplified handler. In a real scenario, you'd handle create/update/delete.
      const currentIds = new Set(layouts.map(l => l.id));
      const dbLayouts = await db.seatingLayouts.toArray();
      const toDelete = dbLayouts.filter(dbl => !currentIds.has(dbl.id)).map(l => l.id as string);
      
      if(toDelete.length > 0) await db.seatingLayouts.bulkDelete(toDelete);
      if(layouts.length > 0) await db.seatingLayouts.bulkPut(layouts);
  }
  
  const handleOnboardingComplete = async () => {
    await handleSettingsChange({ ...currentSettings, onboardingCompleted: true });
  }

  if (students === undefined || subjects === undefined || homework === undefined || submissions === undefined || dailyChecks === undefined || remarks === undefined || seatingLayouts === undefined || settings === undefined) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p>Laster database...</p>
      </div>
    );
  }
  
  if (!currentSettings.onboardingCompleted) {
      return <Onboarding onFinish={handleOnboardingComplete} />;
  }

  const componentProps = {
    overview: { students, subjects, homeworkList: homework, submissions, onUpdate: () => handleDataUpdate('homework') },
    dailyCheck: { students, initialChecks: dailyChecks, onUpdate: () => handleDataUpdate('dailyChecks'), seatingChart },
    remarks: { students, initialRemarks: remarks, onUpdate: () => handleDataUpdate('remarks'), seatingChart, settings: currentSettings },
    reports: { students, subjects, homework, submissions, dailyChecks, remarks, settings: currentSettings.reportSettings },
    seatingChart: { students, seatingChart, onSeatingChartChange: handleSeatingChartChange, history: seatingChartHistory || [], appSettings: currentSettings, onAppSettingsChange: handleSettingsChange, layouts: seatingLayouts, onLayoutsChange: handleLayoutsChange },
    groupTool: { students },
    studentPicker: { students, seatingChart, activeLayout: seatingLayouts?.find(l => l.id === currentSettings.selectedSeatingLayoutId) },
    remarkAnalysis: { students, initialRemarks: remarks },
    settings: { initialStudents: students, initialSubjects: subjects, settings: currentSettings, onSettingsChange: handleSettingsChange }
  };

  const appViewProps = {
    settings: currentSettings,
    componentProps,
    initialStudents: students,
    initialSubjects: subjects,
    onSettingsChange: handleSettingsChange,
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background sm:px-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveView('dashboard')} className="flex items-center gap-2">
            <BookOpenCheck className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Klasseflyt</h1>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/*
          isAuthenticated && (
            <>
              <Button variant="outline">Synkronisert</Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut />
                  <span className="sr-only">Logg ut</span>
              </Button>
            </>
          )
          */}
          <Button variant="ghost" size="icon" onClick={navigateToSettings}>
              <SettingsIcon />
              <span className="sr-only">Innstillinger</span>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        {activeView === 'dashboard' && <Dashboard settings={currentSettings} onNavigate={navigateToTab} />}
        {activeView === 'app' && (
            <AppView 
                {...appViewProps}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onUpdate={() => {}}
            />
        )}
      </main>
    </div>
  );
}

export default Home;
