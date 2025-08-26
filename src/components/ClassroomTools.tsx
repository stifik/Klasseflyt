
"use client";

import type { FC } from "react";
import type { SeatingChartData, SeatingLayout, Student } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GroupTool from "./GroupTool";
import StudentPicker from "./StudentPicker";

interface ClassroomToolsProps {
  students: Student[];
  seatingChart: SeatingChartData | null;
  activeLayout: SeatingLayout | null;
}

const ClassroomTools: FC<ClassroomToolsProps> = ({ students, seatingChart, activeLayout }) => {
  return (
    <Tabs defaultValue="group-tool" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="group-tool">Gruppeverktøy</TabsTrigger>
        <TabsTrigger value="student-picker">Elev-trekker</TabsTrigger>
      </TabsList>
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
