"use client";

import * as React from "react";
import { useState } from "react";
import type { AppSettings, Student, Workstation, GroupingRules, AvoidPair } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Library } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from 'uuid';

interface ClassroomToolsSettingsProps {
  students: Student[];
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

export default function ClassroomToolsSettings({ students, settings, onSettingsChange }: ClassroomToolsSettingsProps) {
  const [newWorkstationName, setNewWorkstationName] = useState("");
  const [newWorkstationCapacity, setNewWorkstationCapacity] = useState<string>("");

  const handleAddWorkstation = () => {
    if (newWorkstationName.trim()) {
      const capacity = newWorkstationCapacity ? parseInt(newWorkstationCapacity, 10) : undefined;
      const newStation: Workstation = {
        id: uuidv4(),
        name: newWorkstationName.trim(),
        capacity: capacity && !isNaN(capacity) ? capacity : undefined,
      };
      const updatedStations = [...(settings.workstations || []), newStation];
      onSettingsChange({ ...settings, workstations: updatedStations });
      setNewWorkstationName("");
      setNewWorkstationCapacity("");
    }
  };

  const handleDeleteWorkstation = (idToDelete: string) => {
    const updatedStations = settings.workstations?.filter(ws => ws.id !== idToDelete);
    onSettingsChange({ ...settings, workstations: updatedStations });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Klasseverktøy</CardTitle>
        <CardDescription>Administrer arbeidsstasjoner og grupperegler</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['workstations']} className="w-full">
          <AccordionItem value="workstations">
            <AccordionTrigger>Arbeidsstasjoner ({(settings.workstations || []).length})</AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="flex gap-2 mb-4">
                <Input
                  value={newWorkstationName}
                  onChange={(e) => setNewWorkstationName(e.target.value)}
                  placeholder="Navn på stasjon..."
                />
                <Input
                  type="number"
                  value={newWorkstationCapacity}
                  onChange={(e) => setNewWorkstationCapacity(e.target.value)}
                  placeholder="Antall plasser"
                  className="w-32"
                />
                <Button onClick={handleAddWorkstation}>
                  <Plus className="mr-2" /> Legg til
                </Button>
              </div>
              <ul className="space-y-2">
                {(settings.workstations || []).map((ws) => (
                  <li key={ws.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                    <span className="flex items-center gap-2">
                      <Library className="w-4 h-4" />
                      {ws.name}
                      {ws.capacity && <span className="text-xs text-muted-foreground">({ws.capacity} plasser)</span>}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteWorkstation(ws.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="grouping-rules" className="border-b-0">
            <AccordionTrigger>Grupperegler</AccordionTrigger>
            <AccordionContent className="pt-2">
              <GroupingRulesManager
                students={students}
                appSettings={settings}
                onAppSettingsChange={onSettingsChange}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

const GroupingRulesManager: React.FC<{
  students: Student[];
  appSettings: AppSettings;
  onAppSettingsChange: (settings: AppSettings) => void;
}> = ({ students, appSettings, onAppSettingsChange }) => {
  const [keepTogetherSelection, setKeepTogetherSelection] = React.useState<number[]>([]);
  const [keepApartStudent1, setKeepApartStudent1] = React.useState<number | "">("");
  const [keepApartStudent2, setKeepApartStudent2] = React.useState<number | "">("");
  const [search, setSearch] = React.useState("");

  const rules = appSettings.groupingRules || { keepTogether: [], keepApart: [] };
  const studentNameMap = React.useMemo(() => new Map(students.map(s => [s.id!, s.name])), [students]);

  const handleRuleChange = (newRules: Partial<GroupingRules>) => {
    onAppSettingsChange({
      ...appSettings,
      groupingRules: {
        ...rules,
        ...newRules
      }
    });
  }

  const handleAddKeepTogether = () => {
    if (keepTogetherSelection.length > 1) {
      const newGroup = keepTogetherSelection.map(id => studentNameMap.get(id)!);
      handleRuleChange({ keepTogether: [...rules.keepTogether, newGroup] });
      setKeepTogetherSelection([]);
    }
  };

  const handleRemoveKeepTogether = (index: number) => {
    const newKeepTogether = [...rules.keepTogether];
    newKeepTogether.splice(index, 1);
    handleRuleChange({ keepTogether: newKeepTogether });
  };

  const handleAddKeepApart = () => {
    if (keepApartStudent1 && keepApartStudent2 && keepApartStudent1 !== keepApartStudent2) {
      const student1Name = studentNameMap.get(keepApartStudent1)!;
      const student2Name = studentNameMap.get(keepApartStudent2)!;
      const newPair: AvoidPair = [student1Name, student2Name].sort() as AvoidPair;
      if (!rules.keepApart.some(p => p[0] === newPair[0] && p[1] === newPair[1])) {
        handleRuleChange({ keepApart: [...rules.keepApart, newPair] });
      }
      setKeepApartStudent1("");
      setKeepApartStudent2("");
    }
  };

  const handleRemoveKeepApart = (pairToRemove: AvoidPair) => {
    const newKeepApart = rules.keepApart.filter(p => p[0] !== pairToRemove[0] || p[1] !== pairToRemove[1]);
    handleRuleChange({ keepApart: newKeepApart });
  };

  const availableStudentsForTogether = students.filter(s => !rules.keepTogether.flat().includes(s.name) && !keepTogetherSelection.includes(s.id!));
  const filteredAvailableStudents = availableStudentsForTogether.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredAvailableStudents.length > 0) {
        const topStudent = filteredAvailableStudents[0];
        setKeepTogetherSelection(prev => [...prev, topStudent.id!]);
        setSearch("");
      }
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <div>
        <Label>Hold elever sammen</Label>
        <div className="p-2 border rounded-md mt-1 space-y-2">
          <div className="p-2 border rounded-md space-y-2">
            <div className="flex flex-wrap gap-1 text-xs mb-2 min-h-[20px] bg-secondary p-2 rounded-md">
              {keepTogetherSelection.length > 0 ? keepTogetherSelection.map(id => (
                <div key={id} className="flex items-center gap-1 bg-background p-1 rounded border">
                  {studentNameMap.get(id)}
                  <button onClick={() => setKeepTogetherSelection(prev => prev.filter(sId => sId !== id))}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              )) : <span className="text-muted-foreground">Valgte elever vises her...</span>}
            </div>
            <Button onClick={handleAddKeepTogether} size="sm" className="w-full" disabled={keepTogetherSelection.length < 2}>
              <Plus className="mr-2" /> Lag gruppe
            </Button>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Søk for å legge til elev..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <ScrollArea className="h-32">
              <div className="space-y-1 pr-2">
                {filteredAvailableStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs p-1">
                    <span>{s.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => setKeepTogetherSelection(prev => [...prev, s.id!])}>
                      Legg til
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        {rules.keepTogether.length > 0 && (
          <div className="space-y-2 mt-2">
            {rules.keepTogether.map((group, index) => (
              <div key={index} className="flex items-center justify-between p-2 text-xs rounded-md bg-secondary">
                <span>{group.join(', ')}</span>
                <Button size="icon" variant="ghost" onClick={() => handleRemoveKeepTogether(index)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <Label>Hold elever adskilt</Label>
        <div className="flex gap-2 mt-1">
          <Select value={keepApartStudent1 === "" ? "" : String(keepApartStudent1)} onValueChange={(v) => setKeepApartStudent1(v === "" ? "" : Number(v))}>
            <SelectTrigger><SelectValue placeholder="Elev 1" /></SelectTrigger>
            <SelectContent>{students.filter(s => s.id !== keepApartStudent2).map(s => <SelectItem key={s.id} value={String(s.id!)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={keepApartStudent2 === "" ? "" : String(keepApartStudent2)} onValueChange={(v) => setKeepApartStudent2(v === "" ? "" : Number(v))}>
            <SelectTrigger><SelectValue placeholder="Elev 2" /></SelectTrigger>
            <SelectContent>{students.filter(s => s.id !== keepApartStudent1).map(s => <SelectItem key={s.id} value={String(s.id!)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleAddKeepApart} size="icon"><Plus /></Button>
        </div>
        {rules.keepApart.length > 0 && (
          <div className="space-y-2 mt-2">
            {rules.keepApart.map((pair, index) => (
              <div key={index} className="flex items-center justify-between p-2 text-xs rounded-md bg-secondary">
                <span>{pair.join(' og ')}</span>
                <Button size="icon" variant="ghost" onClick={() => handleRemoveKeepApart(pair)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
