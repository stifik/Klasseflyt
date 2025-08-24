
'use client';

import type { FC } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkOverview from "@/components/HomeworkOverview";
import DailyChecklist from "@/components/DailyChecklist";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import SeatingChart from "@/components/SeatingChart";
import Remarks from "@/components/Remarks";
import GroupTool from "@/components/GroupTool";
import StudentPicker from "@/components/StudentPicker";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { AppSettings, Student, Subject, TabKey } from '@/lib/types';

const tabComponents: Record<TabKey, React.FC<any>> = {
  overview: HomeworkOverview,
  dailyCheck: DailyChecklist,
  remarks: Remarks,
  reports: Reports,
  seatingChart: SeatingChart,
  groupTool: GroupTool,
  studentPicker: StudentPicker,
};

const tabLabels: Record<TabKey, string> = {
  overview: "Lekseoversikt",
  dailyCheck: "Daglig Sjekk",
  remarks: "Anmerkninger",
  reports: "Rapporter",
  seatingChart: "Klassekart",
  groupTool: "Gruppeverktøy",
  studentPicker: "Elev-trekker",
};

interface AppViewProps {
    settings: AppSettings;
    activeTab: TabKey | null;
    componentProps: any;
    onTabChange?: (tab: TabKey | null) => void;
    forceSettingsView?: boolean;
    // Props needed for settings view
    userId?: string;
    initialStudents?: Student[];
    initialSubjects?: Subject[];
    onUpdate?: () => void;
    onSettingsChange?: (newSettings: AppSettings) => void;
}

const AppView: FC<AppViewProps> = ({ 
    settings, 
    activeTab, 
    componentProps, 
    onTabChange, 
    forceSettingsView = false,
    userId,
    initialStudents,
    initialSubjects,
    onUpdate,
    onSettingsChange
}) => {
  const visibleTabs = settings.tabOrder.filter(tabKey => settings.tabs[tabKey]);
  const defaultTab = forceSettingsView ? 'settings' : activeTab || visibleTabs[0] || 'settings';

  return (
    <Tabs 
        defaultValue={defaultTab} 
        value={defaultTab} 
        onValueChange={(value) => onTabChange && onTabChange(value as TabKey)} 
        className="w-full"
    >
      <ScrollArea className="w-full whitespace-nowrap">
        <TabsList className="inline-flex w-auto mb-4">
          {visibleTabs.map(tabKey => (
            <TabsTrigger key={tabKey} value={tabKey}>{tabLabels[tabKey]}</TabsTrigger>
          ))}
          <TabsTrigger value="settings">Innstillinger</TabsTrigger>
        </TabsList>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {visibleTabs.map(tabKey => {
          const Component = tabComponents[tabKey];
          const props = componentProps[tabKey];
          return (
              <TabsContent key={tabKey} value={tabKey}>
                  <Component {...props} />
              </TabsContent>
          );
      })}

      <TabsContent value="settings">
        <Settings
          userId={userId!}
          initialStudents={initialStudents!}
          initialSubjects={initialSubjects!}
          onUpdate={onUpdate!}
          settings={settings}
          onSettingsChange={onSettingsChange!}
        />
      </TabsContent>
    </Tabs>
  );
};

export default AppView;
