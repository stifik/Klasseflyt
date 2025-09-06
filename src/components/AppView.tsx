

'use client';

import { FC, useState, useEffect, Suspense, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import ClassroomTools from "@/components/ClassroomTools";
import Observations from "@/components/Observations";
import Assessments from "@/components/Assessments";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { AppSettings, SeatingLayout, Student, Subject, TabKey } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from './ui/tooltip';


const tabComponents: Partial<Record<TabKey, FC<any>>> = {
  overview: HomeworkOverview,
  dailyCheck: DailyChecklist,
  observations: Observations,
  assessments: Assessments,
  reports: Reports,
  classroomTools: ClassroomTools,
  settings: Settings,
};

const tabLabels: Partial<Record<TabKey, string>> = {
  overview: "Lekseoversikt",
  dailyCheck: "Daglig Sjekk",
  observations: "Observasjoner",
  assessments: "Vurderinger",
  reports: "Analyse",
  classroomTools: "Klasseverktøy",
  settings: "Innstillinger",
};

const TabContentLoader = () => (
    <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
    </div>
);

// This new component will handle fetching data for a specific, active tab
const ActiveTabContent: FC<{ tabKey: TabKey; componentProps: Record<string, any> }> = ({ tabKey, componentProps }) => {
    const Component = tabComponents[tabKey];
    if (!Component) return null;

    const props = { ...componentProps[tabKey], appSettings: componentProps.appSettings };

    // Use live queries for data needed by specific tabs
    const homework = useLiveQuery(() => ['overview', 'reports'].includes(tabKey) ? db.homework.toArray() : undefined, [tabKey]);
    const submissions = useLiveQuery(() => ['overview', 'reports'].includes(tabKey) ? db.submissions.toArray() : undefined, [tabKey]);
    const dailyChecks = useLiveQuery(() => ['dailyCheck', 'reports'].includes(tabKey) ? db.dailyChecks.toArray() : undefined, [tabKey]);
    const hourlyChecks = useLiveQuery(() => ['observations', 'reports'].includes(tabKey) ? db.hourlyChecks.toArray() : undefined, [tabKey]);
    const remarks = useLiveQuery(() => ['observations', 'reports'].includes(tabKey) ? db.remarks.toArray() : undefined, [tabKey]);
    const tests = useLiveQuery(() => ['assessments', 'reports'].includes(tabKey) ? db.tests.toArray() : undefined, [tabKey]);
    const testResults = useLiveQuery(() => ['assessments', 'reports'].includes(tabKey) ? db.testResults.toArray() : undefined, [tabKey]);
    const learningGoals = useLiveQuery(() => ['assessments', 'reports'].includes(tabKey) ? db.learningGoals.toArray() : undefined, [tabKey]);
    const goalAchievements = useLiveQuery(() => ['assessments', 'reports'].includes(tabKey) ? db.goalAchievements.toArray() : undefined, [tabKey]);
    
    // Data specific to ClassroomTools
    const history = useLiveQuery(() => tabKey === 'classroomTools' ? db.seatingChartHistory.orderBy('createdAt').reverse().toArray() : undefined, [tabKey]);
    const layouts = useLiveQuery(() => tabKey === 'classroomTools' ? db.seatingLayouts.toArray() : undefined, [tabKey]);
    const stationAssignmentLogs = useLiveQuery(() => tabKey === 'classroomTools' ? db.stationAssignmentLogs.orderBy('date').reverse().toArray() : undefined, [tabKey]);
    const groupSets = useLiveQuery(() => tabKey === 'classroomTools' ? db.groupSets.orderBy('createdAt').reverse().toArray() : undefined, [tabKey]);
    
    const activeLayoutId = tabKey === 'classroomTools' ? props.appSettings?.selectedSeatingLayoutId : null;
    const activeLayout = useLiveQuery(async () => {
        if (activeLayoutId) {
            return db.seatingLayouts.get(activeLayoutId);
        }
        return null;
    }, [activeLayoutId]);


    // Seating chart is used by multiple tabs, so we fetch it conditionally
    const seatingChart = useLiveQuery(async () => {
        if (['dailyCheck', 'observations', 'classroomTools'].includes(tabKey)) {
            const latest = await db.seatingChartHistory.orderBy('createdAt').last();
            return latest ? JSON.parse(latest.chartJson) : null;
        }
        return undefined;
    }, [tabKey]);

    // Define which data is required for each tab to be considered "ready"
    const requiredData: Record<TabKey, any[]> = {
        overview: [homework, submissions],
        dailyCheck: [], // Seating chart can be null initially
        observations: [hourlyChecks, remarks], // Seating chart can be null initially
        assessments: [tests, testResults, learningGoals, goalAchievements],
        reports: [homework, submissions, dailyChecks, remarks, hourlyChecks, tests, testResults, learningGoals, goalAchievements],
        classroomTools: [layouts, stationAssignmentLogs, groupSets], // History and activeLayout can be null/empty initially
        settings: [],
    };
    
    // Combine base props with fetched data
    const combinedProps = {
        ...props,
        homework: homework, 
        submissions: submissions,
        dailyChecks: dailyChecks,
        initialHourlyChecks: hourlyChecks,
        hourlyChecks: hourlyChecks, // Pass hourlyChecks also for reports
        initialRemarks: remarks,
        remarks: remarks, // Pass remarks also for reports
        seatingChart: seatingChart,
        tests,
        testResults,
        learningGoals,
        goalAchievements,
        history: history || [],
        layouts: layouts || [],
        activeLayout,
        stationAssignmentLogs,
        groupSets,
    };

    const isDataReady = requiredData[tabKey].every(data => data !== undefined);

    if (!isDataReady) {
        return <TabContentLoader />;
    }
    
    return <Component {...combinedProps} />;
};


interface AppViewProps {
    settings: AppSettings;
    activeTab: TabKey | null;
    activeSubTab?: string | null;
    students: Student[];
    subjects: Subject[];
    onSettingsChange: (newSettings: AppSettings) => void;
    onTabChange?: (tab: TabKey | null) => void;
}

const AppViewContent: FC<AppViewProps> = ({ 
    settings, 
    activeTab, 
    activeSubTab,
    students,
    subjects,
    onSettingsChange,
    onTabChange, 
}) => {
  const [internalActiveSubTab, setInternalActiveSubTab] = useState<string | null>(null);

  useEffect(() => {
    setInternalActiveSubTab(activeSubTab || null);
  }, [activeSubTab, activeTab]);
  
  const visibleTabs = useMemo(() => {
    const tabOrder = settings.tabOrder || [];
    // Ensure classroomTools is in the tabOrder if it's missing for older settings
    if (!tabOrder.includes('classroomTools')) {
        const observationsIndex = tabOrder.indexOf('observations');
        if (observationsIndex !== -1) {
            tabOrder.splice(observationsIndex + 1, 0, 'classroomTools');
        } else {
            tabOrder.push('classroomTools');
        }
    }
    return tabOrder.filter(tabKey => settings.tabs[tabKey] && tabLabels[tabKey]);
  }, [settings.tabOrder, settings.tabs]);

  const defaultTab = activeTab || visibleTabs[0];

  const handleSeatingChartChange = async (newChart: SeatingLayout | null, source: 'generation' | 'drag' | 'load') => {
    if (newChart) {
        const layouts = await db.seatingLayouts.toArray();
        const activeLayout = layouts?.find(l => l.id === settings.selectedSeatingLayoutId);
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

  const handleLayoutsChange = async (newLayouts: SeatingLayout[]) => {
      const currentIds = new Set(newLayouts.map(l => l.id));
      const dbLayouts = await db.seatingLayouts.toArray();
      const toDelete = dbLayouts.filter(dbl => !currentIds.has(dbl.id)).map(l => l.id as string);
      
      if(toDelete.length > 0) await db.seatingLayouts.bulkDelete(toDelete);
      if(newLayouts.length > 0) await db.seatingLayouts.bulkPut(newLayouts);
  }

  const baseComponentProps: Record<string, any> = {
    overview: { students, subjects, onUpdate: () => {} },
    dailyCheck: { students },
    observations: { students, onUpdate: () => {}, settings, activeSubTab: internalActiveSubTab, onSubTabChange: setInternalActiveSubTab },
    assessments: { students, subjects, activeSubTab: internalActiveSubTab, onSubTabChange: setInternalActiveSubTab },
    reports: { students, subjects, settings, activeSubTab: internalActiveSubTab, onSubTabChange: setInternalActiveSubTab },
    classroomTools: { students, onSeatingChartChange: handleSeatingChartChange, appSettings: settings, onAppSettingsChange: onSettingsChange, onLayoutsChange: handleLayoutsChange, activeSubTab: internalActiveSubTab, onSubTabChange: setInternalActiveSubTab },
    settings: { initialStudents: students, initialSubjects: subjects, settings, onSettingsChange },
    // Pass global settings to all tabs
    appSettings: settings,
  };


  const allPossibleTabs: TabKey[] = [...visibleTabs];
  if (activeTab === 'settings' && !visibleTabs.includes('settings')) {
      allPossibleTabs.push('settings');
  }
  
  const currentTabToRender = activeTab ?? defaultTab;

  return (
    <TooltipProvider>
      <Tabs 
          value={currentTabToRender}
          onValueChange={(value) => {
            if (onTabChange) onTabChange(value as TabKey | null);
            setInternalActiveSubTab(null);
          }}
          className="w-full"
      >
        <ScrollArea className="w-full whitespace-nowrap no-print">
          <TabsList className="inline-flex w-auto mb-4">
            {visibleTabs.map(tabKey => (
              <TabsTrigger key={tabKey} value={tabKey}>{tabLabels[tabKey]}</TabsTrigger>
            ))}
            {activeTab === 'settings' && !visibleTabs.includes('settings') && (
               <TabsTrigger value="settings">Innstillinger</TabsTrigger>
            )}
          </TabsList>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>

        {allPossibleTabs.map(tabKey => {
            return (
                <TabsContent key={tabKey} value={tabKey} forceMount={tabKey !== currentTabToRender}>
                    <div style={{ display: tabKey === currentTabToRender ? 'block' : 'none' }}>
                        <ActiveTabContent 
                            tabKey={tabKey}
                            componentProps={baseComponentProps}
                        />
                    </div>
                </TabsContent>
            );
        })}

      </Tabs>
    </TooltipProvider>
  );
};

const AppView: FC<AppViewProps> = (props) => {
    if (!props.students || !props.subjects || !props.settings) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /> Laster kjernekomponenter...</div>;
    }

    return <AppViewContent {...props} />;
};


export default AppView;
