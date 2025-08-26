
"use client";

import type { FC } from "react";
import type { SeatingChartData, SeatingLayout, Student, SeatingChartRecord, AppSettings } from "@/lib/types";
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
}

const ClassroomTools: FC<ClassroomToolsProps> = (props) => {
  const { students, seatingChart, activeLayout } = props;

  return (
    <Tabs defaultValue="seating-chart" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="seating-chart">Klassekart</TabsTrigger>
        <TabsTrigger value="group-tool">Gruppeverktøy</TabsTrigger>
        <TabsTrigger value="student-picker">Elev-trekker</TabsTrigger>
      </TabsList>
       <TabsContent value="seating-chart">
        <SeatingChart {...props} />
      </TabsContent>
      <TabsContent value="group-tool">
        <GroupTool students={students} />
      </TabsContent>
      <TabsContent value="student-picker">
        <StudentPicker students={students} seatingChart={seatingChart} activeLayout={activeLayout} />
      </TabsContent>
    </Tabs>
  );
};

export default ClassroomTools;
