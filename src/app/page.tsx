
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


// Mock data while building the new data layer
const mockStudents: Student[] = [{id: '1', name: 'Ola Nordmann'}, {id: '2', name: 'Kari Normann'}];
const mockSubjects: Subject[] = [{id: '1', name: 'Norsk'}, {id: '2', name: 'Matte'}];
const mockSettings: AppSettings = {
  tabs: {
    overview: true, dailyCheck: true, remarks: true, reports: true,
    seatingChart: true, groupTool: true, studentPicker: true, remarkAnalysis: true,
  },
  tabOrder: ['overview', 'dailyCheck', 'remarks', 'reports', 'seatingChart', 'groupTool', 'studentPicker', 'remarkAnalysis'],
  reportSettings: {
    includeHomework: true, includeIpad: true, includeRemarks: true,
    includePositiveFeedback: false, greeting: "Hei,", closing: "Vennlig hilsen,", teacherName: "Læreren"
  },
  schedule: Array.from({ length: 6 }, (_, i) => ({ period: i + 1, startTime: "", endTime: "" })),
  selectedSeatingLayoutId: null,
  remarkTypes: ["Generell", "Forstyrrer andre", "Mangler utstyr", "Upassende språk"],
};


// The Home component will be re-integrated with the new data layer.
// For now, it will render with mock data to avoid breaking the UI.
function Home({ userId }: { userId: string }) {
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dailyChecks, setDailyChecks] = useState<DailyCheck[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [seatingChart, setSeatingChart] = useState<SeatingChartData | null>(null);
  const [seatingChartHistory, setSeatingChartHistory] = useState<SeatingChartRecord[]>([]);
  const [seatingLayouts, setSeatingLayouts] = useState<SeatingLayout[]>([]);
  const [seatingChartSettings, setSeatingChartSettings] = useState({ rows: 4, cols: 5 });
  const [initialLoading, setInitialLoading] = useState(false); // Changed to false
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'app' | 'settings'>('dashboard');
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const { instance } = useMsal();
  const [settings, setSettings] = useState<AppSettings>(mockSettings);
  
  const activeLayout = seatingLayouts.find(l => l.id === settings.selectedSeatingLayoutId);

  const loadData = async (isUpdate = false) => {
    // This function will be rewritten to use the new local DB + OneDrive sync
    console.log("Data loading will be re-implemented.");
  }

  useEffect(() => {
    // Initial data load will be handled differently
  }, [userId]);

  const handleLogout = async () => {
    try {
        await instance.logoutPopup();
        router.push('/login');
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
      setActiveView('settings');
  }

  if (initialLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p>Laster data...</p>
      </div>
    );
  }

  const handleDataUpdate = () => console.log("Data update triggered");

  const handleSeatingChartChange = async (newChart: SeatingChartData | null, source: 'generation' | 'drag' | 'load') => {
    setSeatingChart(newChart);
  };
  
  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
  }
  
  const handleSimpleSettingsChange = (newSettings: {rows: number; cols: number}) => {
    setSeatingChartSettings(newSettings);
  }

  const componentProps = {
    overview: { userId, students, subjects, homeworkList: homework, submissions, onUpdate: handleDataUpdate },
    dailyCheck: { userId, students, initialChecks: dailyChecks, onUpdate: handleDataUpdate, seatingChart },
    remarks: { userId, students, initialRemarks: remarks, onUpdate: handleDataUpdate, seatingChart, settings: settings },
    reports: { students, subjects, homework, submissions, dailyChecks, remarks, settings: settings.reportSettings },
    seatingChart: { userId, students, seatingChart, onSeatingChartChange: handleSeatingChartChange, settings: seatingChartSettings, onSettingsChange: handleSimpleSettingsChange, history: seatingChartHistory, appSettings: settings, onAppSettingsChange: setSettings, layouts: seatingLayouts, onLayoutsChange: setSeatingLayouts },
    groupTool: { students },
    studentPicker: { students, seatingChart, activeLayout },
    remarkAnalysis: { students, initialRemarks: remarks },
  };

  const appViewProps = {
    userId,
    settings,
    componentProps,
    initialStudents: students,
    initialSubjects: subjects,
    onUpdate: handleDataUpdate,
    onSettingsChange: handleSettingsChange,
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background sm:px-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveView('dashboard')} className="flex items-center gap-2">
            <BookOpenCheck className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Leksehjelperen</h1>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={navigateToSettings}>
              <SettingsIcon />
              <span className="sr-only">Innstillinger</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut />
              <span className="sr-only">Logg ut</span>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        {activeView === 'dashboard' && <Dashboard settings={settings} onNavigate={navigateToTab} />}
        {activeView === 'app' && (
            <AppView 
                {...appViewProps}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        )}
         {activeView === 'settings' && (
            <AppView 
                {...appViewProps}
                activeTab={null}
                forceSettingsView={true}
            />
        )}
      </main>
    </div>
  );
}

const AuthenticatedPage = () => {
    const isAuthenticated = useIsAuthenticated();
    const { accounts } = useMsal();
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        } else if (accounts.length > 0) {
            setUserId(accounts[0].homeAccountId);
            setIsCheckingAuth(false);
        } else if (isAuthenticated && accounts.length === 0) {
           // Still waiting for accounts to populate after auth
           // You can add a small delay or a more robust check here if needed
        } else {
            router.push('/login');
        }
    }, [isAuthenticated, router, accounts]);

    if (isCheckingAuth || !userId) {
        return (
            <div className="flex flex-col min-h-screen bg-background items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p>Laster...</p>
            </div>
        );
    }

    return <Home userId={userId} />;
}


export default AuthenticatedPage;
