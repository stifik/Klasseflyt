
'use client';

import { FC, useState, useEffect, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import ClassroomTools from "@/components/ClassroomTools";
import Observations from "@/components/Observations";
import Assessments from "@/components/Assessments";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { AppSettings, SeatingLayout, Student, Subject, TabKey, DashboardSubTab } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Loader2 } from 'lucide-react';


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
const ActiveTabContent: FC<{ tabKey: TabKey, componentProps: Record<string, any>}> = ({ tabKey, componentProps }) => {
    const Component = tabComponents[tabKey];
    if (!Component) return null;

    const props = componentProps[tabKey] || {};

    const homework = useLiveQuery(() => tabKey === 'overview' || tabKey === 'reports' ? db.homework.toArray() : undefined);
    const submissions = useLiveQuery(() => tabKey === 'overview' || tabKey === 'reports' ? db.submissions.toArray() : undefined);
    const dailyChecks = useLiveQuery(() => tabKey === 'dailyCheck' || tabKey === 'reports' ? db.dailyChecks.toArray() : undefined);
    const hourlyChecks = useLiveQuery(() => tabKey === 'observations' || tabKey === 'reports' ? db.hourlyChecks.toArray() : undefined);
    const remarks = useLiveQuery(() => tabKey === 'observations' || tabKey === 'reports' ? db.remarks.toArray() : undefined);
    const seatingChartHistory = useLiveQuery(() => tabKey === 'classroomTools' ? db.seatingChartHistory.orderBy('createdAt').reverse().toArray() : undefined);
    const layouts = useLiveQuery(() => tabKey === 'classroomTools' ? db.seatingLayouts.toArray() : undefined);
    const seatingChartData = useLiveQuery(async () => {
        if (['dailyCheck', 'observations', 'classroomTools'].includes(tabKey)) {
            const latest = await db.seatingChartHistory.orderBy('createdAt').last();
            return latest ? JSON.parse(latest.chartJson) : null;
        }
        return undefined;
    });
    const tests = useLiveQuery(() => tabKey === 'assessments' || tabKey === 'reports' ? db.tests.toArray() : undefined);
    const testResults = useLiveQuery(() => tabKey === 'assessments' || tabKey === 'reports' ? db.testResults.toArray() : undefined);

    const dataMap: Record<string, any> = {
        overview: { homeworkList: homework, submissions },
        dailyCheck: { seatingChart: seatingChartData },
        observations: { initialHourlyChecks: hourlyChecks, initialRemarks: remarks, seatingChart: seatingChartData },
        assessments: { tests, testResults },
        reports: { homework, submissions, dailyChecks, remarks, hourlyChecks, tests, testResults },
        classroomTools: { seatingChart: seatingChartData, history: seatingChartHistory || [], layouts, activeLayout: layouts?.find(l => l.id === props.appSettings?.selectedSeatingLayoutId) },
        settings: {},
    };

    const combinedProps = { ...props, ...dataMap[tabKey] };

    const isDataReady = Object.values(dataMap[tabKey] || {}).every(value => value !== undefined);

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
    onTabChange?: (tab: TabKey | null, subTab?: string | null) => void;
}

const AppView: FC<AppViewProps> = ({ 
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
  
  const visibleTabs = (settings.tabOrder || []).filter(tabKey => settings.tabs[tabKey] && tabLabels[tabKey]);
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
    assessments: { students, subjects, onUpdate: () => {} },
    reports: { students, subjects, settings, activeSubTab: internalActiveSubTab, onSubTabChange: setInternalActiveSubTab },
    classroomTools: { students, onSeatingChartChange: handleSeatingChartChange, appSettings: settings, onAppSettingsChange: onSettingsChange, onLayoutsChange: handleLayoutsChange, activeSubTab: internalActiveSubTab, onSubTabChange: setInternalActiveSubTab },
    settings: { initialStudents: students, initialSubjects: subjects, settings, onSettingsChange }
  };


  const allPossibleTabs: TabKey[] = [...visibleTabs];
  if (activeTab === 'settings' && !visibleTabs.includes('settings')) {
      allPossibleTabs.push('settings');
  }
  
  const currentTabToRender = activeTab ?? defaultTab;

  return (
    <Tabs 
        value={currentTabToRender}
        onValueChange={(value) => {
          if (onTabChange) onTabChange(value as TabKey);
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
  );
};

export default AppView;
