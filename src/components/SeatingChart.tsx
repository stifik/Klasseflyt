
"use client";

import { useState } from "react";
import type { Student } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateSeatingChart } from "@/ai/flows/generate-seating-chart";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type SeatingChartData = (string[] | null)[][];
type AvoidPair = [string, string];
type SeatingChartSettings = {
    rows: number;
    cols: number;
    groupSize: number;
};

interface SeatingChartProps {
  students: Student[];
  seatingChart: SeatingChartData | null;
  onSeatingChartChange: (chart: SeatingChartData | null) => void;
  settings: SeatingChartSettings;
  onSettingsChange: (settings: SeatingChartSettings) => void;
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

  const style = {
    transform: CSS.Translate.toString(transform),
  };
  
  if (!studentName) return null;

  return (
    <div
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`flex items-center justify-center w-24 h-16 text-center bg-secondary touch-none cursor-grab rounded-lg ${isDragging ? 'opacity-50' : ''}`}
    >
      <p className="text-xs font-medium">{studentName}</p>
    </div>
  );
};

const DroppableDesk = ({ studentName, id, children }: DeskProps & { children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-center w-24 h-16 border rounded-lg ${isOver ? 'bg-primary/20' : 'bg-transparent'} ${!studentName ? 'border-dashed' : ''}`}
    >
      {children}
    </div>
  );
};


export default function SeatingChart({ students, seatingChart, onSeatingChartChange, settings, onSettingsChange }: SeatingChartProps) {
  const { rows, cols, groupSize } = settings;
  const [avoidPairs, setAvoidPairs] = useState<AvoidPair[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAvoidPairChange = (student1Id: string, student2Id: string) => {
    const newPair: AvoidPair = [student1Id, student2Id].sort() as AvoidPair;
    const existingPairIndex = avoidPairs.findIndex(
      (p) => p[0] === newPair[0] && p[1] === newPair[1]
    );

    if (existingPairIndex > -1) {
      setAvoidPairs(avoidPairs.filter((_, index) => index !== existingPairIndex));
    } else {
      setAvoidPairs([...avoidPairs, newPair]);
    }
  };
  
  const getAdjacentPairsFromChart = (chart: SeatingChartData): AvoidPair[] => {
    const pairs: AvoidPair[] = [];
    chart.forEach(row => {
        row.forEach(desk => {
            if (desk && desk.length > 1) {
                for (let i = 0; i < desk.length - 1; i++) {
                    const student1Name = desk[i];
                    const student2Name = desk[i+1];
                    if (student1Name && student2Name) {
                        const s1 = students.find(s => s.name === student1Name);
                        const s2 = students.find(s => s.name === student2Name);
                        if (s1 && s2) {
                           const newPair = [s1.id, s2.id].sort() as AvoidPair;
                           if(!pairs.some(p => p[0] === newPair[0] && p[1] === newPair[1])) {
                               pairs.push(newPair);
                           }
                        }
                    }
                }
            }
        });
    });
    return pairs;
  }

  const handleGenerateClick = async (avoidPreviousNeighbors = false) => {
    setIsGenerating(true);
    
    let temporaryAvoidPairs: AvoidPair[] = [...avoidPairs];
    if (avoidPreviousNeighbors && seatingChart) {
        const previousNeighbors = getAdjacentPairsFromChart(seatingChart);
        temporaryAvoidPairs = [...new Set([...temporaryAvoidPairs, ...previousNeighbors])];
    }
    
    onSeatingChartChange(null); 

    try {
      const studentNames = students.map(s => s.name);
      const avoidPairNames = temporaryAvoidPairs.map(([s1Id, s2Id]) => {
          const s1Name = students.find(st => st.id === s1Id)?.name || '';
          const s2Name = students.find(st => st.id === s2Id)?.name || '';
          return [s1Name, s2Name];
      });

      const result = await generateSeatingChart({
        studentNames,
        rows,
        cols,
        groupSize,
        avoidPairs: avoidPairNames as [string, string][],
      });
      
      const chart = result.seatingChart || [];
      const validatedChart: SeatingChartData = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => chart[r]?.[c] || null)
      );
      onSeatingChartChange(validatedChart);

    } catch (error) {
        console.error(error);
        toast({
            title: "Feil ved generering",
            description: "Kunne ikke generere klassekart. Prøv igjen.",
            variant: "destructive",
        });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || !seatingChart) return;
    
    if (active.id === over.id) return;
    
    const [startRow, startCol, startStudentIdx] = active.id.toString().split('-').map(Number);
    const [endRow, endCol, endStudentIdx] = over.id.toString().split('-').map(Number);
    
    const newChart = JSON.parse(JSON.stringify(seatingChart));

    const startDesk = newChart[startRow]?.[startCol];
    const studentToMove = startDesk?.[startStudentIdx];
    
    // Ensure we don't drag from an empty spot
    if (studentToMove === null) return;
    
    if (!newChart[endRow][endCol]) {
      newChart[endRow][endCol] = Array(groupSize).fill(null);
    }
    const endDesk = newChart[endRow]?.[endCol];
    const studentToSwap = endDesk?.[endStudentIdx];
    
    newChart[endRow][endCol][endStudentIdx] = studentToMove;
    if (startDesk) {
      startDesk[startStudentIdx] = studentToSwap || null;
    }
    
    for (let r=0; r < newChart.length; r++) {
      for (let c=0; c < newChart[r].length; c++) {
        const desk = newChart[r][c];
        if (Array.isArray(desk) && desk.every(s => s === null)) {
            newChart[r][c] = null;
        }
      }
    }

    onSeatingChartChange(newChart);
  };
  
  const draggedStudentName = activeDragId && seatingChart
      ? seatingChart.at(parseInt(activeDragId.split('-')[0]))
          ?.at(parseInt(activeDragId.split('-')[1]))
          ?.at(parseInt(activeDragId.split('-')[2])) 
      : null;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Innstillinger for klassekart</CardTitle>
            <CardDescription>Definer oppsett og begrensninger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rows">Rader</Label>
                <Input id="rows" type="number" value={rows} onChange={(e) => onSettingsChange({ ...settings, rows: Math.max(1, Number(e.target.value))})} min="1" />
              </div>
              <div>
                <Label htmlFor="cols">Grupper pr. rad</Label>
                <Input id="cols" type="number" value={cols} onChange={(e) => onSettingsChange({ ...settings, cols: Math.max(1, Number(e.target.value))})} min="1" />
              </div>
            </div>
            <div>
              <Label htmlFor="groupSize">Elever pr. gruppe</Label>
              <Select value={String(groupSize)} onValueChange={(v) => onSettingsChange({ ...settings, groupSize: Number(v) })}>
                <SelectTrigger id="groupSize">
                  <SelectValue placeholder="Velg gruppestørrelse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 og 1</SelectItem>
                  <SelectItem value="2">2 og 2</SelectItem>
                  <SelectItem value="3">3 og 3</SelectItem>
                  <SelectItem value="4">4 og 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="flex flex-col gap-2">
                <Button onClick={() => handleGenerateClick(false)} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Users className="mr-2" />}
                    {seatingChart ? 'Generer nytt fra bunnen av' : 'Generer klassekart'}
                </Button>
                {seatingChart && (
                    <Button onClick={() => handleGenerateClick(true)} disabled={isGenerating} variant="outline">
                        {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Shuffle className="mr-2" />}
                        Generer nytt (unngå naboer)
                    </Button>
                )}
             </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Permanente unngå-par</CardTitle>
                <CardDescription>Velg elever som aldri skal sitte sammen.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-48">
                    <div className="space-y-2">
                        {students.map((s1, i) => (
                            <div key={s1.id}>
                                {students.slice(i + 1).map((s2) => {
                                    const pair: AvoidPair = [s1.id, s2.id].sort() as AvoidPair;
                                    const isChecked = avoidPairs.some(p => p[0] === pair[0] && p[1] === pair[1]);
                                    return (
                                        <div key={`${s1.id}-${s2.id}`} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`avoid-${s1.id}-${s2.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => handleAvoidPairChange(s1.id, s2.id)}
                                            />
                                            <label htmlFor={`avoid-${s1.id}-${s2.id}`} className="text-sm">
                                                {s1.name} & {s2.name}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <DndContext onDragStart={(e) => setActiveDragId(e.active.id.toString())} onDragEnd={handleDragEnd}>
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle>Generert Klassekart</CardTitle>
                 <CardDescription>
                    {seatingChart ? "Dra og slipp elever for å bytte plass." : "Resultatet av genereringen vil vises her."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {isGenerating && (
                    <div className="flex items-center justify-center h-96">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    </div>
                )}
                {seatingChart && (
                    <div className="grid gap-y-4">
                        {seatingChart.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex flex-wrap justify-start gap-x-4 gap-y-4">
                                {row.map((desk, deskIndex) => (
                                   <div key={deskIndex} className="flex gap-1">
                                        {Array.from({ length: groupSize }).map((_, studentIndex) => {
                                            const studentName = desk?.[studentIndex] ?? null;
                                            const id = `${rowIndex}-${deskIndex}-${studentIndex}`;
                                            return (
                                                <DroppableDesk key={id} id={id} studentName={studentName}>
                                                    {studentName && activeDragId !== id && <DraggableStudent id={id} studentName={studentName} />}
                                                </DroppableDesk>
                                            );
                                        })}
                                   </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
              </CardContent>
            </Card>
            <DragOverlay>
              {activeDragId && draggedStudentName ? (
                <div className="flex items-center justify-center w-24 h-16 text-center bg-secondary cursor-grabbing rounded-lg">
                  <p className="text-xs font-medium">{draggedStudentName}</p>
                </div>
              ) : null}
            </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
