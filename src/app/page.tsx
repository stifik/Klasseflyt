
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


function Home() {
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
  const [initialLoading, setInitialLoading] = useState(false); // Changed to false, will be local-first
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'app' | 'settings'>('dashboard');
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [settings, setSettings] = useState<AppSettings>(mockSettings);
  
  const activeLayout = seatingLayouts.find(l => l.id === settings.selectedSeatingLayoutId);

  // This function will be rewritten to use the new local DB + optional OneDrive sync
  const loadData = async (isUpdate = false) => {
    console.log("Data loading will be re-implemented for local-first architecture.");
  }

  useEffect(() => {
    // Initial data load will be handled differently
  }, []);

  const handleLogout = async () => {
    try {
        await instance.logoutPopup();
        // Stay on the page, don't redirect to login
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
    overview: { students, subjects, homeworkList: homework, submissions, onUpdate: handleDataUpdate },
    dailyCheck: { students, initialChecks: dailyChecks, onUpdate: handleDataUpdate, seatingChart },
    remarks: { students, initialRemarks: remarks, onUpdate: handleDataUpdate, seatingChart, settings: settings },
    reports: { students, subjects, homework, submissions, dailyChecks, remarks, settings: settings.reportSettings },
    seatingChart: { students, seatingChart, onSeatingChartChange: handleSeatingChartChange, settings: seatingChartSettings, onSettingsChange: handleSimpleSettingsChange, history: seatingChartHistory, appSettings: settings, onAppSettingsChange: setSettings, layouts: seatingLayouts, onLayoutsChange: setSeatingLayouts },
    groupTool: { students },
    studentPicker: { students, seatingChart, activeLayout },
    remarkAnalysis: { students, initialRemarks: remarks },
  };

  const appViewProps = {
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
          {isAuthenticated ? (
            <>
              <Button variant="outline">Synkronisert</Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut />
                  <span className="sr-only">Logg ut</span>
              </Button>
            </>
          ) : (
            <Button onClick={() => router.push('/login')}>Logg inn for å synkronisere</Button>
          )}
          <Button variant="ghost" size="icon" onClick={navigateToSettings}>
              <SettingsIcon />
              <span className="sr-only">Innstillinger</span>
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

export default Home;
