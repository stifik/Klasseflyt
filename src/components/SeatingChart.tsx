

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Student, SeatingChartRecord, SeatingLayout, AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Loader2, Users, Shuffle, Plus, X, Trash2, LayoutTemplate, Pin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Switch } from "./ui/switch";
import { db } from "@/lib/db";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

type SeatingChartData = (string[] | null)[][];
type AvoidPair = [string, string];
type PlacementRule = { studentName: string; placement: 'front' | 'back' };

interface SeatingChartProps {
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

// --- Draggable Components ---
interface DeskProps {
  studentName: string | null;
  id: string;
}
const DraggableStudent = ({ studentName, id }: DeskProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: { studentName },
  });
  const style = { transform: CSS.Translate.toString(transform) };
  if (!studentName) return null;

  const formattedName = studentName.replace(/ /g, '\n');

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(
        "flex items-center justify-center w-full h-full text-center bg-secondary touch-none cursor-grab rounded-lg p-1",
        isDragging && 'opacity-50'
    )}>
      <p className="text-xs font-medium whitespace-pre-line">{formattedName}</p>
    </div>
  );
};

const DroppableDesk = ({ id, children, isOver }: { id: string, children: React.ReactNode, isOver: boolean }) => {
    const { setNodeRef } = useDroppable({ id });
    const hasChild = React.Children.count(children) > 0 && React.Children.toArray(children).some(child => child !== null);
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "relative flex items-center justify-center h-full border rounded-lg transition-colors w-full aspect-square",
                isOver ? "bg-primary/10" : "bg-transparent",
                !hasChild ? "border-dashed" : ""
            )}
        >
            {children}
        </div>
    );
};


// --- Layout Designer Components ---
const LayoutDesigner = ({ onSave, onCancel }: { onSave: (layout: SeatingLayout) => void; onCancel: () => void; }) => {
    const [name, setName] = useState("");
    const [rows, setRows] = useState(6);
    const [cols, setCols] = useState(8);
    const [layout, setLayout] = useState<boolean[][]>(() => Array.from({ length: 6 }, () => Array(8).fill(false)));
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [isAdding, setIsAdding] = useState(true);
    const { toast } = useToast();

    const seatCount = useMemo(() => layout.flat().filter(Boolean).length, [layout]);

    const handleCellInteraction = (r: number, c: number) => {
        const newLayout = layout.map(row => [...row]);
        newLayout[r][c] = isAdding;
        setLayout(newLayout);
    };

    const handleMouseDown = (r: number, c: number) => {
        setIsMouseDown(true);
        setIsAdding(!layout[r][c]); 
        handleCellInteraction(r,c);
    };

    const handleMouseEnter = (r: number, c: number) => {
        if (isMouseDown) {
            handleCellInteraction(r, c);
        }
    };
    
    const handleGridSizeChange = (type: 'rows' | 'cols', value: number) => {
        const newRows = type === 'rows' ? value : rows;
        const newCols = type === 'cols' ? value : cols;
        setRows(newRows);
        setCols(newCols);
        
        const newLayout = Array.from({ length: newRows }, () => Array(newCols).fill(false));
        setLayout(newLayout);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: "Navn mangler", description: "Vennligst gi layouten et navn.", variant: "destructive" });
            return;
        }
        if (seatCount === 0) {
            toast({ title: "Ingen pulter", description: "Du må legge til minst én pult.", variant: "destructive" });
            return;
        }
        
        const newLayoutData = { name, rows, cols, layout, seatCount, createdAt: new Date() };
        try {
            const newId = await db.seatingLayouts.add(newLayoutData as Omit<SeatingLayout, 'id'>);
            const savedLayout = { ...newLayoutData, id: newId as string };
            toast({ title: "Layout lagret", description: `"${name}" er lagret.`});
            onSave(savedLayout);
        } catch (error) {
            console.error(error);
            toast({ title: "Feil", description: "Kunne ikke lagre layout.", variant: "destructive" });
        }
    };

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Design Klasserom-layout</DialogTitle>
                <DialogDescription>Klikk eller dra i rutenettet for å definere hvor pultene skal stå. Gi layouten et navn og lagre.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-4">
                     <Input placeholder="Navn på layout (f.eks. 'Standard U-form')" value={name} onChange={(e) => setName(e.target.value)} />
                     <div className="grid grid-cols-2 gap-2">
                         <Label htmlFor="layout-rows" className="sr-only">Rader</Label>
                         <Input id="layout-rows" type="number" value={rows} onChange={e => handleGridSizeChange('rows', parseInt(e.target.value) || 1)} min="1" max="15" />
                         <Label htmlFor="layout-cols" className="sr-only">Kolonner</Label>
                         <Input id="layout-cols" type="number" value={cols} onChange={e => handleGridSizeChange('cols', parseInt(e.target.value) || 1)} min="1" max="15" />
                     </div>
                     <p className="text-sm font-medium">Antall sitteplasser: {seatCount}</p>
                     <div className="p-2 border rounded-md bg-muted text-muted-foreground text-xs">
                        Tips: Klikk for å bytte en rute. Hold inne og dra for å "male" flere ruter.
                     </div>
                </div>
                <div className="md:col-span-2 overflow-auto" onMouseUp={() => setIsMouseDown(false)} onMouseLeave={() => setIsMouseDown(false)}>
                    <div className="grid gap-1 p-2 border rounded-lg bg-background" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                        {layout.map((row, r) => row.map((isDesk, c) => (
                            <div
                                key={`${r}-${c}`}
                                className={cn("w-full aspect-square rounded cursor-pointer", isDesk ? 'bg-primary' : 'bg-secondary')}
                                onMouseDown={() => handleMouseDown(r, c)}
                                onMouseEnter={() => handleMouseEnter(r, c)}
                            />
                        )))}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline" onClick={onCancel}>Avbryt</Button>
                </DialogClose>
                <Button onClick={handleSave}>Lagre Layout</Button>
            </DialogFooter>
        </DialogContent>
    );
};

// --- Helper Functions ---
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- Main Component ---
export default function SeatingChart({ students, seatingChart, onSeatingChartChange, history, appSettings, onLayoutsChange, layouts, activeLayout: propActiveLayout }: SeatingChartProps) {
    const [localSeatingChart, setLocalSeatingChart] = useState<SeatingChartData | null>(seatingChart);
    const [unplacedStudents, setUnplacedStudents] = useState<string[]>([]);
    
    const [avoidPairs, setAvoidPairs] = useState<AvoidPair[]>([]);
    const [placementRules, setPlacementRules] = useState<PlacementRule[]>([]);
    
    const [avoidSameNeighbors, setAvoidSameNeighbors] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    const [selectedStudent1, setSelectedStudent1] = useState<string>("");
    const [selectedStudent2, setSelectedStudent2] = useState<string>("");
    const [selectedStudentForRule, setSelectedStudentForRule] = useState<string>("");
    const [selectedPlacement, setSelectedPlacement] = useState<'front' | 'back'>('front');
    const [isDesignerOpen, setIsDesignerOpen] = useState(false);
    
    const { toast } = useToast();
    
    const activeLayout = useMemo(() => layouts.find(l => l.id === appSettings.selectedSeatingLayoutId), [layouts, appSettings.selectedSeatingLayoutId]);
    const lastChart = history[0] ? JSON.parse(history[0].chartJson) : null;
    const lockedDesks = useMemo(() => new Set(activeLayout?.lockedDesks || []), [activeLayout]);


    useEffect(() => {
        setLocalSeatingChart(seatingChart);
        if (seatingChart && activeLayout) {
            const placedStudents = new Set(seatingChart.flat().filter(Boolean).flat());
            const allStudentNames = new Set(students.map(s => s.name));
            const newUnplaced = Array.from(allStudentNames).filter(name => !placedStudents.has(name));
            setUnplacedStudents(newUnplaced);
        } else if (!seatingChart && students.length > 0) {
            setUnplacedStudents(students.map(s => s.name));
        }
    }, [seatingChart, students, activeLayout]);

    const handleSelectedLayoutChange = (layoutId: string) => {
        onAppSettingsChange({ ...appSettings, selectedSeatingLayoutId: layoutId });
    };

    const handleAddAvoidPair = () => {
        if (selectedStudent1 && selectedStudent2 && selectedStudent1 !== selectedStudent2) {
            const newPair: AvoidPair = [selectedStudent1, selectedStudent2].sort() as AvoidPair;
            if (!avoidPairs.some(p => p[0] === newPair[0] && p[1] === newPair[1])) {
                setAvoidPairs([...avoidPairs, newPair]);
            }
            setSelectedStudent1("");
            setSelectedStudent2("");
        }
    };

    const handleRemoveAvoidPair = (pairToRemove: AvoidPair) => {
        setAvoidPairs(avoidPairs.filter(p => p[0] !== pairToRemove[0] || p[1] !== pairToRemove[1]));
    };

    const handleAddPlacementRule = () => {
        if (selectedStudentForRule) {
            const newRules = placementRules.filter(r => r.studentName !== selectedStudentForRule);
            setPlacementRules([...newRules, { studentName: selectedStudentForRule, placement: selectedPlacement }]);
            setSelectedStudentForRule("");
        }
    };

    const handleRemovePlacementRule = (studentNameToRemove: string) => {
        setPlacementRules(placementRules.filter(r => r.studentName !== studentNameToRemove));
    };

    const getNeighbors = (r: number, c: number, chart: SeatingChartData): string[] => {
        const neighbors: string[] = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < chart.length && nc >= 0 && nc < chart[0].length && chart[nr][nc]?.[0]) {
                neighbors.push(chart[nr][nc]![0]);
            }
        }
        return neighbors;
    };

    const generateChartWithLogic = (): SeatingChartData | null => {
        if (!activeLayout) {
            toast({ title: "Ingen layout valgt", description: "Velg en klasserom-layout før du genererer.", variant: "destructive" });
            return null;
        }

        const { layout, rows, cols } = activeLayout;
        const newChart: SeatingChartData = JSON.parse(JSON.stringify(layout)).map((row: boolean[]) => row.map(isDesk => isDesk ? [] : null));
        
        const lockedStudents = new Map<string, string>(); // "rowIndex-colIndex" -> studentName
        lockedDesks.forEach(deskId => {
            const [r, c] = deskId.split('-').map(Number);
            const studentName = localSeatingChart?.[r]?.[c]?.[0];
            if (studentName && newChart[r]?.[c]) {
                lockedStudents.set(deskId, studentName);
                newChart[r][c] = [studentName];
            }
        });

        const studentsToPlace = students.map(s => s.name).filter(name => ![...lockedStudents.values()].includes(name));
        const shuffledStudents = shuffleArray(studentsToPlace);

        let studentIndex = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (newChart[r]?.[c]?.length === 0 && studentIndex < shuffledStudents.length) {
                    newChart[r][c] = [shuffledStudents[studentIndex]];
                    studentIndex++;
                }
            }
        }
        
        return newChart;
    };
    
    const handleGenerateClick = async () => {
        setIsGenerating(true);
        // Clear local chart briefly to show loader
        setLocalSeatingChart(null);
        // Timeout to allow UI to update
        setTimeout(() => {
            try {
                const newChart = generateChartWithLogic();
                if (newChart) {
                    onSeatingChartChange(newChart, 'generation');
                }
            } catch (error) {
                console.error(error);
                toast({ title: "Feil", description: "Kunne ikke generere klassekart.", variant: "destructive" });
            } finally {
                setIsGenerating(false);
            }
        }, 50);
    };
    
    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id.toString());
    };
    
    const handleDragOver = (event: DragOverEvent) => {
        setOverId(event.over?.id.toString() || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        setOverId(null);
        const { active, over } = event;

        if (!over || !localSeatingChart) return;
        if (active.id === over.id) return;

        const newChart = JSON.parse(JSON.stringify(localSeatingChart));
        const activeId = active.id.toString();
        const overId = over.id.toString();

        let activeStudent: string | null = null;
        let startRow: number | null = null;
        let startCol: number | null = null;

        // Find where the active student is coming from
        if (activeId.startsWith('unplaced-')) {
            activeStudent = active.data.current?.studentName;
        } else if (activeId.startsWith('desk-')) {
            [ , startRow, startCol ] = activeId.split('-').map(Number);
            activeStudent = newChart[startRow][startCol]?.[0] || null;
        }
        
        if (!activeStudent) return;

        // Handle dropping back into unplaced area
        if (overId === 'unplaced-area') {
            if (startRow !== null && startCol !== null) { 
                newChart[startRow][startCol] = [];
                setUnplacedStudents(prev => [...prev, activeStudent!].sort());
                onSeatingChartChange(newChart, 'drag');
            }
            return;
        }

        // Handle dropping onto a desk
        if (overId.startsWith('desk-')) {
            const [ , endRow, endCol ] = overId.split('-').map(Number);
            
            if(newChart[endRow][endCol] === null) return; // Not a valid desk

            const overStudent = newChart[endRow][endCol]?.[0] || null;

            // Place the active student in the new spot
            newChart[endRow][endCol] = [activeStudent];

            // Handle the student that was in the "over" spot
            if (startRow !== null && startCol !== null) { 
                // This was a desk-to-desk swap
                newChart[startRow][startCol] = overStudent ? [overStudent] : [];
            } else { 
                // This was an unplaced-to-desk move
                setUnplacedStudents(prev => {
                    const next = prev.filter(s => s !== activeStudent);
                    if (overStudent) {
                        next.push(overStudent);
                    }
                    return next.sort();
                });
            }
            onSeatingChartChange(newChart, 'drag');
        }
    };

    const handleLayoutSaved = (newLayout: SeatingLayout) => {
        onLayoutsChange([...layouts, newLayout]);
        handleSelectedLayoutChange(newLayout.id);
        setIsDesignerOpen(false);
    }

    const handleDeleteLayout = async (id: string) => {
        await db.seatingLayouts.delete(id);
        if (appSettings.selectedSeatingLayoutId === id) {
            handleSelectedLayoutChange('');
        }
        onLayoutsChange(layouts.filter(l => l.id !== id));
        toast({ title: "Layout slettet", variant: "destructive" });
    };
    
    const draggedStudentName = useMemo(() => {
        if (!activeDragId) return null;
        if (activeDragId.startsWith('unplaced-')) {
            return activeDragId.substring('unplaced-'.length);
        }
        if (activeDragId.startsWith('desk-') && localSeatingChart) {
            const [, r, c] = activeDragId.split('-').map(Number);
            return localSeatingChart[r]?.[c]?.[0] || null;
        }
        return null;
    }, [activeDragId, localSeatingChart]);
    
    const toggleLock = (rowIndex: number, colIndex: number) => {
        if (!activeLayout) return;

        const deskId = `${rowIndex}-${colIndex}`;
        const currentLocked = activeLayout.lockedDesks || [];
        const isLocked = currentLocked.includes(deskId);

        const newLockedDesks = isLocked
            ? currentLocked.filter(id => id !== deskId)
            : [...currentLocked, deskId];

        const updatedLayout = { ...activeLayout, lockedDesks: newLockedDesks };
        
        db.seatingLayouts.update(activeLayout.id!, { lockedDesks: newLockedDesks }).then(() => {
            const layoutIndex = layouts.findIndex(l => l.id === activeLayout.id);
            if (layoutIndex !== -1) {
                const newLayouts = [...layouts];
                newLayouts[layoutIndex] = updatedLayout;
                onLayoutsChange(newLayouts);
            }
        });
    };


    return (
        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Generer Klassekart</CardTitle>
                        <CardDescription>Bruk den valgte layouten og reglene til å generere et nytt, tilfeldig klassekart.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleGenerateClick} disabled={isGenerating || !activeLayout} className="w-full">
                            {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Shuffle className="mr-2" />}
                            {seatingChart ? 'Generer nytt klassekart' : 'Generer klassekart'}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Innstillinger for generering</CardTitle>
                        <CardDescription>Legg til regler for å tilpasse plasseringen.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="avoid-neighbors" className="font-medium">Unngå tidligere naboer</Label>
                            <Switch id="avoid-neighbors" checked={avoidSameNeighbors} onCheckedChange={setAvoidSameNeighbors} />
                        </div>
                        <div>
                            <Label>Unngå par</Label>
                            <div className="flex gap-2 mt-1">
                                <Select value={selectedStudent1} onValueChange={setSelectedStudent1}>
                                    <SelectTrigger><SelectValue placeholder="Elev 1" /></SelectTrigger>
                                    <SelectContent>{students.filter(s => s.name !== selectedStudent2).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={selectedStudent2} onValueChange={setSelectedStudent2}>
                                    <SelectTrigger><SelectValue placeholder="Elev 2" /></SelectTrigger>
                                    <SelectContent>{students.filter(s => s.name !== selectedStudent1).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Button onClick={handleAddAvoidPair} size="icon"><Plus /></Button>
                            </div>
                        </div>
                        {avoidPairs.length > 0 && (
                            <div className="space-y-2">
                                {avoidPairs.map((pair, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 text-sm rounded-md bg-secondary">
                                        <span>{pair.join(' og ')}</span>
                                        <Button size="icon" variant="ghost" onClick={() => handleRemoveAvoidPair(pair)}><X className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div>
                            <Label>Plasseringsregler</Label>
                            <div className="flex gap-2 mt-1">
                                <Select value={selectedStudentForRule} onValueChange={setSelectedStudentForRule}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Velg elev..." /></SelectTrigger>
                                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={selectedPlacement} onValueChange={(v) => setSelectedPlacement(v as 'front' | 'back')}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="front">Må sitte foran</SelectItem>
                                        <SelectItem value="back">Må sitte bakerst</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleAddPlacementRule} size="icon"><Plus /></Button>
                            </div>
                        </div>
                        {placementRules.length > 0 && (
                            <div className="space-y-2">
                                {placementRules.map((rule, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 text-sm rounded-md bg-secondary">
                                        <span className="flex items-center gap-2"><Pin className="w-4 h-4" /> {rule.studentName} ({rule.placement === 'front' ? 'Foran' : 'Bakerst'})</span>
                                        <Button size="icon" variant="ghost" onClick={() => handleRemovePlacementRule(rule.studentName)}><X className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                 <Dialog open={isDesignerOpen} onOpenChange={setIsDesignerOpen}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Klasserom-layout</CardTitle>
                            <CardDescription>Velg en mal for klasserommet, eller design din egen.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Select value={appSettings.selectedSeatingLayoutId || ""} onValueChange={handleSelectedLayoutChange}>
                                    <SelectTrigger><SelectValue placeholder="Velg layout..." /></SelectTrigger>
                                    <SelectContent>
                                        {layouts.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.seatCount} plasser)</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {appSettings.selectedSeatingLayoutId && <Button size="icon" variant="ghost" onClick={() => handleDeleteLayout(appSettings.selectedSeatingLayoutId as string)}><Trash2 className="text-destructive" /></Button>}
                            </div>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full"><LayoutTemplate className="mr-2" />Design Ny Layout</Button>
                            </DialogTrigger>
                        </CardContent>
                    </Card>
                    <LayoutDesigner onSave={handleLayoutSaved} onCancel={() => setIsDesignerOpen(false)} />
                </Dialog>
            </div>

            <div className="md:col-span-2">
                <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                    <Card className="min-h-[600px]">
                        <CardHeader>
                            <CardTitle>{activeLayout?.name || "Klassekart"}</CardTitle>
                            <CardDescription>
                                {seatingChart ? "Dra og slipp elever for å bytte plass. Bruk tegnestiften for å låse en elev til en pult." : "Resultatet av genereringen vil vises her."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isGenerating && <div className="flex items-center justify-center h-96"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}
                            
                            {!isGenerating && activeLayout && (
                                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                    <div className="p-4" style={{ minWidth: `${activeLayout.cols * 7}rem` }}>
                                        <div className="grid gap-2 w-full" style={{ 
                                            gridTemplateColumns: `repeat(${activeLayout.cols}, minmax(0, 1fr))`,
                                        }}>
                                            {Array.from({ length: activeLayout.rows }).map((_, rowIndex) => (
                                                <React.Fragment key={rowIndex}>
                                                {Array.from({ length: activeLayout.cols }).map((_, colIndex) => {
                                                    const id = `desk-${rowIndex}-${colIndex}`;
                                                    if (activeLayout.layout[rowIndex]?.[colIndex]) {
                                                        const studentName = localSeatingChart?.[rowIndex]?.[colIndex]?.[0] || null;
                                                        const isLocked = lockedDesks.has(`${rowIndex}-${colIndex}`);
                                                        return (
                                                            <DroppableDesk key={id} id={id} isOver={overId === id}>
                                                                {studentName && activeDragId !== id && <DraggableStudent id={id} studentName={studentName} />}
                                                                {studentName && (
                                                                    <button 
                                                                        onClick={() => toggleLock(rowIndex, colIndex)}
                                                                        className={cn(
                                                                            "absolute top-1 right-1 p-0.5 rounded-full",
                                                                            "bg-background/50 hover:bg-background",
                                                                            {"opacity-100": isLocked, "opacity-20 hover:opacity-100 focus:opacity-100": !isLocked}
                                                                        )}
                                                                        aria-label={isLocked ? "Lås opp pult" : "Lås pult"}
                                                                    >
                                                                        <Pin className={cn("w-3 h-3 text-gray-500", {"text-primary": isLocked})} />
                                                                    </button>
                                                                )}
                                                            </DroppableDesk>
                                                        );
                                                    }
                                                    return <div key={id} />;
                                                })}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            )}
                             {unplacedStudents.length > 0 && (
                                <div className="mt-4">
                                    <DroppableDesk id="unplaced-area" isOver={overId === 'unplaced-area'}>
                                        <div className="p-4 w-full">
                                            <h4 className="font-semibold mb-2 text-sm">Uplasserte elever</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {unplacedStudents.map(studentName => (
                                                    <div key={`unplaced-${studentName}`} className="w-24 h-16">
                                                        <DraggableStudent id={`unplaced-${studentName}`} studentName={studentName} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </DroppableDesk>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <DragOverlay>
                        {activeDragId && draggedStudentName ? (
                            <div className="flex items-center justify-center h-16 text-center bg-secondary cursor-grabbing rounded-lg shadow-lg p-1 w-24">
                                <p className="text-xs font-medium whitespace-pre-line break-all">{draggedStudentName.replace(/ /g, '\n')}</p>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}

    







