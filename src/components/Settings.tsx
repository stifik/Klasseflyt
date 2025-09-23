

"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import type { Student, Subject, AppSettings, TabKey, BehaviorType, DashboardToolKey, DashboardConfig, DPIAAnalysis, Workstation, GroupingRules, AvoidPair } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Database, AlertTriangle, SettingsIcon, GripVertical, MessageSquareQuote, Clock, NotebookText, Eye, LayoutDashboard, Group, ShieldCheck, Award, Upload, Download, FileText, Library, ChevronsUpDown, Check } from "lucide-react";
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
import { db, resetDatabase, clearDatabase, exportDatabase, importDatabase } from "@/lib/db";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import DPIA from "./DPIA";
import { format } from "date-fns";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";


interface SettingsProps {
  initialStudents: Student[];
  initialSubjects: Subject[];
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

const allToolLabels: Record<DashboardToolKey, string> = {
    'overview': "Lekseoversikt",
    'assessments': "Vurderinger",
    'dailyCheck': "Daglig Sjekk",
    'observations': "Observasjoner",
    'observations.hourly': "Timeinnsjekk",
    'observations.remarks': "Anmerkninger",
    'classroomTools': "Klasseverktøy",
    'classroomTools.seatingChart': "Klassekart",
    'classroomTools.groupTool': "Gruppeverktøy",
    'classroomTools.studentPicker': "Elev-trekker",
    'reports': "Analyse",
    'reports.summary': "Ukesoppsummering",
    'reports.studentReports': "Elevrapporter",
    'reports.analysis': "Anmerkningsanalyse",
};

const allTabLabels: Record<TabKey, string> = {
  'overview': 'Lekseoversikt',
  'dailyCheck': 'Daglig Sjekk',
  'observations': 'Observasjoner',
  'assessments': 'Vurderinger',
  'classroomTools': 'Klasseverktøy',
  'reports': 'Analyse',
  'settings': 'Innstillinger',
};


const availableIcons = [
    'Smile', 'Annoyed', 'Handshake', 'Star', 'ThumbsUp', 'ThumbsDown', 'Award', 'BookOpen', 
    'MessageSquareWarning', 'Hand', 'Heart', 'Sparkles', 'Zap', 'Wind', 'CheckCircle2'
];

const availableColors: BehaviorType['color'][] = ['green', 'yellow', 'blue', 'red', 'purple', 'gray'];
const colorClasses: Record<BehaviorType['color'], string> = {
    green: 'bg-green-500', yellow: 'bg-yellow-500', blue: 'bg-blue-500', 
    red: 'bg-red-500', purple: 'bg-purple-500', gray: 'bg-gray-500',
};

const Icon = ({ name, className }: { name: string, className?: string }) => {
    const LucideIcon = (LucideIcons as any)[name];
    if (!LucideIcon) return <LucideIcons.Star className={className} />;
    return <LucideIcon className={className} />;
}

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

export default function Settings({ initialStudents, initialSubjects, settings: initialSettings, onSettingsChange }: SettingsProps) {
  const [newStudent, setNewStudent] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newRemarkType, setNewRemarkType] = useState("");
  
  const [newBehaviorLabel, setNewBehaviorLabel] = useState("");
  const [newBehaviorIcon, setNewBehaviorIcon] = useState<string>(availableIcons[0]);
  const [newBehaviorColor, setNewBehaviorColor] = useState<BehaviorType['color']>(availableColors[0]);
  
  const [newWorkstationName, setNewWorkstationName] = useState("");
  const [newWorkstationCapacity, setNewWorkstationCapacity] = useState<string>("");


  const [isProcessing, setIsProcessing] = useState(false);
  const [localSettings, setLocalSettings] = useState(initialSettings);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
  
  const handleAddBehaviorType = () => {
    if (newBehaviorLabel.trim()) {
        const newType: BehaviorType = { 
            id: uuidv4(), 
            label: newBehaviorLabel.trim(),
            icon: newBehaviorIcon,
            color: newBehaviorColor
        };
        const updatedTypes = [...(localSettings.behaviorTypes || []), newType];
        handleSettingChange({ behaviorTypes: updatedTypes });
        setNewBehaviorLabel("");
    }
  };

  const handleDeleteBehaviorType = (idToDelete: string) => {
      const updatedTypes = localSettings.behaviorTypes?.filter(t => t.id !== idToDelete);
      handleSettingChange({ behaviorTypes: updatedTypes });
  };

  const handleAddWorkstation = () => {
    if (newWorkstationName.trim()) {
      const capacity = newWorkstationCapacity ? parseInt(newWorkstationCapacity, 10) : undefined;
      const newStation: Workstation = { 
        id: uuidv4(), 
        name: newWorkstationName.trim(),
        capacity: capacity && !isNaN(capacity) ? capacity : undefined,
      };
      const updatedStations = [...(localSettings.workstations || []), newStation];
      handleSettingChange({ workstations: updatedStations });
      setNewWorkstationName("");
      setNewWorkstationCapacity("");
    }
  };

  const handleDeleteWorkstation = (idToDelete: string) => {
    const updatedStations = localSettings.workstations?.filter(ws => ws.id !== idToDelete);
    handleSettingChange({ workstations: updatedStations });
  };

  const handleResetDatabase = async () => {
    setIsProcessing(true);
    try {
      await resetDatabase();
      toast({
        title: "Database nullstilt og fylt!",
        description: "Databasen er fylt med fersk demodata.",
      });
      window.location.reload();
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
        window.location.reload();
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
  
  const handleTabToggle = (key: TabKey) => {
    handleSettingChange(current => ({
        ...current,
        tabs: { ...current.tabs, [key]: !current.tabs[key] }
    }));
  };

  const handleTabDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
        handleSettingChange(current => {
            const oldIndex = current.tabOrder.findIndex(t => t === active.id);
            const newIndex = current.tabOrder.findIndex(t => t === over!.id);
            return { ...current, tabOrder: arrayMove(current.tabOrder, oldIndex, newIndex) };
        });
    }
  };

  const handleDashboardToolToggle = (key: DashboardToolKey) => {
    handleSettingChange(current => ({
        ...current,
        dashboardTools: current.dashboardTools.map(tool => 
            tool.key === key ? { ...tool, visible: !tool.visible } : tool
        )
    }));
  };
  
  const handleDashboardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
        handleSettingChange(current => {
            const oldIndex = current.dashboardTools.findIndex(t => t.key === active.id);
            const newIndex = current.dashboardTools.findIndex(t => t.key === over!.id);
            return { ...current, dashboardTools: arrayMove(current.dashboardTools, oldIndex, newIndex) };
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
  
  const handleAnalysisChange = (newAnalysis: DPIAAnalysis) => {
    handleSettingChange(current => ({ ...current, dpiaAnalysis: newAnalysis }));
  };
  
  const handleExport = async () => {
    try {
        const data = await exportDatabase();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = format(new Date(), 'yyyy-MM-dd');
        a.href = url;
        a.download = `klasseflyt_backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Database eksportert", description: "En backup-fil er lastet ned." });
    } catch (error) {
        console.error("Export failed:", error);
        toast({ title: "Eksport feilet", description: "Kunne ikke eksportere databasen.", variant: "destructive" });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File is not readable");
            const data = JSON.parse(text);
            await importDatabase(data);
            toast({ title: "Database importert!", description: "Siden vil nå lastes på nytt." });
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error("Import failed:", error);
            toast({ title: "Import feilet", description: "Filen er ugyldig eller korrupt.", variant: "destructive" });
        }
    };
    reader.readAsText(file);
    // Reset file input
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <Accordion type="multiple" defaultValue={['dashboard']} className="w-full space-y-4">
        <AccordionItem value="dashboard" className="border-b-0">
             <Card>
                <CardHeader>
                  <AccordionTrigger className="p-0 hover:no-underline">
                      <CardTitle className="flex items-center"><LayoutDashboard className="mr-2" />Dashbord & Faner</CardTitle>
                  </AccordionTrigger>
                   <CardDescription>Velg hvilke faner og verktøy som skal vises, og dra for å endre rekkefølgen.</CardDescription>
                </CardHeader>
                <AccordionContent asChild>
                    <CardContent className="space-y-4 pt-4">
                        <Accordion type="multiple" className="w-full">
                            <AccordionItem value="tabs">
                                <AccordionTrigger>Hovedfaner</AccordionTrigger>
                                <AccordionContent className="space-y-2 pt-2">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTabDragEnd}>
                                        <SortableContext items={localSettings.tabOrder} strategy={verticalListSortingStrategy}>
                                            {localSettings.tabOrder.map(tabKey => (
                                                <SortableItem
                                                    key={tabKey}
                                                    id={tabKey}
                                                    label={allTabLabels[tabKey as TabKey] || tabKey}
                                                    isChecked={localSettings.tabs[tabKey as TabKey]}
                                                    onToggle={() => handleTabToggle(tabKey as TabKey)}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="dashboard-tools" className="border-b-0">
                                <AccordionTrigger>Dashbord-verktøy</AccordionTrigger>
                                <AccordionContent className="space-y-2 pt-2">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDashboardDragEnd}>
                                        <SortableContext items={localSettings.dashboardTools.map(t => t.key)} strategy={verticalListSortingStrategy}>
                                            {localSettings.dashboardTools.map((tool) => (
                                                <SortableItem
                                                    key={tool.key}
                                                    id={tool.key}
                                                    label={allToolLabels[tool.key]}
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
                </AccordionContent>
             </Card>
        </AccordionItem>

        <AccordionItem value="content" className="border-b-0">
             <Card>
                <CardHeader>
                    <AccordionTrigger className="p-0 hover:no-underline">
                        <CardTitle className="flex items-center"><NotebookText className="mr-2" />Administrer Innhold</CardTitle>
                    </AccordionTrigger>
                    <CardDescription>Administrer elever, fag, anmerkningstyper og arbeidsstasjoner.</CardDescription>
                </CardHeader>
                 <AccordionContent asChild>
                    <CardContent className="pt-4">
                        <Accordion type="multiple" className="w-full">
                            <AccordionItem value="students">
                                <AccordionTrigger>Administrer Elever ({initialStudents?.length || 0})</AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <div className="flex gap-2 mb-4">
                                        <Input
                                            value={newStudent}
                                            onChange={(e) => setNewStudent(e.target.value)}
                                            placeholder="Ny elev..."
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                                        />
                                        <Button onClick={handleAddStudent}><Plus className="mr-2" /> Legg til</Button>
                                    </div>
                                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {initialStudents?.map((student) => (
                                            <li key={student.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                                                <span>{student.name}</span>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Dette vil permanent slette eleven {student.name} og all relatert data. Handlingen kan ikke angres.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteStudent(student.id!)}>
                                                                Ja, slett elev
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="subjects">
                                <AccordionTrigger>Administrer Fag ({initialSubjects?.length || 0})</AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <div className="flex gap-2 mb-4">
                                        <Input
                                            value={newSubject}
                                            onChange={(e) => setNewSubject(e.target.value)}
                                            placeholder="Nytt fag..."
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                                        />
                                        <Button onClick={handleAddSubject}><Plus className="mr-2" /> Legg til</Button>
                                    </div>
                                    <ul className="space-y-2">
                                        {initialSubjects?.map((subject) => (
                                            <li key={subject.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                                                <span>{subject.name}</span>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Dette vil permanent slette faget {subject.name}. Handlingen kan ikke angres.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteSubject(subject.id!)}>
                                                                Ja, slett fag
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="remarkTypes">
                                <AccordionTrigger>Administrer Anmerkningstyper ({(localSettings.remarkTypes || []).length})</AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <div className="flex gap-2 mb-4">
                                        <Input
                                            value={newRemarkType}
                                            onChange={(e) => setNewRemarkType(e.target.value)}
                                            placeholder="Ny anmerkningstype..."
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddRemarkType()}
                                        />
                                        <Button onClick={handleAddRemarkType}><Plus className="mr-2" /> Legg til</Button>
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
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="workstations">
                                <AccordionTrigger>Administrer Arbeidsstasjoner ({(localSettings.workstations || []).length})</AccordionTrigger>
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
                                        <Button onClick={handleAddWorkstation}><Plus className="mr-2" /> Legg til</Button>
                                    </div>
                                    <ul className="space-y-2">
                                        {(localSettings.workstations || []).map((ws) => (
                                            <li key={ws.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                                                <span className="flex items-center gap-2">
                                                    <Library className="w-4 h-4"/>
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
                            <AccordionItem value="behaviorTypes" className="border-b-0">
                                <AccordionTrigger>Administrer Atferdstyper ({(localSettings.behaviorTypes || []).length})</AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <div className="p-2 space-y-3 border-b mb-4">
                                        <Input
                                            value={newBehaviorLabel}
                                            onChange={(e) => setNewBehaviorLabel(e.target.value)}
                                            placeholder="Ny atferdstype..."
                                        />
                                        <div className="flex items-center gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="justify-start">
                                                        <Icon name={newBehaviorIcon} className="w-4 h-4 mr-2" />
                                                        Velg ikon
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-2">
                                                    <div className="grid grid-cols-5 gap-1">
                                                        {availableIcons.map(icon => (
                                                            <Button key={icon} variant={newBehaviorIcon === icon ? "secondary" : "ghost"} size="icon" onClick={() => setNewBehaviorIcon(icon)}>
                                                                <Icon name={icon} />
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="justify-start">
                                                        <div className={cn("w-4 h-4 rounded-full mr-2", colorClasses[newBehaviorColor])} />
                                                        Velg farge
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-2">
                                                    <div className="flex gap-1">
                                                        {availableColors.map(color => (
                                                            <button key={color} onClick={() => setNewBehaviorColor(color)} className={cn("w-6 h-6 rounded-full", colorClasses[color], { 'ring-2 ring-ring ring-offset-2': newBehaviorColor === color })} />
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <Button onClick={handleAddBehaviorType} className="w-full"><Plus className="mr-2" /> Legg til</Button>
                                    </div>
                                    <ul className="space-y-2">
                                        {(localSettings.behaviorTypes || []).map((type) => (
                                            <li key={type.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                                                <div className="flex items-center gap-2">
                                                    <Icon name={type.icon} className="w-4 h-4" />
                                                    <div className={cn("w-3 h-3 rounded-full", colorClasses[type.color])} />
                                                    <span>{type.label}</span>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteBehaviorType(type.id)}>
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </AccordionContent>
            </Card>
        </AccordionItem>

        <AccordionItem value="grouping-rules" className="border-b-0">
             <Card>
                <CardHeader>
                    <AccordionTrigger className="p-0 hover:no-underline">
                        <CardTitle className="flex items-center"><Group className="mr-2" />Innstillinger for gruppeverktøy</CardTitle>
                    </AccordionTrigger>
                    <CardDescription>Sett opp faste regler for tilfeldig gruppeinndeling.</CardDescription>
                </CardHeader>
                <AccordionContent asChild>
                    <CardContent className="pt-4">
                        <GroupingRulesManager students={initialStudents} appSettings={localSettings} onAppSettingsChange={handleSettingChange} />
                    </CardContent>
                </AccordionContent>
             </Card>
        </AccordionItem>
        
        <AccordionItem value="schedule" className="border-b-0">
             <Card>
                <CardHeader>
                    <AccordionTrigger className="p-0 hover:no-underline">
                        <CardTitle className="flex items-center"><Clock className="mr-2" />Timeplan</CardTitle>
                    </AccordionTrigger>
                    <CardDescription>Legg inn start- og sluttid for timene. Dette brukes til å auto-velge time.</CardDescription>
                </CardHeader>
                <AccordionContent asChild>
                    <CardContent className="pt-4 space-y-2">
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
                </AccordionContent>
             </Card>
        </AccordionItem>
        
         <AccordionItem value="reports" className="border-b-0">
             <Card>
                <CardHeader>
                    <AccordionTrigger className="p-0 hover:no-underline">
                        <CardTitle className="flex items-center"><MessageSquareQuote className="mr-2" />Innstillinger for Ukesmelding</CardTitle>
                    </AccordionTrigger>
                    <CardDescription>Tilpass innholdet og teksten i den genererte ukesoppsummeringen.</CardDescription>
                </CardHeader>
                <AccordionContent asChild>
                    <CardContent className="space-y-4 pt-4">
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
                                    <Label htmlFor="report-tests" className="font-medium">Inkluder prøveresultater</Label>
                                    <Switch
                                        id="report-tests"
                                        checked={localSettings.reportSettings.includeTests}
                                        onCheckedChange={(checked) => handleReportSettingChange('includeTests', checked)}
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
                                <Separator />
                                 <div className="space-y-1">
                                    <Label htmlFor="positiveFeedbackMessage">Ros: Prikkfri uke</Label>
                                    <Textarea id="positiveFeedbackMessage" value={localSettings.reportSettings.positiveFeedbackMessage} onChange={(e) => handleReportSettingChange('positiveFeedbackMessage', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="positiveFeedbackHomework">Ros: Kun lekser</Label>
                                    <Textarea id="positiveFeedbackHomework" value={localSettings.reportSettings.positiveFeedbackHomework} onChange={(e) => handleReportSettingChange('positiveFeedbackHomework', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="positiveFeedbackIpad">Ros: Kun iPad</Label>
                                    <Textarea id="positiveFeedbackIpad" value={localSettings.reportSettings.positiveFeedbackIpad} onChange={(e) => handleReportSettingChange('positiveFeedbackIpad', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="positiveFeedbackBoth">Ros: Både lekser og iPad</Label>
                                    <Textarea id="positiveFeedbackBoth" value={localSettings.reportSettings.positiveFeedbackBoth} onChange={(e) => handleReportSettingChange('positiveFeedbackBoth', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </AccordionContent>
             </Card>
        </AccordionItem>
        
        <AccordionItem value="student-reports" className="border-b-0">
             <Card>
                <CardHeader>
                    <AccordionTrigger className="p-0 hover:no-underline">
                        <CardTitle className="flex items-center"><FileText className="mr-2" />Innstillinger for Elevrapport</CardTitle>
                    </AccordionTrigger>
                    <CardDescription>Velg hvilket innhold som skal inkluderes i den detaljerte elevrapporten.</CardDescription>
                </CardHeader>
                <AccordionContent asChild>
                    <CardContent className="space-y-2 pt-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="report-s-homework" className="font-medium">Inkluder lekser</Label>
                            <Switch
                                id="report-s-homework"
                                checked={localSettings.reportSettings.includeHomeworkInReport}
                                onCheckedChange={(checked) => handleReportSettingChange('includeHomeworkInReport', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="report-s-ipad" className="font-medium">Inkluder iPad-ansvar</Label>
                            <Switch
                                id="report-s-ipad"
                                checked={localSettings.reportSettings.includeIpadInReport}
                                onCheckedChange={(checked) => handleReportSettingChange('includeIpadInReport', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="report-s-hourly" className="font-medium">Inkluder innsats i timen</Label>
                            <Switch
                                id="report-s-hourly"
                                checked={localSettings.reportSettings.includeHourlyCheckInReport}
                                onCheckedChange={(checked) => handleReportSettingChange('includeHourlyCheckInReport', checked)}
                            />
                        </div>
                         <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="report-s-remarks" className="font-medium">Inkluder anmerkninger/logg</Label>
                            <Switch
                                id="report-s-remarks"
                                checked={localSettings.reportSettings.includeRemarksInReport}
                                onCheckedChange={(checked) => handleReportSettingChange('includeRemarksInReport', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="report-s-tests" className="font-medium">Inkluder prøveresultater</Label>
                            <Switch
                                id="report-s-tests"
                                checked={localSettings.reportSettings.includeTestsInReport}
                                onCheckedChange={(checked) => handleReportSettingChange('includeTestsInReport', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="report-s-goals" className="font-medium">Inkluder læringsmål</Label>
                            <Switch
                                id="report-s-goals"
                                checked={localSettings.reportSettings.includeLearningGoalsInReport}
                                onCheckedChange={(checked) => handleReportSettingChange('includeLearningGoalsInReport', checked)}
                            />
                        </div>
                    </CardContent>
                </AccordionContent>
             </Card>
        </AccordionItem>

        <AccordionItem value="database" className="border-b-0">
             <Card>
                <CardHeader>
                     <AccordionTrigger className="p-0 hover:no-underline">
                        <CardTitle className="flex items-center"><Database className="mr-2" />Database</CardTitle>
                    </AccordionTrigger>
                    <CardDescription>Handlinger for å administrere appens lokale data.</CardDescription>
                </CardHeader>
                <AccordionContent asChild>
                    <CardContent className="space-y-4 pt-4">
                        <div>
                            <h4 className="font-semibold">Backup og Gjenoppretting</h4>
                            <p className="mb-2 text-sm text-muted-foreground">
                                Last ned en backup-fil av all data, eller gjenopprett fra en tidligere backup.
                            </p>
                            <div className="flex gap-2">
                                <Button onClick={handleExport} variant="outline" className="w-full">
                                    <Download className="mr-2" /> Eksporter
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full">
                                            <Upload className="mr-2" /> Importer
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle><AlertTriangle className="inline-block mr-2 text-yellow-500" /> Overskrive all data?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Dette vil permanent slette all nåværende data i appen og erstatte den med innholdet fra backup-filen. Handlingen kan ikke angres.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => fileInputRef.current?.click()}>
                                                Ja, fortsett
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImport}
                                    className="hidden"
                                    accept=".json"
                                />
                            </div>
                        </div>
                        <Separator />
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
                </AccordionContent>
            </Card>
        </AccordionItem>
        
        <AccordionItem value="privacy" className="border-b-0">
             <Card>
                <CardHeader>
                     <AccordionTrigger className="p-0 hover:no-underline">
                        <CardTitle className="flex items-center"><ShieldCheck className="mr-2" />Sikkerhet & Personvern (ROS/DPIA)</CardTitle>
                    </AccordionTrigger>
                    <CardDescription>Dokumentasjon relatert til risiko- og sårbarhetsanalyse (ROS) og personvernkonsekvensvurdering (DPIA).</CardDescription>
                </CardHeader>
                <AccordionContent asChild>
                    <CardContent className="pt-4">
                        {localSettings.dpiaAnalysis ? (
                            <DPIA
                                analysis={localSettings.dpiaAnalysis}
                                onAnalysisChange={handleAnalysisChange}
                            />
                        ) : (
                            <p>Laster...</p>
                        )}
                    </CardContent>
                </AccordionContent>
            </Card>
        </AccordionItem>
    </Accordion>
  );
}

const GroupingRulesManager: React.FC<{students: Student[], appSettings: AppSettings, onAppSettingsChange: (settings: AppSettings) => void}> = ({ students, appSettings, onAppSettingsChange }) => {
    const [keepTogetherSelection, setKeepTogetherSelection] = React.useState<string[]>([]);
    const [keepApartStudent1, setKeepApartStudent1] = React.useState("");
    const [keepApartStudent2, setKeepApartStudent2] = React.useState("");
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
                    <Select value={keepApartStudent1} onValueChange={setKeepApartStudent1}>
                        <SelectTrigger><SelectValue placeholder="Elev 1" /></SelectTrigger>
                        <SelectContent>{students.filter(s => s.id !== keepApartStudent2).map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={keepApartStudent2} onValueChange={setKeepApartStudent2}>
                        <SelectTrigger><SelectValue placeholder="Elev 2" /></SelectTrigger>
                        <SelectContent>{students.filter(s => s.id !== keepApartStudent1).map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}</SelectContent>
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
