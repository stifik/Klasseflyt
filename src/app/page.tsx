
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
import { db } from "@/lib/db";
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
  schedule: [
    { period: 1, startTime: "08:30", endTime: "09:00" },
    { period: 2, startTime: "09:00", endTime: "10:00" },
    { period: 3, startTime: "10:30", endTime: "11:00" },
    { period: 4, startTime: "11:00", endTime: "12:00" },
    { period: 5, startTime: "12:30", endTime: "13:30" },
    { period: 6, startTime: "13:30", endTime: "14:00" },
  ],
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

  // Load essential data first
  const students = useLiveQuery(() => db.students.toArray(), []);
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('userSettings'), []);
  
  const currentSettings = settings || defaultSettings;
  
  useEffect(() => {
    // Wait for all essential queries to be resolved (not undefined) before hiding the loader.
    if (settings !== undefined && students !== undefined && subjects !== undefined) {
      setInitialLoading(false);
    }
  }, [settings, students, subjects]);


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
  
  const handleSettingsChange = async (newSettings: AppSettings) => {
    await db.settings.put({ id: 'userSettings', ...newSettings });
  }
  
  const handleOnboardingComplete = async (finalSettings: AppSettings) => {
    await handleSettingsChange(finalSettings);
  }

  if (initialLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p>Laster database...</p>
      </div>
    );
  }
  
  if (!currentSettings.onboardingCompleted) {
      return <Onboarding onFinish={handleOnboardingComplete} initialSettings={currentSettings} />;
  }

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
                settings={currentSettings}
                students={students || []}
                subjects={subjects || []}
                onSettingsChange={handleSettingsChange}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        )}
      </main>
    </div>
  );
}

export default Home;
