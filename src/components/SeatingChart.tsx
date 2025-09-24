
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Student, SeatingChartRecord, SeatingLayout, AppSettings, PlacementRule, AvoidPair, LockedDesk } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Shuffle, Plus, X, Trash2, Save, Info, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";


type SeatingChartData = (string[] | null)[][];


interface SeatingChartProps {
  students: Student[];
  seatingChart: SeatingChartData | null;
  onSeatingChartChange: (chart: SeatingChartData | null, source: 'generation' | 'drag' | 'load') => void;
  history: SeatingChartRecord[];
  appSettings: AppSettings;
  onAppSettingsChange: (newSettings: AppSettings) => void;
  activeLayout: SeatingLayout | null | undefined;
}


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
  
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(
        "flex items-center justify-center h-full w-full text-center bg-secondary touch-none cursor-grab rounded-lg p-1",
        isDragging && 'opacity-50'
    )}>
      <p className="text-xs font-medium whitespace-normal">{studentName}</p>
    </div>
  );
};

const DroppableDesk = ({ id, children, isOver, isLocked, onLockToggle }: { id: string, children: React.ReactNode, isOver: boolean, isLocked: boolean, onLockToggle: () => void }) => {
    const { setNodeRef } = useDroppable({ id });
    const hasChild = React.Children.count(children) > 0 && React.Children.toArray(children).some(child => child !== null);
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "relative flex items-center justify-center border rounded-lg transition-colors w-full h-16",
                isOver ? "bg-primary/10" : "bg-transparent",
                !hasChild ? "border-dashed border-slate-300 dark:border-slate-700" : "border-border"
            )}
        >
            {children}
            {hasChild && (
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-0 left-0 w-6 h-6"
                    onClick={onLockToggle}
                >
                    {isLocked 
                      ? <Lock className="w-4 h-4 text-primary" /> 
                      : <Unlock className="w-4 h-4 text-muted-foreground" />}
                </Button>
            )}
        </div>
    );
};

const UnplacedArea = ({ id, children, isOver }: { id: string; children: React.ReactNode; isOver: boolean }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full rounded-lg border p-4 transition-colors",
        isOver ? "bg-primary/10" : "bg-transparent"
      )}
    >
      {children}
    </div>
  );
};

// Helper Functions
const calculateUnplacedStudents = (currentChart: SeatingChartData | null, allStudents: Student[]) => {
    if (!currentChart) return allStudents.map(s => s.name);
    const placedStudents = new Set(currentChart.flat().filter(Boolean).flat());
    return allStudents.map(s => s.name).filter(name => !placedStudents.has(name));
};


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
        
        const newLayoutData = { name: name.trim(), rows, cols, layout, seatCount, createdAt: new Date(), lockedDesks: [] };
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
        <DialogContent className="max-w-4xl flex flex-col max-h-[90svh]">
            <DialogHeader>
                <DialogTitle>Design Klasserom-layout</DialogTitle>
                <DialogDescription>Klikk eller dra i rutenettet for å definere hvor pultene skal stå. Gi layouten et navn og lagre.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-3 overflow-y-auto pr-4">
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
                <div className="md:col-span-2" onMouseUp={() => setIsMouseDown(false)} onMouseLeave={() => setIsMouseDown(false)}>
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
            <DialogFooter className="pt-4 border-t">
                <DialogClose asChild>
                    <Button variant="outline" onClick={onCancel}>Avbryt</Button>
                </DialogClose>
                <Button onClick={handleSave}>Lagre Layout</Button>
            </DialogFooter>
        </DialogContent>
    );
};

const CreateLayoutDialog = ({ onLayoutCreate }: { onLayoutCreate: (layout: SeatingLayout) => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = (layout: SeatingLayout) => {
    onLayoutCreate(layout);
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="mr-2" /> Lag ny layout
        </Button>
      </DialogTrigger>
      {isOpen && <LayoutDesigner onSave={handleSave} onCancel={() => setIsOpen(false)} />}
    </Dialog>
  );
};


// Main Component
export default function SeatingChart({ students, seatingChart, onSeatingChartChange, history, appSettings, onAppSettingsChange, activeLayout: activeLayoutFromProps }: SeatingChartProps) {
  const [localSeatingChart, setLocalSeatingChart] = useState<SeatingChartData | null>(seatingChart);
  const [unplacedStudents, setUnplacedStudents] = useState<string[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const [selectedStudent1, setSelectedStudent1] = useState<string>("");
  const [selectedStudent2, setSelectedStudent2] = useState<string>("");
  const [selectedStudentForRule, setSelectedStudentForRule] = useState<string>("");
  const [selectedPlacement, setSelectedPlacement] = useState<'front' | 'back'>('front');
  
  const [localActiveLayout, setLocalActiveLayout] = useState<SeatingLayout | null | undefined>(activeLayoutFromProps);

  const { toast } = useToast();

  const layouts = useLiveQuery(() => db.seatingLayouts.toArray(), []);
  
  useEffect(() => {
    setLocalActiveLayout(activeLayoutFromProps);
  }, [activeLayoutFromProps]);
  
  const activeLayout = localActiveLayout;

  const avoidPairs = appSettings.seatingChartRules?.avoidPairs || [];
  const placementRules = appSettings.seatingChartRules?.placementRules || [];

  const lastChart = history[0] ? JSON.parse(history[0].chartJson) : null;

  useEffect(() => {
    const newUnplaced = calculateUnplacedStudents(seatingChart, students);
    setLocalSeatingChart(seatingChart);
    setUnplacedStudents(newUnplaced);
  }, [seatingChart, students]);
  
  
  const handleRuleChange = (newRules: Partial<AppSettings['seatingChartRules']>) => {
      onAppSettingsChange({
          ...appSettings,
          seatingChartRules: {
              ...(appSettings.seatingChartRules || { avoidPairs: [], placementRules: [], avoidSameNeighbors: true }),
              ...newRules
          }
      });
  }

  const handleAddAvoidPair = () => {
    if (selectedStudent1 && selectedStudent2 && selectedStudent1 !== selectedStudent2) {
      const newPair: AvoidPair = [selectedStudent1, selectedStudent2].sort() as AvoidPair;
      if (!avoidPairs.some(p => p[0] === newPair[0] && p[1] === newPair[1])) {
        handleRuleChange({ avoidPairs: [...avoidPairs, newPair] });
      }
      setSelectedStudent1("");
      setSelectedStudent2("");
    }
  };

  const handleRemoveAvoidPair = (pairToRemove: AvoidPair) => {
    const newAvoidPairs = avoidPairs.filter(p => p[0] !== pairToRemove[0] || p[1] !== pairToRemove[1]);
    handleRuleChange({ avoidPairs: newAvoidPairs });
  };

  const handleAddPlacementRule = () => {
    if (selectedStudentForRule) {
      const newRules = placementRules.filter(r => r.studentName !== selectedStudentForRule);
      handleRuleChange({ placementRules: [...newRules, { studentName: selectedStudentForRule, placement: selectedPlacement }] });
      setSelectedStudentForRule("");
    }
  };

  const handleRemovePlacementRule = (studentNameToRemove: string) => {
    const newPlacementRules = placementRules.filter(r => r.studentName !== studentNameToRemove);
    handleRuleChange({ placementRules: newPlacementRules });
  };
  
  const handleLockToggle = (rowIndex: number, colIndex: number) => {
    if (!activeLayout || !localSeatingChart) return;
    const deskId = `${rowIndex}-${colIndex}`;
    const studentName = localSeatingChart[rowIndex]?.[colIndex]?.[0];
    if (!studentName) return;

    const currentLockedDesks = activeLayout.lockedDesks || [];
    const isCurrentlyLocked = currentLockedDesks.some(d => d.deskId === deskId);

    let newLockedDesks: LockedDesk[];
    if (isCurrentlyLocked) {
        newLockedDesks = currentLockedDesks.filter(d => d.deskId !== deskId);
    } else {
        const otherLocksForStudentRemoved = currentLockedDesks.filter(d => d.studentName !== studentName);
        newLockedDesks = [...otherLocksForStudentRemoved, { deskId, studentName }];
    }
    
    // Optimistic UI update
    const updatedLayout = { ...activeLayout, lockedDesks: newLockedDesks };
    setLocalActiveLayout(updatedLayout);
    
    // Update DB in the background
    db.seatingLayouts.update(activeLayout.id!, { lockedDesks: newLockedDesks }).catch(error => {
        console.error("Failed to update locked desks:", error);
        toast({ title: "Feil", description: "Kunne ikke oppdatere låst pult.", variant: "destructive" });
        // Revert on failure
        setLocalActiveLayout(activeLayout);
    });
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
  
 const generateChartWithLogic = (): SeatingChartData => {
    if (!activeLayout) return [];

    let attempts = 0;
    const maxAttempts = 50;
    const avoidSameNeighbors = appSettings.seatingChartRules?.avoidSameNeighbors ?? true;
    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
    const lockedDesks = activeLayout.lockedDesks || [];
    const newChart: SeatingChartData = Array(activeLayout.rows).fill(null).map(() => Array(activeLayout.cols).fill(null).map(() => []));

    while (attempts < maxAttempts) {
        let isValid = true;
        // Reset chart for each attempt, but keep locked students
        for(let r=0; r < activeLayout.rows; r++) {
            for(let c=0; c < activeLayout.cols; c++) {
                newChart[r][c] = [];
            }
        }
        
        // 1. Place locked students first
        const lockedStudentNames = new Set<string>();
        lockedDesks.forEach(lock => {
            const [r, c] = lock.deskId.split('-').map(Number);
            if (activeLayout.layout[r]?.[c]) {
                newChart[r][c] = [lock.studentName];
                lockedStudentNames.add(lock.studentName);
            }
        });
        
        // 2. Categorize remaining students based on rules
        const remainingStudents = students.map(s => s.name).filter(name => !lockedStudentNames.has(name));
        const frontStudentNames = new Set(placementRules.filter(r => r.placement === 'front').map(r => r.studentName));
        const backStudentNames = new Set(placementRules.filter(r => r.placement === 'back').map(r => r.studentName));

        let frontStudents = shuffle(remainingStudents.filter(name => frontStudentNames.has(name)));
        let backStudents = shuffle(remainingStudents.filter(name => backStudentNames.has(name)));
        let otherStudents = shuffle(remainingStudents.filter(name => !frontStudentNames.has(name) && !backStudentNames.has(name)));
        
        // 3. Robustly categorize available desks
        let firstDeskRow = -1, lastDeskRow = -1;
        for (let r = 0; r < activeLayout.rows; r++) {
            if (activeLayout.layout[r].some(isDesk => isDesk)) {
                if (firstDeskRow === -1) firstDeskRow = r;
                lastDeskRow = r;
            }
        }
        
        const frontDesks: {r: number, c: number}[] = [], backDesks: {r: number, c: number}[] = [], middleDesks: {r: number, c: number}[] = [];
        if (firstDeskRow !== -1 && lastDeskRow !== -1) {
            for (let r = 0; r < activeLayout.rows; r++) {
                for (let c = 0; c < activeLayout.cols; c++) {
                    if (activeLayout.layout[r][c] && newChart[r][c]?.length === 0) { // Check if desk is available
                        if (r === firstDeskRow) frontDesks.push({ r, c });
                        else if (r === lastDeskRow) backDesks.push({ r, c });
                        else middleDesks.push({ r, c });
                    }
                }
            }
        }

        let shuffledFrontDesks = shuffle(frontDesks);
        let shuffledBackDesks = shuffle(backDesks);
        let shuffledMiddleDesks = shuffle(middleDesks);

        // 4. Place students with rules
        frontStudents.forEach(student => {
            const desk = shuffledFrontDesks.pop() || shuffledMiddleDesks.pop() || shuffledBackDesks.pop();
            if (desk) newChart[desk.r][desk.c] = [student];
            else otherStudents.push(student);
        });
        backStudents.forEach(student => {
            const desk = shuffledBackDesks.pop() || shuffledMiddleDesks.pop() || shuffledFrontDesks.pop();
            if (desk) newChart[desk.r][desk.c] = [student];
            else otherStudents.push(student);
        });

        // 5. Place remaining students in all remaining available desks
        let availableDesks = shuffle([...shuffledFrontDesks, ...shuffledMiddleDesks, ...shuffledBackDesks]);
        shuffle(otherStudents).forEach(student => {
            const desk = availableDesks.pop();
            if (desk) newChart[desk.r][desk.c] = [student];
        });
        
        // 6. Validate other rules
        for (let r = 0; r < activeLayout.rows; r++) {
            for (let c = 0; c < activeLayout.cols; c++) {
                 const student = newChart[r][c]?.[0];
                 if (!student) continue;

                 const neighbors = getNeighbors(r, c, newChart);

                 if (avoidSameNeighbors && lastChart) {
                    const lastNeighbors = getNeighbors(r, c, lastChart);
                    if (lastNeighbors.includes(student)) {
                        isValid = false; break;
                    }
                 }
                 
                 for (const pair of avoidPairs) {
                    if ((student === pair[0] && neighbors.includes(pair[1])) || (student === pair[1] && neighbors.includes(pair[0]))) {
                        isValid = false; break;
                    }
                 }
            }
            if (!isValid) break;
        }

        if (isValid) return newChart;
        attempts++;
    }

    toast({ title: "Kunne ikke oppfylle alle regler", description: "Genererer et kart uten alle regler.", variant: "destructive" });
    const finalShuffled = students.map(s => s.name).filter(name => !new Set(lockedDesks.map(d => d.studentName)).has(name)).sort(() => Math.random() - 0.5);
    const finalChart: SeatingChartData = JSON.parse(JSON.stringify(newChart)); // Start with locked students
    let finalIndex = 0;
    for (let r = 0; r < activeLayout.rows; r++) {
      for (let c = 0; c < activeLayout.cols; c++) {
        if (activeLayout.layout[r][c] && finalChart[r][c]?.length === 0 && finalIndex < finalShuffled.length) {
          finalChart[r][c] = [finalShuffled[finalIndex]];
          finalIndex++;
        }
      }
    }
    return finalChart;
  };

  const handleGenerateClick = () => {
    setIsGenerating(true);
    setLocalSeatingChart(null);
    setTimeout(() => {
        const newChart = generateChartWithLogic();
        onSeatingChartChange(newChart, 'generation');
        setUnplacedStudents(calculateUnplacedStudents(newChart, students));
        setIsGenerating(false);
    }, 50);
  };

   const handleClearChart = () => {
        if (!activeLayout) return;
        const emptyChart: SeatingChartData = Array(activeLayout.rows).fill(null).map(() => Array(activeLayout.cols).fill(null).map(() => []));
        onSeatingChartChange(emptyChart, 'generation');
        setUnplacedStudents(students.map(s => s.name).sort());
        toast({ title: "Kart tømt", description: "Alle elever er flyttet til uplassert-listen." });
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
    
    if (activeId.startsWith('unplaced-')) {
        activeStudent = activeId.substring('unplaced-'.length);
    } else if (activeId.startsWith('desk-')) {
        [ , startRow, startCol ] = activeId.split('-').map(Number);
        activeStudent = newChart[startRow][startCol]?.[0] || null;
    }
    
    if (!activeStudent) return;

    if (overId === 'unplaced-area') {
        if (startRow !== null && startCol !== null) { 
            newChart[startRow][startCol] = [];
            setUnplacedStudents(prev => [...prev, activeStudent!].sort());
            onSeatingChartChange(newChart, 'drag');
        }
        return;
    }

    if (overId.startsWith('desk-')) {
        const [ , endRow, endCol ] = overId.split('-').map(Number);
        const overStudent = newChart[endRow][endCol]?.[0] || null;

        newChart[endRow][endCol] = [activeStudent];

        if (startRow !== null && startCol !== null) { 
            newChart[startRow][startCol] = overStudent ? [overStudent] : [];
        } else { 
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

  // Layout Management
  const handleCreateLayout = (newLayout: SeatingLayout) => {
    // This is optimistic UI. The parent component will receive the real update from the DB.
  };

  const handleDeleteLayout = async (id: string) => {
    await db.seatingLayouts.delete(id);
    if (appSettings.selectedSeatingLayoutId === id) {
        onAppSettingsChange({ ...appSettings, selectedSeatingLayoutId: null });
    }
  };


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-4">
        <Card>
            <CardHeader>
                <CardTitle>Generer Klassekart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleGenerateClick} disabled={isGenerating || !activeLayout} className="w-full">
                    {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Shuffle className="mr-2" />}
                    {seatingChart ? 'Generer nytt' : 'Generer'}
                </Button>
                <Button onClick={handleClearChart} disabled={!seatingChart || !activeLayout} variant="outline" className="w-full">
                    Tøm kart
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Regler</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor="avoid-neighbors">Unngå tidligere naboer</Label>
                    <Switch 
                      id="avoid-neighbors" 
                      checked={appSettings.seatingChartRules?.avoidSameNeighbors ?? true} 
                      onCheckedChange={(checked) => handleRuleChange({ avoidSameNeighbors: checked })}
                    />
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
                      {avoidPairs.length > 0 && (
                        <div className="space-y-2 mt-2">
                            {avoidPairs.map((pair, index) => (
                                <div key={index} className="flex items-center justify-between p-2 text-sm rounded-md bg-secondary">
                                    <span>{pair.join(' og ')}</span>
                                    <Button size="icon" variant="ghost" onClick={() => handleRemoveAvoidPair(pair)}><X className="w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                  <div>
                    <Label>Plassering</Label>
                    <div className="flex gap-2 mt-1">
                        <Select value={selectedStudentForRule} onValueChange={setSelectedStudentForRule}>
                            <SelectTrigger><SelectValue placeholder="Elev" /></SelectTrigger>
                            <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                          <Select value={selectedPlacement} onValueChange={(v) => setSelectedPlacement(v as 'front' | 'back')}>
                            <SelectTrigger><SelectValue placeholder="Plassering" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="front">Foran</SelectItem>
                                <SelectItem value="back">Bak</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={handleAddPlacementRule} size="icon"><Plus /></Button>
                    </div>
                      {placementRules.length > 0 && (
                        <div className="space-y-2 mt-2">
                            {placementRules.map((rule, index) => (
                                <div key={index} className="flex items-center justify-between p-2 text-sm rounded-md bg-secondary">
                                    <span>{rule.studentName} ({rule.placement === 'front' ? 'Foran' : 'Bak'})</span>
                                    <Button size="icon" variant="ghost" onClick={() => handleRemovePlacementRule(rule.studentName)}><X className="w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Layout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                  <Select
                    value={appSettings.selectedSeatingLayoutId || ""}
                    onValueChange={(id) => onAppSettingsChange({ ...appSettings, selectedSeatingLayoutId: id })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Velg en layout..." />
                    </SelectTrigger>
                    <SelectContent>
                        {layouts?.map(l => <SelectItem key={l.id} value={l.id!}>{l.name} ({l.rows}x{l.cols})</SelectItem>)}
                    </SelectContent>
                </Select>
                {activeLayout && (
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDeleteLayout(activeLayout.id!)}>
                        <Trash2 className="mr-2" /> Slett valgt layout
                    </Button>
                )}
                <div className="pt-4 border-t">
                    <CreateLayoutDialog onLayoutCreate={handleCreateLayout} />
                </div>
            </CardContent>
        </Card>
      </div>

        <div className="lg:col-span-2">
             <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                <Card className="min-h-[600px]">
                    <CardHeader>
                        <CardTitle>Klassekart</CardTitle>
                        <CardDescription>
                            {seatingChart ? "Dra og slipp elever for å bytte plass. Klikk på låsen for å låse en elev til en pult." : "Resultatet av genereringen vil vises her."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isGenerating && <div className="flex items-center justify-center h-96"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}
                        
                        {!isGenerating && localSeatingChart && activeLayout && (
                            <div className="w-full overflow-x-auto">
                                <div className="p-1 inline-block" style={{ minWidth: '100%' }}>
                                    <div className="grid gap-1 w-full" style={{ 
                                        gridTemplateColumns: `repeat(${activeLayout.cols}, minmax(0, 1fr))`,
                                    }}>
                                        {Array.from({ length: activeLayout.rows }).map((_, rowIndex) => (
                                            Array.from({ length: activeLayout.cols }).map((_, colIndex) => {
                                                if (!activeLayout.layout[rowIndex]?.[colIndex]) {
                                                    return <div key={`${rowIndex}-${colIndex}`} className="w-full h-16" />;
                                                }
                                                const id = `desk-${rowIndex}-${colIndex}`;
                                                const studentName = localSeatingChart[rowIndex]?.[colIndex]?.[0] || null;
                                                const isLocked = activeLayout.lockedDesks?.some(d => d.deskId === id) ?? false;
                                                return (
                                                    <DroppableDesk 
                                                        key={id} 
                                                        id={id} 
                                                        isOver={overId === id}
                                                        isLocked={isLocked}
                                                        onLockToggle={() => handleLockToggle(rowIndex, colIndex)}
                                                    >
                                                        {studentName && activeDragId !== id && <DraggableStudent id={id} studentName={studentName} />}
                                                    </DroppableDesk>
                                                );
                                            })
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="mt-4">
                              <UnplacedArea id="unplaced-area" isOver={overId === 'unplaced-area'}>
                                <h4 className="font-semibold mb-4 text-sm text-center">
                                    Uplasserte elever ({unplacedStudents.length})
                                </h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {unplacedStudents.map(studentName => {
                                        const unplacedId = `unplaced-${studentName}`;
                                        return (
                                            <div key={unplacedId} className="w-full h-12">
                                                {activeDragId !== unplacedId && <DraggableStudent id={unplacedId} studentName={studentName} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </UnplacedArea>
                        </div>
                    </CardContent>
                </Card>
                <DragOverlay>
                    {activeDragId && draggedStudentName ? (
                        <div className="flex items-center justify-center h-16 text-center bg-secondary cursor-grabbing rounded-lg shadow-lg p-1 w-24">
                            <p className="text-xs font-medium whitespace-normal">{draggedStudentName}</p>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    </div>
  );
}

    
