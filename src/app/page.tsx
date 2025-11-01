
'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Loader2, LogOut, Settings as SettingsIcon, GitCommit, Trophy, Store, Activity, Terminal } from "lucide-react";
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
    { key: 'innsjekking', visible: true },
    { key: 'morning-display', visible: true },
    { key: 'observations', visible: true },
    { key: 'classroomTools', visible: true },
    { key: 'reports', visible: true },
    { key: 'observations.hourly', visible: false },
    { key: 'observations.remarks', visible: false },
    { key: 'classroomTools.seatingChart', visible: false },
    { key: 'classroomTools.groupTool', visible: false },
    { key: 'classroomTools.studentPicker', visible: false },
    { key: 'reports.summary', visible: false },
    { key: 'reports.studentReports', visible: false },
    { key: 'reports.analysis', visible: false },
  ],
  nfcEnabled: false, // NFC disabled by default for new users
  reportSettings: {
    includeHomework: true, includeIpad: true, includeRemarks: true,
    includePositiveFeedback: false, includeTests: false, greeting: "Hei,", closing: "Vennlig hilsen,", teacherName: "Læreren",
    includeSecretAgent: false, secretAgentMessage: "Fullførte rollen som hemmelig agent"
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
        let updatedTools = [...settings.dashboardTools];
        
        // Add innsjekking if missing
        if (!updatedTools.some(t => t.key === 'innsjekking')) {
            const dailyCheckIndex = updatedTools.findIndex(t => t.key === 'dailyCheck');
            const insertIndex = dailyCheckIndex !== -1 ? dailyCheckIndex + 1 : updatedTools.length;
            updatedTools.splice(insertIndex, 0, { key: 'innsjekking', visible: true });
            wasUpdated = true;
        }

        // Remove obsolete keys (terminal, poengsentral)
        const obsoleteKeys = ['terminal', 'poengsentral'];
        const initialLength = updatedTools.length;
        updatedTools = updatedTools.filter(t => !obsoleteKeys.includes(t.key as any));
        if (updatedTools.length !== initialLength) {
            wasUpdated = true;
        }

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

  return <Dashboard settings={currentSettings} />;
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
