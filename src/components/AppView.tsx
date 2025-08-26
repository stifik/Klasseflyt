
'use client';

import { FC } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import SeatingChart from "@/components/SeatingChart";
import Remarks from "@/components/Remarks";
import ClassroomTools from "@/components/ClassroomTools";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { AppSettings, SeatingLayout, Student, Subject, TabKey } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

const tabComponents: Partial<Record<TabKey, FC<any>>> = {
  overview: HomeworkOverview,
  dailyCheck: DailyChecklist,
  remarks: Remarks,
  reports: Reports,
  seatingChart: SeatingChart,
  classroomTools: ClassroomTools,
  settings: Settings,
};

const tabLabels: Partial<Record<TabKey, string>> = {
  overview: "Lekseoversikt",
  dailyCheck: "Daglig Sjekk",
  remarks: "Anmerkninger",
  reports: "Rapporter & Analyse",
  seatingChart: "Klassekart",
  classroomTools: "Klasseverktøy",
  settings: "Innstillinger",
};

interface AppViewProps {
    settings: AppSettings;
    activeTab: TabKey | null;
    students: Student[];
    subjects: Subject[];
    onSettingsChange: (newSettings: AppSettings) => void;
    onTabChange?: (tab: TabKey | null) => void;
}

const AppView: FC<AppViewProps> = ({ 
    settings, 
    activeTab, 
    students,
    subjects,
    onSettingsChange,
    onTabChange, 
}) => {
  const visibleTabs = settings.tabOrder.filter(tabKey => settings.tabs[tabKey] && tabLabels[tabKey]);
  const defaultTab = activeTab || visibleTabs[0];

  const homework = useLiveQuery(() => db.homework.toArray(), [], []);
  const submissions = useLiveQuery(() => db.submissions.toArray(), [], []);
  const dailyChecks = useLiveQuery(() => db.dailyChecks.toArray(), [], []);
  const remarks = useLiveQuery(() => db.remarks.toArray(), [], []);
  const seatingChartHistory = useLiveQuery(() => db.seatingChartHistory.orderBy('createdAt').reverse().toArray(), [], []);
  const seatingLayouts = useLiveQuery(() => db.seatingLayouts.toArray(), [], []);
  const seatingChart = useLiveQuery(async () => {
    const latest = await db.seatingChartHistory.orderBy('createdAt').last();
    return latest ? JSON.parse(latest.chartJson) : null;
  }, []);


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

  const componentProps: Record<string, any> = {
    overview: { students, subjects, homeworkList: homework, submissions, onUpdate: () => {} },
    dailyCheck: { students, initialChecks: dailyChecks, onUpdate: () => {}, seatingChart },
    remarks: { students, initialRemarks: remarks, onUpdate: () => {}, seatingChart, settings },
    reports: { students, subjects, homework, submissions, dailyChecks, remarks, settings: settings.reportSettings },
    seatingChart: { students, seatingChart, onSeatingChartChange: handleSeatingChartChange, history: seatingChartHistory || [], appSettings: settings, onAppSettingsChange: onSettingsChange, layouts: seatingLayouts, onLayoutsChange: handleLayoutsChange },
    classroomTools: { students, seatingChart, activeLayout: seatingLayouts?.find(l => l.id === settings.selectedSeatingLayoutId) },
    settings: { initialStudents: students, initialSubjects: subjects, settings: settings, onSettingsChange: onSettingsChange }
  };


  const allPossibleTabs: TabKey[] = [...visibleTabs];
  if (activeTab === 'settings' && !visibleTabs.includes('settings')) {
      allPossibleTabs.push('settings');
  }

  return (
    <Tabs 
        value={activeTab ?? defaultTab}
        onValueChange={(value) => onTabChange && onTabChange(value as TabKey)} 
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
          // Simple check to avoid rendering with undefined data during initial load/tab switch
          const isDataReady = Object.values(props).every(p => p !== undefined);

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
