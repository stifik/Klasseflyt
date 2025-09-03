
"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { Student, SeatingChartRecord, SeatingLayout, AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Shuffle, Plus, X, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';
import { Switch } from "./ui/switch";


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
        "flex items-center justify-center h-full text-center bg-secondary touch-none cursor-grab rounded-lg p-1 w-24",
        isDragging && 'opacity-50'
    )}>
      <p className="text-xs font-medium whitespace-normal">{studentName}</p>
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
                "relative flex items-center justify-center border rounded-lg transition-colors w-full h-16",
                isOver ? "bg-primary/10" : "bg-transparent",
                !hasChild ? "border-dashed" : ""
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


// Main Component
export default function SeatingChart({ students, seatingChart, activeLayout, onSeatingChartChange, history, appSettings, onAppSettingsChange, layouts, onLayoutsChange }: SeatingChartProps) {
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

  const [newLayoutName, setNewLayoutName] = useState("");
  const [newLayoutRows, setNewLayoutRows] = useState(5);
  const [newLayoutCols, setNewLayoutCols] = useState(6);

  const { toast } = useToast();
  
  const lastChart = history[0] ? JSON.parse(history[0].chartJson) : null;

  useEffect(() => {
    setLocalSeatingChart(seatingChart);
    setUnplacedStudents(calculateUnplacedStudents(seatingChart, students));
  }, [seatingChart, students]);

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
  
  const generateChartWithLogic = (): SeatingChartData => {
    if (!activeLayout) return [];
    
    let attempts = 0;
    while (attempts < 50) {
      const shuffledStudents = shuffleArray(students.map(s => s.name));
      const newChart: SeatingChartData = Array(activeLayout.rows).fill(null).map(() => Array(activeLayout.cols).fill(null).map(() => []));
      
      let isValid = true;
      let studentIndex = 0;

      for (let r = 0; r < activeLayout.rows; r++) {
        for (let c = 0; c < activeLayout.cols; c++) {
          if (!activeLayout.layout[r][c]) continue; // Skip if it's not a desk
          if (studentIndex >= shuffledStudents.length) break;
          const student = shuffledStudents[studentIndex];
          newChart[r][c] = [student];

          const neighbors = getNeighbors(r, c, newChart);
          
          if (avoidSameNeighbors && lastChart) {
            const lastNeighbors = getNeighbors(r, c, lastChart);
            if (lastNeighbors.includes(student)) {
              isValid = false;
              break;
            }
          }

          studentIndex++;
        }
        if (!isValid) break;
      }
      
      if (isValid) return newChart;
      attempts++;
    }

    toast({ title: "Kunne ikke oppfylle alle regler", description: "Genererer et kart uten alle regler.", variant: "destructive" });
    const finalShuffled = shuffleArray(students.map(s => s.name));
    const finalChart: SeatingChartData = Array(activeLayout.rows).fill(null).map(() => Array(activeLayout.cols).fill(null).map(() => []));
    let finalIndex = 0;
    for (let r = 0; r < activeLayout.rows; r++) {
      for (let c = 0; c < activeLayout.cols; c++) {
        if (activeLayout.layout[r][c] && finalIndex < finalShuffled.length) {
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
  const handleCreateLayout = () => {
    if (!newLayoutName.trim()) {
        toast({ title: "Navn mangler", description: "Layouten må ha et navn.", variant: "destructive"});
        return;
    }
    const newLayout: SeatingLayout = {
        id: uuidv4(),
        name: newLayoutName.trim(),
        rows: newLayoutRows,
        cols: newLayoutCols,
        layout: Array(newLayoutRows).fill(null).map(() => Array(newLayoutCols).fill(true)),
        seatCount: newLayoutRows * newLayoutCols,
        createdAt: new Date(),
    };
    onLayoutsChange([...layouts, newLayout]);
    setNewLayoutName("");
  };

  const handleDeleteLayout = (id: string) => {
    const newLayouts = layouts.filter(l => l.id !== id);
    onLayoutsChange(newLayouts);
    if (appSettings.selectedSeatingLayoutId === id) {
        onAppSettingsChange({ ...appSettings, selectedSeatingLayoutId: null });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-1 space-y-4">
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
                            {layouts.map(l => <SelectItem key={l.id} value={l.id!}>{l.name} ({l.rows}x{l.cols})</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {activeLayout && (
                        <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDeleteLayout(activeLayout.id!)}>
                            <Trash2 className="mr-2" /> Slett valgt layout
                        </Button>
                    )}
                    <div className="pt-4 border-t space-y-2">
                        <Label>Ny Layout</Label>
                        <Input placeholder="Navn på layout" value={newLayoutName} onChange={e => setNewLayoutName(e.target.value)} />
                        <div className="flex gap-2">
                            <Input type="number" placeholder="Rader" value={newLayoutRows} onChange={e => setNewLayoutRows(Number(e.target.value))} />
                            <Input type="number" placeholder="Kolonner" value={newLayoutCols} onChange={e => setNewLayoutCols(Number(e.target.value))} />
                        </div>
                        <Button onClick={handleCreateLayout} className="w-full">
                            <Plus className="mr-2" /> Lag ny
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-1">
             <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                <Card className="min-h-[600px]">
                    <CardHeader>
                        <CardTitle>Klassekart</CardTitle>
                        <CardDescription>
                            {seatingChart ? "Dra og slipp elever for å bytte plass." : "Resultatet av genereringen vil vises her."}
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
                                                return (
                                                    <DroppableDesk key={id} id={id} isOver={overId === id}>
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
                            <DroppableDesk id="unplaced-area" isOver={overId === 'unplaced-area'}>
                                <div className="p-4 w-full min-h-[10rem] h-full">
                                    <h4 className="font-semibold mb-2 text-sm text-center">Uplasserte elever ({unplacedStudents.length})</h4>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {unplacedStudents.map(studentName => (
                                            <div key={`unplaced-div-${studentName}`} className="h-16">
                                                {activeDragId !== `unplaced-${studentName}` && (
                                                    <DraggableStudent id={`unplaced-${studentName}`} studentName={studentName} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DroppableDesk>
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
