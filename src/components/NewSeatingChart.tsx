"use client";

import React, { useState, useMemo } from "react";
import type { Student, SeatingLayout, AppSettings, SeatingChartDataType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay, closestCenter } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface NewSeatingChartProps {
  students: Student[];
  appSettings: AppSettings;
  onAppSettingsChange: (newSettings: AppSettings) => void;
  onSeatingChartChange: (chart: SeatingChartDataType | null, source: 'generation' | 'drag' | 'load') => void;
}

const DraggableStudent = ({ studentName, deskId, isLocked, isUnplaced = false }: { studentName: string; deskId?: string; isLocked?: boolean, isUnplaced?: boolean }) => {
    const id = isUnplaced ? `unplaced-${studentName}` : `student-${deskId}`;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        data: { studentName, fromDeskId: deskId, isUnplaced },
        disabled: isLocked,
    });
    const style = { transform: CSS.Translate.toString(transform) };
    
    const baseClasses = "flex items-center justify-center text-center touch-none rounded-lg p-1";
    const placedClasses = "bg-secondary h-full w-full";
    const unplacedClasses = "bg-background border h-auto py-1.5 px-2";

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...listeners} 
            {...attributes} 
            className={cn(
                baseClasses,
                isUnplaced ? unplacedClasses : placedClasses,
                isDragging && 'invisible',
                isLocked ? 'cursor-not-allowed' : 'cursor-grab'
            )}
        >
            <p className="text-xs font-medium whitespace-normal">{studentName}</p>
        </div>
    );
};

const DroppableDesk = ({ id, children, isLocked, onLockToggle }: { id: string, children: React.ReactNode, isLocked: boolean, onLockToggle: () => void }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const hasChild = React.Children.count(children) > 0 && React.Children.toArray(children).some(child => child !== null);
    
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "relative flex items-center justify-center border rounded-lg transition-colors w-full h-16",
                isOver ? "bg-primary/10 ring-2 ring-primary" : "bg-transparent",
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

const UnplacedStudentsBox = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: 'unplaced-area' });
    return (
        <Card className="mt-4" ref={setNodeRef}>
            <CardHeader>
                <CardTitle className="text-base flex items-center">
                    <Users className="mr-2" />
                    Uplasserte elever
                </CardTitle>
            </CardHeader>
            <CardContent className={cn("p-2 pt-0 min-h-[60px] rounded-lg", isOver && "bg-primary/10")}>
                <div className="flex flex-wrap gap-2">
                    {children}
                </div>
            </CardContent>
        </Card>
    );
}

export default function NewSeatingChart({ students, appSettings, onAppSettingsChange, onSeatingChartChange }: NewSeatingChartProps) {
  const { toast } = useToast();
  const [activeDragItem, setActiveDragItem] = useState<{ name: string, isUnplaced: boolean } | null>(null);
  
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

    let newLockedDesks;
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
      setActiveDragItem(null);
      const { active, over } = event;
  
      if (!over || !seatingChart || !activeLayout) return;
      
      const newChart = JSON.parse(JSON.stringify(seatingChart));
      const studentName = active.data.current?.studentName;

      // Case 1: Dragging from a desk
      if (!active.data.current?.isUnplaced) {
          const [fromR, fromC] = (active.data.current?.fromDeskId as string).split('-').map(Number);

          // Case 1a: Dragging from desk to another desk
          if (over.id !== 'unplaced-area') {
              const [toR, toC] = (over.id as string).split('-').map(Number);
              if (!activeLayout.layout[toR]?.[toC]) return;

              const studentAtDestination = newChart[toR][toC];
              newChart[toR][toC] = newChart[fromR][fromC];
              newChart[fromR][fromC] = studentAtDestination;
          } 
          // Case 1b: Dragging from desk to unplaced area
          else {
              newChart[fromR][fromC] = [];
          }
      } 
      // Case 2: Dragging from unplaced area
      else {
          // Case 2a: Dragging from unplaced to desk
          if (over.id !== 'unplaced-area') {
              const [toR, toC] = (over.id as string).split('-').map(Number);
              if (!activeLayout.layout[toR]?.[toC] || (newChart[toR][toC] && newChart[toR][toC].length > 0)) {
                   toast({ title: "Pult er opptatt", variant: "destructive" });
                   return;
              }
              newChart[toR][toC] = [studentName];
          }
          // Case 2b: Dragging from unplaced to unplaced (do nothing)
          else {
              return;
          }
      }

      onSeatingChartChange(newChart, 'drag');
  };

  const unplacedStudents = useMemo(() => {
      if (!students || !seatingChart) return [];
      const placedStudentNames = new Set(seatingChart.flat().filter(Boolean).map((s: string[]) => s[0]));
      return students.filter(student => !placedStudentNames.has(student.name));
  }, [students, seatingChart]);
  
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
        onDragStart={(event) => {
            setActiveDragItem({ name: event.active.data.current?.studentName, isUnplaced: event.active.data.current?.isUnplaced });
        }}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
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
                                        const isLocked = activeLayout.lockedDesks?.some(d => d.deskId === deskId && d.studentName === studentName) ?? false;

                                        return (
                                            <DroppableDesk 
                                                key={deskId} 
                                                id={deskId} 
                                                isLocked={isLocked}
                                                onLockToggle={() => handleLockToggle(rowIndex, colIndex)}
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
                 <UnplacedStudentsBox>
                    {unplacedStudents.map(student => (
                        <DraggableStudent
                            key={student.id}
                            studentName={student.name}
                            isUnplaced={true}
                        />
                    ))}
                </UnplacedStudentsBox>
            </CardContent>
        </Card>
        <DragOverlay dropAnimation={null}>
            {activeDragItem ? (
                 <div className={cn(
                    "flex items-center justify-center text-center touch-none rounded-lg p-1 shadow-lg",
                     activeDragItem.isUnplaced
                        ? "bg-background border h-auto py-1.5 px-2"
                        : "bg-secondary h-16 w-[80px]"
                 )}>
                    <p className="text-xs font-medium whitespace-normal">{activeDragItem.name}</p>
                </div>
            ) : null}
        </DragOverlay>
    </DndContext>
  );
}
