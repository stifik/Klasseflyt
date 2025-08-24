
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import type { Student, Subject, AppSettings, TabKey } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Database, AlertTriangle, SettingsIcon, GripVertical, MessageSquareQuote, Clock, NotebookText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { Separator } from "./ui/separator";
import { db, resetDatabase, clearDatabase } from "@/lib/db";

interface SettingsProps {
  initialStudents: Student[];
  initialSubjects: Subject[];
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

const tabLabels: Record<TabKey, string> = {
  overview: "Lekseoversikt",
  dailyCheck: "Daglig Sjekk",
  remarks: "Anmerkninger",
  reports: "Rapporter",
  seatingChart: "Klassekart",
  groupTool: "Gruppeverktøy",
  studentPicker: "Elev-trekker",
  remarkAnalysis: "Anmerkningsanalyse",
};

const SortableTabItem = ({ id, onToggle, settings }: { id: TabKey, onToggle: (tab: TabKey) => void, settings: AppSettings }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border rounded-lg bg-background touch-none">
      <div className="flex items-center">
        <button {...attributes} {...listeners} className="p-2 cursor-grab">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>
        <Label htmlFor={`tab-${id}`} className="font-medium">
          {tabLabels[id]}
        </Label>
      </div>
      <Switch
        id={`tab-${id}`}
        checked={settings.tabs[id]}
        onCheckedChange={() => onToggle(id)}
      />
    </div>
  );
};

export default function Settings({ initialStudents, initialSubjects, settings: initialSettings, onSettingsChange }: SettingsProps) {
  const [newStudent, setNewStudent] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newRemarkType, setNewRemarkType] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [localSettings, setLocalSettings] = useState(initialSettings);

  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor));

  // Debounce saving
  useEffect(() => {
    const handler = setTimeout(() => {
      if (JSON.stringify(localSettings) !== JSON.stringify(initialSettings)) {
        onSettingsChange(localSettings);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [localSettings, initialSettings, onSettingsChange]);
  
  useEffect(() => {
      setLocalSettings(initialSettings);
  }, [initialSettings]);


  const handleAddStudent = async () => {
    if (newStudent.trim()) {
      try {
        await db.students.add({ name: newStudent.trim() });
        setNewStudent("");
        toast({ title: "Elev lagt til", description: `${newStudent.trim()} er lagt til i klasselisten.` });
      } catch (error) {
        toast({ title: "Feil", description: "Kunne ikke legge til elev.", variant: "destructive" });
      }
    }
  };

  const handleAddSubject = async () => {
    if (newSubject.trim()) {
      try {
        await db.subjects.add({ name: newSubject.trim() });
        setNewSubject("");
        toast({ title: "Fag lagt til", description: `${newSubject.trim()} er lagt til i faglisten.` });
      } catch (error) {
         toast({ title: "Feil", description: "Kunne ikke legge til fag.", variant: "destructive" });
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const studentName = initialStudents.find(s => s.id === id)?.name;
    try {
      await db.students.delete(id);
      toast({ title: "Elev slettet", description: `${studentName} er fjernet.`, variant: "destructive" });
    } catch (error) {
       toast({ title: "Feil", description: "Kunne ikke slette elev.", variant: "destructive" });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    const subjectName = initialSubjects.find(s => s.id === id)?.name;
    try {
      await db.subjects.delete(id);
      toast({ title: "Fag slettet", description: `${subjectName} er fjernet.`, variant: "destructive" });
    } catch (error) {
       toast({ title: "Feil", description: "Kunne ikke slette fag.", variant: "destructive" });
    }
  };
  
  const handleAddRemarkType = () => {
    if (newRemarkType.trim() && !localSettings.remarkTypes?.includes(newRemarkType.trim())) {
      const updatedTypes = [...(localSettings.remarkTypes || []), newRemarkType.trim()];
      handleSettingChange({ remarkTypes: updatedTypes });
      setNewRemarkType("");
    }
  };

  const handleDeleteRemarkType = (typeToDelete: string) => {
    const updatedTypes = localSettings.remarkTypes?.filter(t => t !== typeToDelete);
    handleSettingChange({ remarkTypes: updatedTypes });
  };


  const handleResetDatabase = async () => {
    setIsProcessing(true);
    try {
      await resetDatabase();
      toast({
        title: "Database nullstilt og fylt!",
        description: "Databasen er fylt med fersk demodata.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Feil ved nullstilling",
        description: "Kunne ikke nullstille databasen. Sjekk konsollen for feil.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleClearDatabase = async () => {
    setIsProcessing(true);
    try {
        await clearDatabase();
        toast({
            title: "Database tømt!",
            description: "All data er slettet. Du kan nå legge inn din egen data.",
        });
    } catch (error) {
        console.error(error);
        toast({
            title: "Feil ved tømming",
            description: "Kunne ikke tømme databasen.",
            variant: "destructive",
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSettingChange = (update: Partial<AppSettings> | ((current: AppSettings) => AppSettings)) => {
      if (typeof update === 'function') {
          setLocalSettings(current => update(current));
      } else {
          setLocalSettings(current => ({...current, ...update}));
      }
  }

  const handleTabToggle = (tab: TabKey) => {
    handleSettingChange(current => ({
      ...current,
      tabs: { ...current.tabs, [tab]: !current.tabs[tab] }
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      handleSettingChange(current => {
        const oldIndex = current.tabOrder.indexOf(active.id as TabKey);
        const newIndex = current.tabOrder.indexOf(over!.id as TabKey);
        return { ...current, tabOrder: arrayMove(current.tabOrder, oldIndex, newIndex) };
      });
    }
  };
  
  const handleReportSettingChange = (setting: keyof AppSettings['reportSettings'], value: any) => {
    handleSettingChange(current => ({
      ...current,
      reportSettings: { ...current.reportSettings, [setting]: value }
    }));
  };
  
  const handleScheduleChange = (period: number, type: 'startTime' | 'endTime', value: string) => {
    handleSettingChange(current => {
        const newSchedule = [...current.schedule];
        const periodIndex = newSchedule.findIndex(p => p.period === period);
        if (periodIndex > -1) {
            newSchedule[periodIndex] = { ...newSchedule[periodIndex], [type]: value };
        }
        return { ...current, schedule: newSchedule };
    });
  };


  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><SettingsIcon className="mr-2" />Faneinnstillinger</CardTitle>
                <CardDescription>Velg hvilke faner du vil ha synlig, og dra for å endre rekkefølgen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={localSettings.tabOrder}
                        strategy={verticalListSortingStrategy}
                    >
                        {localSettings.tabOrder.map((tabKey) => (
                             <SortableTabItem key={tabKey} id={tabKey} onToggle={handleTabToggle} settings={localSettings} />
                        ))}
                    </SortableContext>
                </DndContext>
            </CardContent>
        </Card>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Clock className="mr-2" />Timeplan</CardTitle>
                    <CardDescription>Legg inn start- og sluttid for timene. Dette brukes til å auto-velge time i anmerkningsfanen.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {localSettings.schedule.map(({ period, startTime, endTime }) => (
                        <div key={period} className="grid items-center grid-cols-3 gap-2 p-2 border rounded-lg">
                            <Label htmlFor={`period-${period}`} className="font-medium">Time {period}</Label>
                            <Input
                                id={`period-${period}-start`}
                                type="text"
                                value={startTime}
                                onChange={(e) => handleScheduleChange(period, 'startTime', e.target.value)}
                                placeholder="TT:MM"
                                pattern="[0-9]{2}:[0-9]{2}"
                            />
                            <Input
                                id={`period-${period}-end`}
                                type="text"
                                value={endTime}
                                onChange={(e) => handleScheduleChange(period, 'endTime', e.target.value)}
                                placeholder="TT:MM"
                                pattern="[0-9]{2}:[0-9]{2}"
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><MessageSquareQuote className="mr-2" />Innstillinger for Ukesmelding</CardTitle>
                    <CardDescription>Tilpass innholdet og teksten i den genererte ukesoppsummeringen.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <h4 className="mb-2 font-medium text-sm">Innhold</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label htmlFor="report-homework" className="font-medium">Inkluder lekse-status</Label>
                                <Switch
                                    id="report-homework"
                                    checked={localSettings.reportSettings.includeHomework}
                                    onCheckedChange={(checked) => handleReportSettingChange('includeHomework', checked)}
                                />
                            </div>
                             <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label htmlFor="report-ipad" className="font-medium">Inkluder iPad-status</Label>
                                <Switch
                                    id="report-ipad"
                                    checked={localSettings.reportSettings.includeIpad}
                                    onCheckedChange={(checked) => handleReportSettingChange('includeIpad', checked)}
                                />
                            </div>
                             <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label htmlFor="report-remarks" className="font-medium">Inkluder anmerkninger</Label>
                                <Switch
                                    id="report-remarks"
                                    checked={localSettings.reportSettings.includeRemarks}
                                    onCheckedChange={(checked) => handleReportSettingChange('includeRemarks', checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <Label htmlFor="report-positive" className="font-medium">Send ros ved prikkfri uke</Label>
                                <Switch
                                    id="report-positive"
                                    checked={localSettings.reportSettings.includePositiveFeedback}
                                    onCheckedChange={(checked) => handleReportSettingChange('includePositiveFeedback', checked)}
                                />
                            </div>
                        </div>
                    </div>
                    <Separator />
                    <div>
                        <h4 className="mb-2 font-medium text-sm">Tekstmal</h4>
                         <div className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="greeting">Hilsen</Label>
                                <Input id="greeting" value={localSettings.reportSettings.greeting} onChange={(e) => handleReportSettingChange('greeting', e.target.value)} />
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="closing">Avslutning</Label>
                                <Input id="closing" value={localSettings.reportSettings.closing} onChange={(e) => handleReportSettingChange('closing', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="teacherName">Ditt navn (for signatur)</Label>
                                <Input id="teacherName" value={localSettings.reportSettings.teacherName} onChange={(e) => handleReportSettingChange('teacherName', e.target.value)} />
                            </div>
                         </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><NotebookText className="mr-2" />Administrer Anmerkningstyper</CardTitle>
            <CardDescription>Legg til eller fjern typer anmerkninger som kan velges.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                value={newRemarkType}
                onChange={(e) => setNewRemarkType(e.target.value)}
                placeholder="Ny anmerkningstype..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddRemarkType()}
              />
              <Button onClick={handleAddRemarkType}><Plus className="mr-2"/> Legg til</Button>
            </div>
            <ul className="space-y-2">
              {(localSettings.remarkTypes || []).map((type) => (
                <li key={type} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                  <span>{type}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRemarkType(type)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Database className="mr-2" />Database</CardTitle>
                <CardDescription>Handlinger for å administrere appens lokale data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <h4 className="font-semibold">Tøm database for ny start</h4>
                    <p className="mb-2 text-sm text-muted-foreground">
                        Dette sletter all eksisterende data (elever, lekser, anmerkninger etc.) slik at du kan starte med blanke ark. Handlingen kan ikke angres.
                    </p>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isProcessing}>
                            {isProcessing ? 'Jobber...' : 'Tøm all data'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle><AlertTriangle className="inline-block mr-2 text-yellow-500" />Er du helt sikker?</AlertDialogTitle>
                            <AlertDialogDescription>
                            Dette vil permanent slette all data i appen. Handlingen kan ikke angres.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearDatabase}>Ja, slett alt</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <Separator />
                <div>
                     <h4 className="font-semibold">Fyll med demodata</h4>
                    <p className="mb-2 text-sm text-muted-foreground">
                        Dette er for testing. Handlingen sletter først all data, og fyller deretter databasen med et sett med fiktive elever og data.
                    </p>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" disabled={isProcessing}>
                            {isProcessing ? 'Jobber...' : 'Nullstill og fyll med demodata'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle><AlertTriangle className="inline-block mr-2 text-yellow-500" />Er du helt sikker?</AlertDialogTitle>
                            <AlertDialogDescription>
                            Dette vil permanent slette all nåværende data og erstatte den med demodata.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetDatabase}>Ja, nullstill og fyll på nytt</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Administrer Elever</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                value={newStudent}
                onChange={(e) => setNewStudent(e.target.value)}
                placeholder="Ny elev..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
              />
              <Button onClick={handleAddStudent}><Plus className="mr-2"/> Legg til</Button>
            </div>
            <ul className="space-y-2">
              {initialStudents.map((student) => (
                <li key={student.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                  <span>{student.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administrer Fag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Nytt fag..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
              />
              <Button onClick={handleAddSubject}><Plus className="mr-2"/> Legg til</Button>
            </div>
            <ul className="space-y-2">
              {initialSubjects.map((subject) => (
                <li key={subject.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                  <span>{subject.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(subject.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
