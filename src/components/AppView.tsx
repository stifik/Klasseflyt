
'use client';

import { FC } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Analysis from "@/components/Analysis";
import Settings from "@/components/Settings";
import SeatingChart from "@/components/SeatingChart";
import Observations from "@/components/Observations";
import ClassroomTools from "@/components/ClassroomTools";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { AppSettings, SeatingLayout, Student, Subject, TabKey, DashboardSubTab, DashboardTab } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

const tabComponents: Partial<Record<DashboardTab, FC<any>>> = {
  overview: HomeworkOverview,
  dailyCheck: DailyChecklist,
  observations: Observations,
  analysis: Analysis,
  classroomTools: ClassroomTools,
  settings: Settings,
};

const tabLabels: Partial<Record<DashboardTab, string>> = {
  overview: "Lekseoversikt",
  dailyCheck: "Daglig Sjekk",
  observations: "Observasjoner",
  analysis: "Analyse",
  classroomTools: "Klasseverktøy",
  settings: "Innstillinger",
};

interface AppViewProps {
    settings: AppSettings;
    activeTab: DashboardTab | null;
    activeSubTab: DashboardSubTab | null;
    students: Student[];
    subjects: Subject[];
    onSettingsChange: (newSettings: AppSettings) => void;
    onTabChange?: (tab: DashboardTab | null, subTab?: DashboardSubTab | null) => void;
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
  const visibleTabs = (settings.tabOrder || []).filter(tabKey => settings.tabs[tabKey] && tabLabels[tabKey]);
  const defaultTab = activeTab || visibleTabs[0];

  const homework = useLiveQuery(() => db.homework.toArray(), [], undefined);
  const submissions = useLiveQuery(() => db.submissions.toArray(), [], undefined);
  const remarks = useLiveQuery(() => db.remarks.toArray(), [], undefined);
  const seatingChartHistory = useLiveQuery(() => db.seatingChartHistory.orderBy('createdAt').reverse().toArray(), [], undefined);
  const layouts = useLiveQuery(() => db.seatingLayouts.toArray(), [], undefined);
  const seatingChartData = useLiveQuery(async () => {
    const latest = await db.seatingChartHistory.orderBy('createdAt').last();
    return latest ? JSON.parse(latest.chartJson) : null;
  });


  const handleSeatingChartChange = async (newChart: SeatingLayout | null, source: 'generation' | 'drag' | 'load') => {
    if (newChart) {
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

  const activeLayout = layouts?.find(l => l.id === settings.selectedSeatingLayoutId);

  const componentProps: Record<string, any> = {
    overview: { students, subjects, homeworkList: homework, submissions, onUpdate: () => {} },
    dailyCheck: { students, seatingChart: seatingChartData },
    observations: { students, initialRemarks: remarks, onUpdate: () => {}, seatingChart: seatingChartData, settings, activeSubTab: activeSubTab },
    analysis: { students, subjects, homework, submissions, remarks, settings: settings.reportSettings, activeSubTab: activeSubTab },
    classroomTools: { students, seatingChart: seatingChartData, activeLayout, onSeatingChartChange: handleSeatingChartChange, history: seatingChartHistory, appSettings: settings, onAppSettingsChange: onSettingsChange, layouts, onLayoutsChange: handleLayoutsChange, activeSubTab: activeSubTab },
    settings: { initialStudents: students, initialSubjects: subjects, settings: settings, onSettingsChange: onSettingsChange }
  };


  const allPossibleTabs: DashboardTab[] = [...visibleTabs];
  if (activeTab === 'settings' && !visibleTabs.includes('settings')) {
      allPossibleTabs.push('settings');
  }

  return (
    <Tabs 
        value={activeTab ?? defaultTab}
        onValueChange={(value) => onTabChange && onTabChange(value as DashboardTab)} 
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
              if (['seatingChart', 'activeSubTab', 'activeLayout'].includes(key)) return true;
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
