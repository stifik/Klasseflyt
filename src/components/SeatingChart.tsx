
"use client";

import { useState } from "react";
import type { Student, SeatingChartRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Shuffle, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

type SeatingChartData = (string[] | null)[][];
type AvoidPair = [string, string];
type SeatingChartSettings = {
    rows: number;
    cols: number;
    groupSize: number;
};

interface SeatingChartProps {
  userId: string;
  students: Student[];
  seatingChart: SeatingChartData | null;
  onSeatingChartChange: (chart: SeatingChartData | null, source: 'generation' | 'drag' | 'load') => void;
  settings: SeatingChartSettings;
  onSettingsChange: (settings: SeatingChartSettings) => void;
  history: SeatingChartRecord[];
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

// Helper function to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};


export default function SeatingChart({ userId, students, seatingChart, onSeatingChartChange, settings, onSettingsChange, history }: SeatingChartProps) {
  const { rows, cols, groupSize } = settings;
  const [avoidPairs, setAvoidPairs] = useState<AvoidPair[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedStudent1, setSelectedStudent1] = useState<string>("");
  const [selectedStudent2, setSelectedStudent2] = useState<string>("");
  const { toast } = useToast();
  
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
  
  const getAdjacentPairsFromChart = (chart: SeatingChartData): AvoidPair[] => {
    const pairs: Set<string> = new Set();
    const studentNameToId = new Map(students.map(s => [s.name, s.id]));

    chart.forEach(row => {
        row.forEach(desk => {
            if (desk && desk.length > 1) {
                for (let i = 0; i < desk.length; i++) {
                    for (let j = i + 1; j < desk.length; j++) {
                        const s1Name = desk[i];
                        const s2Name = desk[j];
                        if (s1Name && s2Name) {
                            const s1Id = studentNameToId.get(s1Name);
                            const s2Id = studentNameToId.get(s2Name);
                            if (s1Id && s2Id) {
                                const pair = [s1Id, s2Id].sort();
                                pairs.add(JSON.stringify(pair));
                            }
                        }
                    }
                }
            }
        });
    });
    return Array.from(pairs).map(p => JSON.parse(p));
  }

  const generateChartWithLogic = (currentAvoidPairs: AvoidPair[]): SeatingChartData | null => {
    const studentNames = shuffleArray(students.map(s => s.name));
    const studentNameToId = new Map(students.map(s => [s.name, s.id]));
    const totalDesks = rows * cols;
    const totalCapacity = totalDesks * groupSize;

    if (studentNames.length > totalCapacity) {
      toast({
        title: "For få plasser",
        description: `Det er ${studentNames.length} elever, men bare kapasitet til ${totalCapacity}. Øk antall rader eller grupper.`,
        variant: "destructive"
      });
      return null;
    }

    const chart: SeatingChartData = Array.from({ length: rows }, () => 
      Array.from({ length: cols }, () => null)
    );

    let studentIndex = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (studentIndex >= studentNames.length) break;
        
        const deskGroup: string[] = [];
        for (let s = 0; s < groupSize; s++) {
          if (studentIndex >= studentNames.length) break;

          const currentStudentName = studentNames[studentIndex];
          const currentStudentId = studentNameToId.get(currentStudentName);

          // Check constraints
          const isInvalidPlacement = deskGroup.some(seatedStudentName => {
            const seatedStudentId = studentNameToId.get(seatedStudentName);
            const pair: AvoidPair = [currentStudentId!, seatedStudentId!].sort() as AvoidPair;
            return currentAvoidPairs.some(p => p[0] === pair[0] && p[1] === pair[1]);
          });

          if (!isInvalidPlacement) {
            deskGroup.push(currentStudentName);
            studentIndex++;
          } else {
             // Simple strategy: swap with next available student and retry
             if (studentIndex < studentNames.length -1) {
                [studentNames[studentIndex], studentNames[studentIndex+1]] = [studentNames[studentIndex+1], studentNames[studentIndex]];
                s--; // retry same seat with swapped student
                continue;
             }
             // If it's the last student, we can't place them here. We'll leave the spot empty.
          }
        }
        if (deskGroup.length > 0) {
           chart[r][c] = deskGroup;
        }
      }
      if (studentIndex >= studentNames.length) break;
    }
     if (studentIndex < studentNames.length) {
       toast({
         title: "Kunne ikke plassere alle",
         description: "Noen elever kunne ikke plasseres på grunn av strenge 'unngå par'-regler. Prøv å generere på nytt eller juster reglene.",
         variant: "destructive"
       })
    }
    return chart;
  };


  const handleGenerateClick = async (avoidPreviousNeighbors = false) => {
    setIsGenerating(true);
    
    let temporaryAvoidPairs: AvoidPair[] = [...avoidPairs];
    if (avoidPreviousNeighbors && seatingChart) {
        const previousNeighbors = getAdjacentPairsFromChart(seatingChart);
        // Combine and remove duplicates
        const combined = [...avoidPairs, ...previousNeighbors];
        const unique = Array.from(new Set(combined.map(p => JSON.stringify(p)))).map(s => JSON.parse(s));
        temporaryAvoidPairs = unique;
    }
    
    onSeatingChartChange(null, 'generation'); 

    // Use a short timeout to allow the UI to update to the loading state
    setTimeout(() => {
        try {
            const newChart = generateChartWithLogic(temporaryAvoidPairs);
            if (newChart) {
                onSeatingChartChange(newChart, 'generation');
            }
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
    }, 50);
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
    
    if (!studentToMove) {
      // Prevents crash from dragging from an empty spot, which could happen in a weird state
      return;
    }
    
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

    onSeatingChartChange(newChart, 'drag');
  };

  const handleLoadFromHistory = (chartId: string) => {
    const record = history.find(h => h.id === chartId);
    if (record) {
      try {
        const chart = JSON.parse(record.chartJson);
        const settings = {
          rows: record.rows,
          cols: record.cols,
          groupSize: record.groupSize,
        };
        onSettingsChange(settings);
        onSeatingChartChange(chart, 'load');
        toast({ title: "Klassekart lastet", description: `Lastet inn kart fra ${format(record.createdAt, "PPPp", { locale: nb })}`});
      } catch (e) {
        toast({ title: "Feil", description: "Kunne ikke laste historisk klassekart.", variant: "destructive"});
      }
    }
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
            <CardTitle>Arkiv</CardTitle>
            <CardDescription>Last inn et tidligere generert klassekart.</CardDescription>
          </CardHeader>
          <CardContent>
             {history.length > 0 ? (
                <Select onValueChange={handleLoadFromHistory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg et kart fra historikken..." />
                  </SelectTrigger>
                  <SelectContent>
                    {history.map(record => (
                        <SelectItem key={record.id} value={record.id}>
                            {format(record.createdAt, "PPP, HH:mm", { locale: nb })}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             ) : (
                <p className="text-sm text-muted-foreground">Ingen historikk funnet.</p>
             )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Permanente unngå-par</CardTitle>
                <CardDescription>Velg elever som aldri skal sitte sammen.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-end gap-2 mb-4">
                    <div className="flex-1">
                        <Label htmlFor="student1" className="sr-only">Elev 1</Label>
                        <Select value={selectedStudent1} onValueChange={setSelectedStudent1}>
                            <SelectTrigger id="student1"><SelectValue placeholder="Velg elev 1" /></SelectTrigger>
                            <SelectContent>
                                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1">
                        <Label htmlFor="student2" className="sr-only">Elev 2</Label>
                        <Select value={selectedStudent2} onValueChange={setSelectedStudent2}>
                             <SelectTrigger id="student2"><SelectValue placeholder="Velg elev 2" /></SelectTrigger>
                            <SelectContent>
                                {students.filter(s => s.id !== selectedStudent1).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleAddAvoidPair} disabled={!selectedStudent1 || !selectedStudent2 || selectedStudent1 === selectedStudent2} size="icon">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                {avoidPairs.length > 0 && (
                    <ScrollArea className="h-32">
                        <div className="space-y-2">
                            {avoidPairs.map(pair => {
                                const s1 = students.find(s => s.id === pair[0]);
                                const s2 = students.find(s => s.id === pair[1]);
                                return (
                                    <div key={`${pair[0]}-${pair[1]}`} className="flex items-center justify-between p-2 text-sm rounded-md bg-secondary">
                                        <span>{s1?.name} & {s2?.name}</span>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveAvoidPair(pair)} className="h-6 w-6">
                                            <X className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}
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
                {!isGenerating && seatingChart && (
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
