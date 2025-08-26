
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
    seatingChart: true, classroomTools: true,
    settings: true,
  },
  tabOrder: ['overview', 'dailyCheck', 'remarks', 'reports', 'seatingChart', 'classroomTools'],
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
  const [activeView, setActiveView] = useState<'dashboard' | 'app'>('dashboard');
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  
  const students = useLiveQuery(() => db.students.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const settings = useLiveQuery(() => db.settings.get('userSettings'));

  const { toast } = useToast();
  const { instance } = useMsal();
  
  const currentSettings = settings || defaultSettings;

  const handleSettingsChange = async (newSettings: AppSettings) => {
    await db.settings.put({ id: 'userSettings', ...newSettings });
  }
  
  const handleOnboardingComplete = async (finalSettings: AppSettings, teacherName: string, students: Omit<Student, 'id'>[], subjects: Omit<Subject, 'id'>[]) => {
      await db.transaction('rw', db.students, db.subjects, db.settings, async () => {
        await db.students.bulkAdd(students.map(s => ({name: s.name})));
        await db.subjects.bulkAdd(subjects.map(s => ({name: s.name})));
        
        const newSettings = {
            ...finalSettings,
            reportSettings: {
                ...finalSettings.reportSettings,
                teacherName,
            },
            onboardingCompleted: true,
        };
        await db.settings.put({ id: 'userSettings', ...newSettings });
      });
  }

  const navigateToTab = (tab: TabKey) => {
    setActiveTab(tab);
    setActiveView('app');
  };

  const navigateToSettings = () => {
      setActiveTab('settings');
      setActiveView('app');
  }

  // A more robust loading check
  const isLoading = students === undefined || subjects === undefined || settings === undefined;

  if (isLoading) {
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
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background sm:px-6 no-print">
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
      <main className="flex-1 p-4 sm:p-6 print:p-0">
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
