
"use client";

import type { FC } from "react";
import type { Student, Remark, SeatingChartData, AppSettings, HourlyCheck } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HourlyCheckComponent from "./HourlyCheck";
import RemarksComponent from "./Remarks";

interface ObservationsProps {
  students: Student[];
  initialRemarks: Remark[];
  initialHourlyChecks: HourlyCheck[];
  onUpdate: () => void;
  seatingChart: SeatingChartData | null;
  settings: AppSettings;
}

const Observations: FC<ObservationsProps> = (props) => {
  return (
    <Tabs defaultValue="hourly-check" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="hourly-check">Timeinnsjekk</TabsTrigger>
        <TabsTrigger value="remarks">Anmerkninger</TabsTrigger>
      </TabsList>
      <TabsContent value="hourly-check">
        <HourlyCheckComponent 
            students={props.students} 
            initialChecks={props.initialHourlyChecks} 
            onUpdate={props.onUpdate}
            seatingChart={props.seatingChart}
            settings={props.settings}
        />
      </TabsContent>
      <TabsContent value="remarks">
        <RemarksComponent
            students={props.students}
            initialRemarks={props.initialRemarks}
            onUpdate={props.onUpdate}
            seatingChart={props.seatingChart}
            settings={props.settings}
        />
      </TabsContent>
    </Tabs>
  );
};

export default Observations;
