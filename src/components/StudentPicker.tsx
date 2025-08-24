
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { Student, SeatingChartData, SeatingLayout } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentPickerProps {
  students: Student[];
  seatingChart: SeatingChartData | null;
  activeLayout: SeatingLayout | null;
}

interface DeskPosition {
  rowIndex: number;
  colIndex: number;
  studentName: string;
}

export default function StudentPicker({ students, seatingChart, activeLayout }: StudentPickerProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [highlightedDesk, setHighlightedDesk] = useState<DeskPosition | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<DeskPosition | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const availableDesks = useMemo(() => {
    if (!seatingChart) return [];
    const desks: DeskPosition[] = [];
    seatingChart.forEach((row, rowIndex) => {
      row.forEach((desk, colIndex) => {
        if (desk && desk[0]) {
          desks.push({ rowIndex, colIndex, studentName: desk[0] });
        }
      });
    });
    return desks;
  }, [seatingChart]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const startPicking = () => {
    if (availableDesks.length === 0 || isPicking) return;
    setIsPicking(true);
    setSelectedStudent(null);

    const totalDuration = 4000; // Total animation time in ms
    const startTime = Date.now();

    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      
      // Calculate interval based on elapsed time (slows down over time)
      const progress = elapsedTime / totalDuration;
      const interval = 50 + Math.pow(progress, 2) * 400;

      // Pick a random desk to highlight
      const randomIndex = Math.floor(Math.random() * availableDesks.length);
      setHighlightedDesk(availableDesks[randomIndex]);

      if (elapsedTime < totalDuration) {
        setTimeout(() => {
           animationFrameId.current = requestAnimationFrame(animate);
        }, interval);
      } else {
        // Animation finished, select the final student
        setIsPicking(false);
        const finalStudent = availableDesks[randomIndex];
        setSelectedStudent(finalStudent);
        setHighlightedDesk(null);
      }
    };
    
    animate();
  };
  
  const Desk = ({ rowIndex, colIndex, studentName }: { rowIndex: number, colIndex: number, studentName: string | null }) => {
    if (!studentName) return <div className="w-24 h-16" />; // Empty space for layout consistency

    const isHighlighted = (highlightedDesk?.rowIndex === rowIndex && highlightedDesk?.colIndex === colIndex);
    const isSelected = (selectedStudent?.rowIndex === rowIndex && selectedStudent?.colIndex === colIndex);

    return (
      <div
        className={cn(
          "flex items-center justify-center w-24 h-16 text-center border rounded-lg transition-all duration-100",
          {
            "bg-secondary": !isHighlighted && !isSelected,
            "bg-green-400 scale-105 shadow-lg": isHighlighted,
            "bg-primary text-primary-foreground scale-110 shadow-xl border-2 border-primary-foreground font-bold": isSelected,
          }
        )}
      >
        <p className="text-xs font-medium">{studentName}</p>
      </div>
    );
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Elev-trekker</CardTitle>
            <CardDescription>
              Trykk på knappen for å trekke en tilfeldig elev.
            </CardDescription>
          </div>
          <Button onClick={startPicking} disabled={isPicking || availableDesks.length === 0} className="mt-2 sm:mt-0">
            <Sparkles className="mr-2" />
            {isPicking ? 'Trekker...' : 'Trekk en elev'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!seatingChart || !activeLayout ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Ingen klassekart er aktivt. Gå til "Klassekart"-fanen for å generere et.</p>
            </div>
        ) : (
             <div className="grid gap-y-2">
                {Array.from({ length: activeLayout.rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="flex justify-start gap-x-2">
                        {Array.from({ length: activeLayout.cols }).map((_, colIndex) => {
                            const studentName = seatingChart[rowIndex]?.[colIndex]?.[0] || null;
                            return <Desk key={colIndex} rowIndex={rowIndex} colIndex={colIndex} studentName={studentName} />
                        })}
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
