
'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Loader2, LogOut, Settings as SettingsIcon, GitCommit, Trophy, Store, Presentation } from "lucide-react";
import type { Student, Subject, Homework, Submission, DailyCheck, SeatingChartData, SeatingChartRecord, Remark, TabKey, AppSettings, SeatingLayout } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import AppView from "@/components/AppView";
import Dashboard from "@/components/Dashboard";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import Onboarding from "@/components/Onboarding";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";


const defaultSettings: AppSettings = {
  tabs: {
    overview: true, assessments: true, dailyCheck: true, observations: true, reports: true,
    classroomTools: true,
    settings: true,
  },
  tabOrder: ['overview', 'assessments', 'dailyCheck', 'observations', 'classroomTools', 'reports'],
  dashboardTools: [
    { key: 'overview', visible: true },
    { key: 'assessments', visible: true },
    { key: 'dailyCheck', visible: true },
    { key: 'observations', visible: true },
    { key: 'classroomTools', visible: true },
    { key: 'reports', visible: true },
    { key: 'rewardDashboard', visible: true },
    { key: 'rewardStore', visible: true },
    { key: 'projectorLeaderboard', visible: true },
    { key: 'observations.hourly', visible: false },
    { key: 'observations.remarks', visible: false },
    { key: 'classroomTools.seatingChart', visible: false },
    { key: 'classroomTools.groupTool', visible: false },
    { key: 'classroomTools.studentPicker', visible: false },
    { key: 'reports.summary', visible: false },
    { key: 'reports.studentReports', visible: false },
    { key: 'reports.analysis', visible: false },
  ],
  reportSettings: {
    includeHomework: true, includeIpad: true, includeRemarks: true,
    includePositiveFeedback: false, includeTests: false, greeting: "Hei,", closing: "Vennlig hilsen,", teacherName: "Læreren"
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
  remarkTypes: ["Generell", "Forstyrrer andre", "Mangler utstyr", "Upassende språk", "Gjorde en god innsats"],
  onboardingCompleted: false,
};

function Home() {
  const [activeView, setActiveView] = useState<'dashboard' | 'app'>('dashboard');
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  
  const students = useLiveQuery(() => db.students.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const settings = useLiveQuery(() => db.settings.get('userSettings'));

  const { toast } = useToast();
  
  const currentSettings = settings 
    ? {
        ...defaultSettings,
        ...settings,
        tabs: {
            ...defaultSettings.tabs,
            ...settings.tabs,
            classroomTools: settings.tabs?.classroomTools ?? true,
        },
        dashboardTools: Array.isArray(settings.dashboardTools) ? settings.dashboardTools : defaultSettings.dashboardTools,
      } 
    : defaultSettings;
  
  useEffect(() => {
    if (settings && Array.isArray(settings.dashboardTools)) {
        let wasUpdated = false;
        const updatedTools = [...settings.dashboardTools];
        
        const toolsToCheck = ['classroomTools', 'rewardDashboard', 'rewardStore', 'projectorLeaderboard'];

        toolsToCheck.forEach(toolKey => {
            if (!updatedTools.some(t => t.key === toolKey)) {
                let insertIndex = updatedTools.length;
                if (toolKey === 'classroomTools') {
                    const observationsIndex = updatedTools.findIndex(t => t.key === 'observations');
                    if (observationsIndex !== -1) insertIndex = observationsIndex + 1;
                } else if (toolKey === 'rewardDashboard' || toolKey === 'rewardStore' || toolKey === 'projectorLeaderboard') {
                    const reportsIndex = updatedTools.findIndex(t => t.key === 'reports');
                    if (reportsIndex !== -1) insertIndex = reportsIndex + 1;
                }
                
                updatedTools.splice(insertIndex, 0, { key: toolKey as any, visible: true });
                wasUpdated = true;
            }
        });

        if (wasUpdated) {
            db.settings.update('userSettings', { dashboardTools: updatedTools });
        }
    }
  }, [settings]);


  const handleSettingsChange = async (newSettings: AppSettings) => {
    await db.settings.put({ id: 'userSettings', ...newSettings });
  }
  
  const handleOnboardingComplete = async (finalSettings: AppSettings, teacherName: string, students: Omit<Student, 'id'>[], subjects: Omit<Subject, 'id'>[]) => {
      await db.transaction('rw', db.students, db.subjects, db.settings, async () => {
        await db.students.bulkAdd(students.map(s => ({ name: s.name, points: 0 })));
        await db.subjects.bulkAdd(subjects.map(s => ({ name: s.name })));
        
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

  const navigateToTab = (tab: TabKey, subTab?: string) => {
    setActiveTab(tab);
    setActiveSubTab(subTab || null);
    setActiveView('app');
  };

  const navigateToSettings = () => {
      setActiveTab('settings');
      setActiveView('app');
  }

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
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rewarddashboard" target="_blank">
              <Trophy className="h-4 w-4" />
              <span className="sr-only">Belønningsoversikt</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rewardstore" target="_blank">
              <Store className="h-4 w-4" />
              <span className="sr-only">Belønningsbutikk</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projectorleaderboard" target="_blank">
              <Presentation className="h-4 w-4" />
              <span className="sr-only">Tavle-toppliste</span>
            </Link>
          </Button>
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
                activeSubTab={activeSubTab}
                onTabChange={setActiveTab}
            />
        )}
      </main>
       <footer className="p-4 text-center text-xs text-muted-foreground no-print">
            <Link href="/changelog" className="inline-flex items-center hover:text-primary">
                <GitCommit className="mr-2 h-4 w-4" />
                Hva er nytt? (v1.2.0)
            </Link>
        </footer>
    </div>
  );
}

export default Home;

/*
function HomePageWrapper() {
    const isAuthenticated = useIsAuthenticated();
    const router = useRouter();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        if (!isCheckingAuth && !isAuthenticated) {
            router.push('/login');
        } else {
            setIsCheckingAuth(false);
        }
    }, [isAuthenticated, isCheckingAuth, router]);

    if (isCheckingAuth || !isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            </div>
        );
    }

    return <Home />;
}
*/
