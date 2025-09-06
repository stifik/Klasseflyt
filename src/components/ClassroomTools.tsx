

"use client";

import { FC, useEffect } from "react";
import type { SeatingChartData, SeatingLayout, Student, SeatingChartRecord, AppSettings, StationAssignmentLog, GroupSet } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GroupTool from "./GroupTool";
import StudentPicker from "./StudentPicker";
import SeatingChart from "./SeatingChart";
import { db } from "@/lib/db";

interface ClassroomToolsProps {
  students: Student[];
  seatingChart: SeatingChartData | null;
  activeLayout: SeatingLayout | null | undefined;
  onSeatingChartChange: (chart: SeatingChartData | null, source: 'generation' | 'drag' | 'load') => void;
  history: SeatingChartRecord[];
  appSettings: AppSettings;
  onAppSettingsChange: (newSettings: AppSettings) => void;
  layouts: SeatingLayout[];
  onLayoutsChange: (layouts: SeatingLayout[]) => void;
  activeSubTab?: string | null;
  onSubTabChange: (subTab: string) => void;
  stationAssignmentLogs?: StationAssignmentLog[];
  groupSets?: GroupSet[];
}

const ClassroomTools: FC<ClassroomToolsProps> = (props) => {
  const { students, seatingChart, activeLayout, activeSubTab, onSubTabChange, appSettings, stationAssignmentLogs, groupSets } = props;

  const defaultSubTab = "seating-chart";
  
  // This useEffect ensures the component reacts to external navigation changes
  useEffect(() => {
    if (activeSubTab && ["seating-chart", "group-tool", "student-picker"].includes(activeSubTab)) {
      onSubTabChange(activeSubTab);
    }
  }, [activeSubTab, onSubTabChange]);


  return (
    <Tabs 
      value={activeSubTab || defaultSubTab} 
      onValueChange={onSubTabChange}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="seating-chart">Klassekart</TabsTrigger>
        <TabsTrigger value="group-tool">Gruppeverktøy</TabsTrigger>
        <TabsTrigger value="student-picker">Elev-trekker</TabsTrigger>
      </TabsList>
       <TabsContent value="seating-chart">
        <SeatingChart {...props} />
      </TabsContent>
      <TabsContent value="group-tool">
        <GroupTool students={students} appSettings={appSettings} stationAssignmentLogs={stationAssignmentLogs} groupSets={groupSets} />
      </TabsContent>
      <TabsContent value="student-picker">
        <StudentPicker students={students} seatingChart={seatingChart} activeLayout={activeLayout} />
      </TabsContent>
    </Tabs>
  );
};

export default ClassroomTools;
