
"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { Student, SeatingChartRecord, SeatingLayout, AppSettings, LockedDesk, SeatingChartData as SeatingChartDataType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface NewSeatingChartProps {
  students: Student[];
  appSettings: AppSettings;
  onAppSettingsChange: (newSettings: AppSettings) => void;
  onSeatingChartChange: (chart: SeatingChartDataType | null, source: 'generation' | 'drag' | 'load') => void;
}

const DraggableStudent = ({ studentName, deskId, isLocked }: { studentName: string, deskId: string, isLocked: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `student-${deskId}`,
        data: { studentName, fromDeskId: deskId },
        disabled: isLocked,
    });
    const style = { transform: CSS.Translate.toString(transform) };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...listeners} 
            {...attributes} 
            className={cn(
                "flex items-center justify-center h-full w-full text-center bg-secondary touch-none rounded-lg p-1",
                isDragging && 'opacity-50',
                isLocked ? 'cursor-not-allowed' : 'cursor-grab'
            )}
        >
            <p className="text-xs font-medium whitespace-normal">{studentName}</p>
        </div>
    );
};

const DroppableDesk = ({ id, children, isLocked, onLockToggle, isOver }: { id: string, children: React.ReactNode, isLocked: boolean, onLockToggle: () => void, isOver: boolean }) => {
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


export default function NewSeatingChart({ students, appSettings, onSeatingChartChange }: NewSeatingChartProps) {
  const { toast } = useToast();
  const [activeDragStudentName, setActiveDragStudentName] = useState<string | null>(null);
  
  const activeLayout = useLiveQuery(() => {
    if (appSettings.selectedSeatingLayoutId) {
      return db.seatingLayouts.get(appSettings.selectedSeatingLayoutId);
    }
    return Promise.resolve(undefined);
  }, [appSettings.selectedSeatingLayoutId]);

  const seatingChart = useLiveQuery(async () => {
    const latest = await db.seatingChartHistory.orderBy('createdAt').last();
    return latest ? JSON.parse(latest.chartJson) : null;
  }, []);

  const handleLockToggle = async (rowIndex: number, colIndex: number) => {
    if (!activeLayout || !seatingChart) return;
    const deskId = `${rowIndex}-${colIndex}`;
    const studentName = seatingChart[rowIndex]?.[colIndex]?.[0];
    if (!studentName) return;

    const currentLockedDesks = activeLayout.lockedDesks || [];
    const isCurrentlyLocked = currentLockedDesks.some(d => d.deskId === deskId);

    let newLockedDesks: LockedDesk[];
    if (isCurrentlyLocked) {
        newLockedDesks = currentLockedDesks.filter(d => d.deskId !== deskId);
        toast({ title: `${studentName} er låst opp.`});
    } else {
        const otherLocksForStudentRemoved = currentLockedDesks.filter(d => d.studentName !== studentName);
        newLockedDesks = [...otherLocksForStudentRemoved, { deskId, studentName }];
        toast({ title: `${studentName} er låst til pulten.`});
    }
    
    try {
        await db.seatingLayouts.update(activeLayout.id!, { lockedDesks: newLockedDesks });
    } catch (error) {
        console.error("Failed to update locked desks:", error);
        toast({ title: "Feil", description: "Kunne ikke oppdatere låst pult.", variant: "destructive" });
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
      setActiveDragStudentName(null);
      const { active, over } = event;

      if (!over || !seatingChart || !activeLayout) return;
      if (active.id === over.id) return;
      
      const [fromR, fromC] = (active.data.current?.fromDeskId as string).split('-').map(Number);
      const [toR, toC] = (over.id as string).split('-').map(Number);
      
      // Check if destination is a valid desk
      if (!activeLayout.layout[toR]?.[toC]) return;

      const newChart = JSON.parse(JSON.stringify(seatingChart));
      const studentToMove = newChart[fromR][fromC];
      const studentAtDestination = newChart[toR][toC];

      // Swap students
      newChart[toR][toC] = studentToMove;
      newChart[fromR][fromC] = studentAtDestination;

      onSeatingChartChange(newChart, 'drag');
  };

  if (!activeLayout) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Klassekart</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
                  <p>Vennligst velg en klasserom-layout under "Layout"-seksjonen for å starte.</p>
              </CardContent>
          </Card>
      );
  }
  
  return (
    <DndContext 
        onDragStart={(event) => setActiveDragStudentName(event.active.data.current?.studentName)}
        onDragEnd={handleDragEnd}
    >
        <Card className="min-h-[600px]">
            <CardHeader>
                <CardTitle>Klassekart</CardTitle>
                <CardDescription>
                    Dra og slipp elever for å bytte plasser. Låste elever kan ikke flyttes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {seatingChart ? (
                    <div className="w-full overflow-x-auto">
                        <div className="p-1 inline-block" style={{ minWidth: '100%' }}>
                            <div className="grid gap-1 w-full" style={{ 
                                gridTemplateColumns: `repeat(${activeLayout.cols}, minmax(80px, 1fr))`,
                            }}>
                                {Array.from({ length: activeLayout.rows }).map((_, rowIndex) => (
                                    Array.from({ length: activeLayout.cols }).map((_, colIndex) => {
                                        if (!activeLayout.layout[rowIndex]?.[colIndex]) {
                                            return <div key={`${rowIndex}-${colIndex}`} className="w-full h-16" />;
                                        }
                                        const deskId = `${rowIndex}-${colIndex}`;
                                        const studentName = seatingChart[rowIndex]?.[colIndex]?.[0] || null;
                                        const isLocked = activeLayout.lockedDesks?.some(d => d.deskId === deskId) ?? false;

                                        return (
                                            <DroppableDesk 
                                                key={deskId} 
                                                id={deskId} 
                                                isLocked={isLocked}
                                                onLockToggle={() => handleLockToggle(rowIndex, colIndex)}
                                                isOver={false} // Visual feedback can be added here
                                            >
                                                {studentName && (
                                                    <DraggableStudent 
                                                        studentName={studentName} 
                                                        deskId={deskId}
                                                        isLocked={isLocked}
                                                    />
                                                )}
                                            </DroppableDesk>
                                        );
                                    })
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                        <p>Klassekartet er tomt. Klikk på "Generer nytt" for å lage et.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        <DragOverlay>
            {activeDragStudentName ? (
                 <div className="flex items-center justify-center h-16 w-full max-w-[80px] text-center bg-secondary touch-none rounded-lg p-1 shadow-lg">
                    <p className="text-xs font-medium whitespace-normal">{activeDragStudentName}</p>
                </div>
            ) : null}
        </DragOverlay>
    </DndContext>
  );
}

