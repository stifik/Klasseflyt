"use client";

import * as React from "react";
import type { Student, Subject, AppSettings } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import StudentsAndSubjects from "./settings/StudentsAndSubjects";
import ObservationsSettings from "./settings/ObservationsSettings";
import ClassroomToolsSettings from "./settings/ClassroomToolsSettings";
import DashboardSettings from "./settings/DashboardSettings";
import ScheduleSettings from "./settings/ScheduleSettings";
import ReportSettings from "./settings/ReportSettings";
import DatabaseSettings from "./settings/DatabaseSettings";

interface SettingsProps {
  initialStudents: Student[];
  initialSubjects: Subject[];
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

export default function Settings({ initialStudents, initialSubjects, settings: initialSettings, onSettingsChange }: SettingsProps) {
  const [localSettings, setLocalSettings] = React.useState(initialSettings);

  // Debounce saving
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (JSON.stringify(localSettings) !== JSON.stringify(initialSettings)) {
        onSettingsChange(localSettings);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [localSettings, initialSettings, onSettingsChange]);

  React.useEffect(() => {
    setLocalSettings(initialSettings);
  }, [initialSettings]);

  const handleSettingChange = (newSettings: AppSettings) => {
    setLocalSettings(newSettings);
  };

  return (
    <div className="w-full space-y-4">
      {/* Alle innstillinger i accordion (lukket som default) */}
      <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
        <AccordionItem value="students-subjects" className="border-b-0">
          <StudentsAndSubjects students={initialStudents} subjects={initialSubjects} />
        </AccordionItem>

        <AccordionItem value="observations" className="border-b-0">
          <ObservationsSettings settings={localSettings} onSettingsChange={handleSettingChange} />
        </AccordionItem>

        <AccordionItem value="classroom-tools" className="border-b-0">
          <ClassroomToolsSettings
            students={initialStudents}
            settings={localSettings}
            onSettingsChange={handleSettingChange}
          />
        </AccordionItem>

        <AccordionItem value="dashboard" className="border-b-0">
          <DashboardSettings settings={localSettings} onSettingsChange={handleSettingChange} />
        </AccordionItem>

        <AccordionItem value="schedule" className="border-b-0">
          <ScheduleSettings settings={localSettings} onSettingsChange={handleSettingChange} />
        </AccordionItem>

        <AccordionItem value="reports" className="border-b-0">
          <ReportSettings settings={localSettings} onSettingsChange={handleSettingChange} />
        </AccordionItem>

        <AccordionItem value="database" className="border-b-0">
          <DatabaseSettings settings={localSettings} onSettingsChange={handleSettingChange} />
        </AccordionItem>
      </Accordion>
    </div>
  );
}
