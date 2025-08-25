
'use client';

import { FC } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import SeatingChart from "@/components/SeatingChart";
import Remarks from "@/components/Remarks";
import GroupTool from "@/components/GroupTool";
import StudentPicker from "@/components/StudentPicker";
import RemarkAnalysis from "@/components/RemarkAnalysis";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { AppSettings, SeatingChartData, SeatingLayout, Student, Subject, TabKey } from '@/lib/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

const tabComponents: Record<TabKey, FC<any>> = {
  overview: HomeworkOverview,
  dailyCheck: DailyChecklist,
  remarks: Remarks,
  reports: Reports,
  seatingChart: SeatingChart,
  groupTool: GroupTool,
  studentPicker: StudentPicker,
  remarkAnalysis: RemarkAnalysis,
  settings: Settings,
};

const tabLabels: Record<TabKey, string> = {
  overview: "Lekseoversikt",
  dailyCheck: "Daglig Sjekk",
  remarks: "Anmerkninger",
  reports: "Rapporter",
  seatingChart: "Klassekart",
  groupTool: "Gruppeverktøy",
  studentPicker: "Elev-trekker",
  remarkAnalysis: "Anmerkningsanalyse",
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
  const visibleTabs = settings.tabOrder.filter(tabKey => settings.tabs[tabKey]);
  const defaultTab = activeTab || visibleTabs[0];

  // --- Data loading moved here, triggered by active tab ---
  const homework = useLiveQuery(() => activeTab === 'overview' || activeTab === 'reports' ? db.homework.toArray() : undefined, [activeTab], []);
  const submissions = useLiveQuery(() => activeTab === 'overview' || activeTab === 'reports' ? db.submissions.toArray() : undefined, [activeTab], []);
  const dailyChecks = useLiveQuery(() => activeTab === 'dailyCheck' || activeTab === 'reports' ? db.dailyChecks.toArray() : undefined, [activeTab], []);
  const remarks = useLiveQuery(() => activeTab === 'remarks' || activeTab === 'reports' || activeTab === 'remarkAnalysis' ? db.remarks.toArray() : undefined, [activeTab], []);
  const seatingChartHistory = useLiveQuery(() => activeTab === 'seatingChart' ? db.seatingChartHistory.orderBy('createdAt').reverse().toArray() : undefined, [activeTab], []);
  const seatingLayouts = useLiveQuery(() => activeTab === 'seatingChart' || activeTab === 'studentPicker' ? db.seatingLayouts.toArray() : undefined, [activeTab], []);
  const seatingChart = useLiveQuery(async () => {
    if (activeTab === 'dailyCheck' || activeTab === 'remarks' || activeTab === 'seatingChart' || activeTab === 'studentPicker') {
        const latest = await db.seatingChartHistory.orderBy('createdAt').last();
        return latest ? JSON.parse(latest.chartJson) : null;
    }
    return undefined;
  }, [activeTab]);


  const handleSeatingChartChange = async (newChart: SeatingChartData | null, source: 'generation' | 'drag' | 'load') => {
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
    groupTool: { students },
    studentPicker: { students, seatingChart, activeLayout: seatingLayouts?.find(l => l.id === settings.selectedSeatingLayoutId) },
    remarkAnalysis: { students, initialRemarks: remarks },
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
      <ScrollArea className="w-full whitespace-nowrap">
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
