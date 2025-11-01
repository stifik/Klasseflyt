"use client";

import * as React from "react";
import type { AppSettings, TabKey, DashboardToolKey } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface DashboardSettingsProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

const allToolLabels: Record<DashboardToolKey, string> = {
  'overview': "Lekseoversikt",
  'assessments': "Vurderinger",
  'dailyCheck': "Daglig Sjekk",
  'innsjekking': "Innsjekking",
  'observations': "Observasjoner",
  'observations.hourly': "Timeinnsjekk",
  'observations.remarks': "Anmerkninger",
  'classroomTools': "Klassekart",
  'classroomTools.seatingChart': "Klassekart",
  'classroomTools.groupTool': "Gruppeverktøy",
  'classroomTools.studentPicker': "Elev-trekker",
  'reports': "Analyse",
  'reports.summary': "Ukesoppsummering",
  'reports.studentReports': "Elevrapporter",
  'reports.analysis': "Anmerkningsanalyse",
  'rewardDashboard': "Poengoversikt",
  'rewardStore': "Prisliste",
  'activityFeed': "Aktivitetsfeed",
  'morning-display': "Morgenvisning",
  'poengsentral': "Poengsentral",
  'secret-agent': "Hemmelig Agent",
  'weekly-planner': "Ukesplanlegger",
};

const allTabLabels: Record<TabKey, string> = {
  'overview': 'Lekseoversikt',
  'dailyCheck': 'Daglig Sjekk',
  'observations': 'Observasjoner',
  'assessments': 'Vurderinger',
  'classroomTools': 'Klassekart',
  'reports': 'Analyse',
  'settings': 'Innstillinger',
};

const SortableItem = ({ id, label, isChecked, onToggle }: { id: string; label: string; isChecked: boolean; onToggle: (id: any) => void; }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border rounded-lg bg-background touch-none">
      <div className="flex items-center">
        <button {...attributes} {...listeners} className="p-2 cursor-grab">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>
        <Label htmlFor={`item-${id}`} className="font-medium">{label}</Label>
      </div>
      <Switch id={`item-${id}`} checked={isChecked} onCheckedChange={() => onToggle(id)} />
    </div>
  );
};

export default function DashboardSettings({ settings, onSettingsChange }: DashboardSettingsProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleTabToggle = (key: TabKey) => {
    onSettingsChange({
      ...settings,
      tabs: { ...settings.tabs, [key]: !settings.tabs[key] }
    });
  };

  const handleTabDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = settings.tabOrder.findIndex(t => t === active.id);
      const newIndex = settings.tabOrder.findIndex(t => t === over!.id);
      onSettingsChange({ ...settings, tabOrder: arrayMove(settings.tabOrder, oldIndex, newIndex) });
    }
  };

  const handleDashboardToolToggle = (key: DashboardToolKey) => {
    onSettingsChange({
      ...settings,
      dashboardTools: settings.dashboardTools.map(tool =>
        tool.key === key ? { ...tool, visible: !tool.visible } : tool
      )
    });
  };

  const handleDashboardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = settings.dashboardTools.findIndex(t => t.key === active.id);
      const newIndex = settings.dashboardTools.findIndex(t => t.key === over!.id);
      onSettingsChange({ ...settings, dashboardTools: arrayMove(settings.dashboardTools, oldIndex, newIndex) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard-verktøy</CardTitle>
        <CardDescription>Velg hvilke verktøy som skal vises på dashboard, og dra for å endre rekkefølgen.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={[]} className="w-full">
          <AccordionItem value="dashboard-tools" className="border-b-0">
            <AccordionTrigger>Verktøy ({settings.dashboardTools.filter(t => t.visible).length}/{settings.dashboardTools.length} synlige)</AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDashboardDragEnd}>
                <SortableContext items={settings.dashboardTools.map(t => t.key)} strategy={verticalListSortingStrategy}>
                  {settings.dashboardTools.map((tool) => (
                    <SortableItem
                      key={tool.key}
                      id={tool.key}
                      label={allToolLabels[tool.key] ?? String(tool.key) ?? 'Ukjent verktøy'}
                      isChecked={tool.visible}
                      onToggle={() => handleDashboardToolToggle(tool.key)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
