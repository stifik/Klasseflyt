
'use client';

import { FC, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import ClassroomTools from "@/components/ClassroomTools";
import Observations from "@/components/Observations";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { AppSettings, SeatingLayout, Student, Subject, TabKey } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

const tabComponents: Partial<Record<TabKey, FC<any>>> = {
  overview: HomeworkOverview,
  dailyCheck: DailyChecklist,
  observations: Observations,
  reports: Reports,
  classroomTools: ClassroomTools,
  settings: Settings,
};

const tabLabels: Partial<Record<TabKey, string>> = {
  overview: "Lekseoversikt",
  dailyCheck: "Daglig Sjekk",
  observations: "Observasjoner",
  reports: "Analyse",
  classroomTools: "Klasseverktøy",
  settings: "Innstillinger",
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
  
  const visibleTabs = settings.tabOrder.filter(tabKey => settings.tabs[tabKey] && tabLabels[tabKey]);
  const defaultTab = activeTab || visibleTabs[0];

  const homework = useLiveQuery(() => db.homework.toArray(), [], undefined);
  const submissions = useLiveQuery(() => db.submissions.toArray(), [], undefined);
  const dailyChecks = useLiveQuery(() => db.dailyChecks.toArray(), [], undefined);
  const hourlyChecks = useLiveQuery(() => db.hourlyChecks.toArray(), [], undefined);
  const remarks = useLiveQuery(() => db.remarks.toArray(), [], undefined);
  const seatingChartHistory = useLiveQuery(() => db.seatingChartHistory.orderBy('createdAt').reverse().toArray(), [], undefined);
  const seatingLayouts = useLiveQuery(() => db.seatingLayouts.toArray(), [], undefined);
  const seatingChartData = useLiveQuery(async () => {
    const latest = await db.seatingChartHistory.orderBy('createdAt').last();
    return latest ? JSON.parse(latest.chartJson) : null;
  });


  const handleSeatingChartChange = async (newChart: SeatingLayout | null, source: 'generation' | 'drag' | 'load') => {
    if (newChart) {
        const activeLayout = seatingLayouts?.find(l => l.id === settings.selectedSeatingLayoutId);
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

  const handleLayoutsChange = async (layouts: SeatingLayout[]) => {
      const currentIds = new Set(layouts.map(l => l.id));
      const dbLayouts = await db.seatingLayouts.toArray();
      const toDelete = dbLayouts.filter(dbl => !currentIds.has(dbl.id)).map(l => l.id as string);
      
      if(toDelete.length > 0) await db.seatingLayouts.bulkDelete(toDelete);
      if(layouts.length > 0) await db.seatingLayouts.bulkPut(layouts);
  }

  const activeLayout = seatingLayouts?.find(l => l.id === settings.selectedSeatingLayoutId);

  const componentProps: Record<string, any> = {
    overview: { students, subjects, homeworkList: homework, submissions, onUpdate: () => {} },
    dailyCheck: { students, initialChecks: dailyChecks, onUpdate: () => {}, seatingChart: seatingChartData },
    observations: { students, initialHourlyChecks: hourlyChecks, initialRemarks: remarks, onUpdate: () => {}, seatingChart: seatingChartData, settings, activeSubTab: internalActiveSubTab, onSubTabChange: setInternalActiveSubTab },
    reports: { students, subjects, homework, submissions, dailyChecks, remarks, hourlyChecks, settings: settings, activeSubTab: internalActiveSubTab, onSubTabChange: setInternalActiveSubTab },
    classroomTools: { students, seatingChart: seatingChartData, onSeatingChartChange: handleSeatingChartChange, history: seatingChartHistory || [], appSettings: settings, onAppSettingsChange: onSettingsChange, layouts: seatingLayouts, onLayoutsChange: handleLayoutsChange, activeLayout, activeSubTab: internalActiveSubTab, onSubTabChange: setInternalActiveSubTab },
    settings: { initialStudents: students, initialSubjects: subjects, settings: settings, onSettingsChange: onSettingsChange }
  };


  const allPossibleTabs: TabKey[] = [...visibleTabs];
  if (activeTab === 'settings' && !visibleTabs.includes('settings')) {
      allPossibleTabs.push('settings');
  }

  return (
    <Tabs 
        value={activeTab ?? defaultTab}
        onValueChange={(value) => {
          onTabChange && onTabChange(value as TabKey);
          setInternalActiveSubTab(null); // Reset sub-tab when main tab changes
        }}
        className="w-full"
    >
      <ScrollArea className="w-full whitespace-nowrap no-print">
        <TabsList className="inline-flex w-auto mb-4">
          {visibleTabs.map(tabKey => (
            <TabsTrigger key={tabKey} value={tabKey}>{tabLabels[tabKey]}</TabsTrigger>
          ))}
          {activeTab === 'settings' && (
             <TabsTrigger value="settings">Innstillinger</TabsTrigger>
          )}
        </TabsList>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {allPossibleTabs.map(tabKey => {
          const Component = tabComponents[tabKey];
          if (!Component) return null;
          const props = componentProps[tabKey];
          
          const isDataReady = Object.entries(props).every(([key, value]) => {
              if (['seatingChart', 'activeSubTab'].includes(key)) return value !== undefined; // Can be null
              if (key === 'activeLayout') return seatingLayouts !== undefined; // Based on seatingLayouts query
              return value !== undefined;
          });

          return (
              <TabsContent key={tabKey} value={tabKey}>
                  {isDataReady ? <Component {...props} /> : <div>Laster data for fane...</div>}
              </TabsContent>
          );
      })}

    </Tabs>
  );
};

export default AppView;
