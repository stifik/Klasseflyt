
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Student, SeatingChartRecord, SeatingLayout } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Loader2, Users, Shuffle, Plus, X, Trash2, LayoutTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getSeatingLayouts, saveSeatingLayout, deleteSeatingLayout } from "@/lib/firestore";
import { cn } from "@/lib/utils";

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
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`flex items-center justify-center w-24 h-16 text-center bg-secondary touch-none cursor-grab rounded-lg ${isDragging ? 'opacity-50' : ''}`}>
      <p className="text-xs font-medium">{studentName}</p>
    </div>
  );
};
const DroppableDesk = ({ studentName, id, children }: DeskProps & { children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex items-center justify-center w-24 h-16 border rounded-lg ${isOver ? 'bg-primary/20' : 'bg-transparent'} ${!studentName ? 'border-dashed' : ''}`}>
      {children}
    </div>
  );
};

// --- Layout Designer Components ---
const LayoutDesigner = ({ userId, onSave, onCancel }: { userId: string, onSave: (layout: SeatingLayout) => void; onCancel: () => void; }) => {
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
        setLayout(Array.from({ length: newRows }, () => Array(newCols).fill(false)));
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
        const newLayoutData: Omit<SeatingLayout, 'id' | 'createdAt'> = { name, rows, cols, layout, seatCount };
        try {
            const savedLayout = await saveSeatingLayout(userId, newLayoutData);
            toast({ title: "Layout lagret", description: `"${name}" er lagret.`});
            onSave(savedLayout);
        } catch (error) {
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
                         <Input type="number" value={rows} onChange={e => handleGridSizeChange('rows', parseInt(e.target.value) || 1)} min="1" max="15" />
                         <Input type="number" value={cols} onChange={e => handleGridSizeChange('cols', parseInt(e.target.value) || 1)} min="1" max="15" />
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
export default function SeatingChart({ userId, students, seatingChart, onSeatingChartChange, settings, onSettingsChange, history }: SeatingChartProps) {
  const [avoidPairs, setAvoidPairs] = useState<AvoidPair[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedStudent1, setSelectedStudent1] = useState<string>("");
  const [selectedStudent2, setSelectedStudent2] = useState<string>("");
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [layouts, setLayouts] = useState<SeatingLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const activeLayout = useMemo(() => layouts.find(l => l.id === selectedLayoutId), [layouts, selectedLayoutId]);

  useEffect(() => {
    getSeatingLayouts(userId).then(setLayouts);
  }, [userId]);

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

  const generateChartWithLogic = (): SeatingChartData | null => {
     if (!activeLayout) {
        toast({ title: "Ingen layout valgt", description: "Vennligst velg en klasserom-layout først.", variant: "destructive" });
        return null;
    }
    
    const { layout, groupSize } = { ...activeLayout, groupSize: settings.groupSize };
    const shuffledStudents = shuffleArray(students.map(s => s.name));
    let studentIndex = 0;
    
    const chart: SeatingChartData = Array.from({ length: layout.length }, (_, r) => 
        Array.from({ length: layout[0].length }, (_, c) => layout[r][c] ? [] : null)
    );

    for (let r = 0; r < layout.length; r++) {
        for (let c = 0; c < layout[0].length; c++) {
            if (chart[r][c] !== null) { // If it's a desk
                for (let i = 0; i < groupSize; i++) {
                    if (studentIndex < shuffledStudents.length) {
                        (chart[r][c] as string[]).push(shuffledStudents[studentIndex]);
                        studentIndex++;
                    } else {
                        (chart[r][c] as string[]).push(''); // Empty spot
                    }
                }
            }
        }
    }
    
    if (studentIndex < students.length) {
        toast({ title: "For få plasser", description: `Det er ${students.length} elever, men bare plass til ${studentIndex} i denne layouten.`, variant: "destructive" });
    }

    return chart;
  };

  const handleGenerateClick = async () => {
    setIsGenerating(true);
    onSeatingChartChange(null, 'generation'); 
    setTimeout(() => {
        try {
            const newChart = generateChartWithLogic();
            if (newChart && activeLayout) {
                onSettingsChange({ rows: activeLayout.rows, cols: activeLayout.cols, groupSize: settings.groupSize });
                onSeatingChartChange(newChart, 'generation');
            }
        } catch (error) {
            console.error(error);
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
    const studentToMove = newChart[startRow]?.[startCol]?.[startStudentIdx];
    if (!studentToMove) return;

    const studentToSwap = newChart[endRow]?.[endCol]?.[endStudentIdx];
    
    newChart[endRow][endCol][endStudentIdx] = studentToMove;
    newChart[startRow][startCol][startStudentIdx] = studentToSwap || '';

    onSeatingChartChange(newChart, 'drag');
  };

  const handleLayoutSaved = (newLayout: SeatingLayout) => {
      setLayouts(prev => [newLayout, ...prev]);
      setSelectedLayoutId(newLayout.id);
      setIsDesignerOpen(false);
  }

  const handleDeleteLayout = async (id: string) => {
    await deleteSeatingLayout(userId, id);
    setLayouts(layouts.filter(l => l.id !== id));
    if (selectedLayoutId === id) {
        setSelectedLayoutId(null);
    }
    toast({ title: "Layout slettet", variant: "destructive" });
  };
  
  const draggedStudentName = activeDragId && seatingChart && activeDragId.split('-').length === 3
      ? seatingChart[parseInt(activeDragId.split('-')[0])]
          ?.[parseInt(activeDragId.split('-')[1])]
          ?.[parseInt(activeDragId.split('-')[2])]
      : null;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-1 space-y-6">
        <Dialog open={isDesignerOpen} onOpenChange={setIsDesignerOpen}>
            <Card>
              <CardHeader>
                <CardTitle>Klasserom-layout</CardTitle>
                <CardDescription>Velg en mal for klasserommet, eller design din egen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={selectedLayoutId || ""} onValueChange={setSelectedLayoutId}>
                        <SelectTrigger><SelectValue placeholder="Velg layout..." /></SelectTrigger>
                        <SelectContent>
                            {layouts.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.seatCount} plasser)</SelectItem>)}
                        </SelectContent>
                    </Select>
                     {selectedLayoutId && <Button size="icon" variant="ghost" onClick={() => handleDeleteLayout(selectedLayoutId)}><Trash2 className="text-destructive" /></Button>}
                  </div>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full"><LayoutTemplate className="mr-2" />Design Ny Layout</Button>
                </DialogTrigger>
              </CardContent>
            </Card>
            <LayoutDesigner userId={userId} onSave={handleLayoutSaved} onCancel={() => setIsDesignerOpen(false)} />
        </Dialog>
        
        <Card>
            <CardHeader>
                 <CardTitle>Innstillinger for generering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <Label htmlFor="groupSize">Elever pr. pult/gruppe</Label>
                    <Select value={String(settings.groupSize)} onValueChange={(v) => onSettingsChange({ ...settings, groupSize: Number(v) })}>
                        <SelectTrigger id="groupSize"><SelectValue /></SelectTrigger>
                        <SelectContent>
                        <SelectItem value="1">1 og 1</SelectItem>
                        <SelectItem value="2">2 og 2</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                <Button onClick={handleGenerateClick} disabled={isGenerating || !activeLayout} className="w-full">
                    {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Shuffle className="mr-2" />}
                    {seatingChart ? 'Generer nytt klassekart' : 'Generer klassekart'}
                </Button>
            </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <DndContext onDragStart={(e) => setActiveDragId(e.active.id.toString())} onDragEnd={handleDragEnd}>
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle>{activeLayout?.name || "Klassekart"}</CardTitle>
                 <CardDescription>
                    {seatingChart ? "Dra og slipp elever for å bytte plass." : "Resultatet av genereringen vil vises her."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                 {isGenerating && <div className="flex items-center justify-center h-96"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}
                
                {!isGenerating && seatingChart && activeLayout && (
                    <div className="grid gap-y-2">
                        {Array.from({ length: activeLayout.rows }).map((_, rowIndex) => (
                            <div key={rowIndex} className="flex justify-start gap-x-2">
                                {Array.from({ length: activeLayout.cols }).map((_, colIndex) => (
                                   <div key={colIndex} className="flex gap-1">
                                       {activeLayout.layout[rowIndex]?.[colIndex] ? (
                                           Array.from({ length: settings.groupSize }).map((_, studentIndex) => {
                                                const studentName = seatingChart[rowIndex]?.[colIndex]?.[studentIndex] || null;
                                                const id = `${rowIndex}-${colIndex}-${studentIndex}`;
                                                return (
                                                    <DroppableDesk key={id} id={id} studentName={studentName}>
                                                        {studentName && activeDragId !== id && <DraggableStudent id={id} studentName={studentName} />}
                                                    </DroppableDesk>
                                                );
                                           })
                                       ) : (
                                            <div className="w-24 h-16" /> // Empty space
                                       )}
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
