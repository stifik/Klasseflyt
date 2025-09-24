
"use client";

import { FC, useEffect } from "react";
import type { SeatingChartData, SeatingLayout, Student, SeatingChartRecord, AppSettings, StationAssignmentLog, GroupSet, Absence } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GroupTool from "./GroupTool";
import StudentPicker from "./StudentPicker";
import SeatingChart from "./SeatingChart";
import NewSeatingChart from "./NewSeatingChart"; // Importer den nye komponenten
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

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
  absences?: Absence[];
}

const ClassroomTools: FC<ClassroomToolsProps> = (props) => {
  const { students, activeSubTab, onSubTabChange, appSettings, stationAssignmentLogs, groupSets, seatingChart, activeLayout, onAppSettingsChange, absences, onSeatingChartChange } = props;
  
  const pickerGroups = useLiveQuery(() => db.pickerGroups.orderBy('createdAt').toArray());

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
        <NewSeatingChart students={students} appSettings={appSettings} onAppSettingsChange={onAppSettingsChange} onSeatingChartChange={onSeatingChartChange} />
      </TabsContent>
      <TabsContent value="group-tool">
        <GroupTool students={students} appSettings={appSettings} onAppSettingsChange={onAppSettingsChange} stationAssignmentLogs={stationAssignmentLogs} groupSets={groupSets} absences={absences} />
      </TabsContent>
      <TabsContent value="student-picker">
        <StudentPicker students={students} seatingChart={seatingChart} activeLayout={activeLayout} appSettings={appSettings} onAppSettingsChange={onAppSettingsChange} absences={absences} />
      </TabsContent>
    </Tabs>
  );
};

export default ClassroomTools;

