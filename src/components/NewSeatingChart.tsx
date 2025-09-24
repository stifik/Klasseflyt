
"use client";

import React, { useState, useMemo } from "react";
import type { Student, SeatingChartRecord, SeatingLayout, AppSettings, LockedDesk, SeatingChartData as SeatingChartDataType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

interface NewSeatingChartProps {
  students: Student[];
  appSettings: AppSettings;
  onAppSettingsChange: (newSettings: AppSettings) => void;
}

const DroppableDesk = ({ id, children, isLocked, onLockToggle }: { id: string, children: React.ReactNode, isLocked: boolean, onLockToggle: () => void }) => {
    const hasChild = React.Children.count(children) > 0 && React.Children.toArray(children).some(child => child !== null);
    
    return (
        <div
            className={cn(
                "relative flex items-center justify-center border rounded-lg transition-colors w-full h-16",
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


export default function NewSeatingChart({ students, appSettings }: NewSeatingChartProps) {
  const { toast } = useToast();

  // --- Live Queries to get data directly from IndexedDB ---
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

  const studentMap = useMemo(() => new Map(students.map(s => [s.name, s.id])), [students]);

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
        // Ensure a student can only be locked to one desk at a time.
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
    <Card className="min-h-[600px]">
        <CardHeader>
            <CardTitle>Klassekart</CardTitle>
            <CardDescription>
                Klikk på låse-ikonet øverst til venstre på en pult for å låse eleven til den plassen.
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
                                    const id = `${rowIndex}-${colIndex}`;
                                    const studentName = seatingChart[rowIndex]?.[colIndex]?.[0] || null;
                                    const isLocked = activeLayout.lockedDesks?.some(d => d.deskId === id) ?? false;

                                    return (
                                        <DroppableDesk 
                                            key={id} 
                                            id={id} 
                                            isLocked={isLocked}
                                            onLockToggle={() => handleLockToggle(rowIndex, colIndex)}
                                        >
                                            {studentName && (
                                                <div className="flex items-center justify-center h-full w-full text-center bg-secondary rounded-lg p-1">
                                                    <p className="text-xs font-medium whitespace-normal">{studentName}</p>
                                                </div>
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
  );
}
