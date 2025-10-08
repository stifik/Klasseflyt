
"use client";

import { useState, useEffect } from "react";
import { givePoints } from "@/lib/rewardService";
import type { Student, Remark, SeatingChartData, AppSettings, SeatingLayout } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, CheckCircle2, MinusCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

const NUMBER_OF_PERIODS = 6;

interface RemarksProps {
  students: Student[];
  initialRemarks: Remark[];
  onUpdate: () => void;
  seatingChart: SeatingChartData | null;
  settings: AppSettings;
  activeLayout: SeatingLayout | null;
}

export default function Remarks({ students, initialRemarks, onUpdate, seatingChart, settings, activeLayout }: RemarksProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeRemarkType, setActiveRemarkType] = useState<string | null>(settings.remarkTypes ? settings.remarkTypes[0] : null);
  const { toast } = useToast();
  
  const [localRemarks, setLocalRemarks] = useState(initialRemarks || []);
  const [pointsValue, setPointsValue] = useState<number>(0);
  useEffect(() => {
    setLocalRemarks(initialRemarks || []);
  }, [initialRemarks]);
  
  // Update active remark if list changes
  useEffect(() => {
    if (settings.remarkTypes && settings.remarkTypes.length > 0 && !settings.remarkTypes.includes(activeRemarkType || '')) {
        setActiveRemarkType(settings.remarkTypes[0]);
    } else if (!settings.remarkTypes || settings.remarkTypes.length === 0) {
        setActiveRemarkType(null);
    }
  }, [settings.remarkTypes, activeRemarkType]);

  useEffect(() => {
    const { schedule } = settings;

    const getCurrentPeriod = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      for (const period of schedule) {
        if (period.startTime && period.endTime) {
          const [startHour, startMinute] = period.startTime.split(':').map(Number);
          const [endHour, endMinute] = period.endTime.split(':').map(Number);
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;

          if (currentTime >= startTime && currentTime <= endTime) {
            return period.period;
          }
        }
      }
      return 1;
    };

    setCurrentPeriod(getCurrentPeriod());

    const interval = setInterval(() => {
        setCurrentPeriod(getCurrentPeriod());
    }, 60000); 

    return () => clearInterval(interval);
  }, [settings.schedule]);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }
  
  const getRemarksForStudent = (studentId: string, checkDate: Date, period: number, type: string): Remark[] => {
    return localRemarks.filter(
      (r) =>
        r.studentId === studentId &&
        isSameDay(new Date(r.date), checkDate) &&
        r.period === period &&
        r.type === type
    );
  };

  const handleAddRemark = async (studentId: string) => {
    if (!activeRemarkType) return;
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    const dateStartOfDay = new Date(date);
    dateStartOfDay.setHours(0, 0, 0, 0);
    
    const newRemark: Omit<Remark, 'id'> = { studentId, date: dateStartOfDay, period: currentPeriod, type: activeRemarkType };
    const tempId = -1 * Date.now();
    setLocalRemarks(prev => [...prev, { ...newRemark, id: tempId }]);
    try {
        const newId = await db.remarks.add(newRemark as Remark);
        setLocalRemarks(prev => prev.map(r => r.id === tempId ? { ...newRemark, id: newId } : r));
        // Gi poeng hvis pointsValue > 0
        if (pointsValue > 0) {
          await givePoints(studentId, pointsValue, activeRemarkType);
          setPointsValue(0);
        }
    } catch (error) {
        console.error(error);
        toast({ title: "Feil", description: "Kunne ikke lagre anmerkning for " + studentName + ".", variant: "destructive" });
        setLocalRemarks(prev => prev.filter(r => r.id !== tempId));
    }
  };

  const handleRemoveRemark = async (studentId: string) => {
    if (!activeRemarkType) return;
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    const dateStartOfDay = new Date(date);
    dateStartOfDay.setHours(0, 0, 0, 0);

    // Find the last remark of this type to remove
    const remarksForStudent = getRemarksForStudent(studentId, dateStartOfDay, currentPeriod, activeRemarkType);
    if (remarksForStudent.length === 0) return;
    
    const remarkToRemove = remarksForStudent.sort((a,b) => (b.id ?? 0) - (a.id ?? 0))[0];

    setLocalRemarks(prev => prev.filter(r => r.id !== remarkToRemove.id));
    try {
        await db.remarks.delete(remarkToRemove.id!);
    } catch (error) {
        console.error(error);
        toast({ title: "Feil", description: "Kunne ikke fjerne anmerkning for " + studentName + ".", variant: "destructive" });
        setLocalRemarks(prev => [...prev, remarkToRemove]); // Revert on failure
    }
  };


  const StudentButton = ({ student }: { student: Student }) => {
    const remarks = getRemarksForStudent(student.id, date, currentPeriod, activeRemarkType || '');
    const count = remarks.length;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => handleAddRemark(student.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAddRemark(student.id)}
            className={cn(
                "relative flex flex-col items-center justify-center p-2 text-center border rounded-lg w-28 h-20 transition-all cursor-pointer",
                count > 0 ? "bg-yellow-100 border-yellow-300" : "bg-secondary hover:bg-muted"
            )}
        >
             <span className="text-xs font-semibold">{student.name}</span>
             {count > 0 && (
                <div className="flex items-center justify-center text-yellow-800">
                    <span className="text-xl font-bold">{count}</span>
                </div>
             )}
             {count > 0 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent adding another remark
                        handleRemoveRemark(student.id);
                    }}
                    className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded-full bg-yellow-200 hover:bg-yellow-300"
                    aria-label="Fjern en anmerkning"
                >
                    <MinusCircle className="w-4 h-4 text-yellow-700" />
                </button>
             )}
             {/* Input for poeng */}
             <input
                type="number"
                min={0}
                value={pointsValue}
                onChange={e => setPointsValue(Number(e.target.value))}
                className="mt-1 w-16 text-xs border rounded p-0.5 text-center"
                placeholder="Poeng"
                onClick={e => e.stopPropagation()}
                style={{ position: 'absolute', bottom: 2, left: 2 }}
             />
        </div>
    );
  };

  const EmptyDesk = () => (
    <div className="w-28 h-20" />
  );
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Anmerkninger</CardTitle>
            <CardDescription>
              Velg en anmerkning, og klikk deretter på elevene det gjelder for å telle hendelser.
            </CardDescription>
              {seatingChart && (
              <div className="flex items-center space-x-2 mt-4">
                  <Switch id="flip-view-remarks" checked={isFlipped} onCheckedChange={setIsFlipped} />
                  <Label htmlFor="flip-view-remarks">Speilvendt visning (lærerperspektiv)</Label>
              </div>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-full sm:w-[280px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: nb }) : <span>Velg en dato</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar locale={nb} mode="single" selected={date} onSelect={(d) => { if (d) { setDate(d); setLocalRemarks(initialRemarks); } }} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-wrap gap-2 pt-4 border-b pb-4 mb-4">
            {Array.from({ length: NUMBER_OF_PERIODS }, (_, i) => i + 1).map(period => (
                <Button 
                    key={period} 
                    variant={currentPeriod === period ? "default" : "outline"}
                    onClick={() => setCurrentPeriod(period)}
                    size="sm"
                >
                    Time {period}
                </Button>
            ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label className="font-semibold">Velg anmerkning:</Label>
          <div className="flex flex-wrap gap-2">
            {settings.remarkTypes && settings.remarkTypes.length > 0 ? settings.remarkTypes.map(type => (
              <Button
                  key={type}
                  variant={activeRemarkType === type ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveRemarkType(type)}
              >
                  {activeRemarkType === type && <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {type}
              </Button>
            )) : <p className="text-sm text-muted-foreground">Ingen anmerkningstyper definert. Gå til Innstillinger for å legge til.</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {seatingChart && activeLayout ? (
             <div className="grid gap-y-4">
                {Array.from({ length: activeLayout.rows }).map((_, r) => {
                    const rowIndex = isFlipped ? activeLayout.rows - 1 - r : r;
                    return (
                         <div key={rowIndex} className="flex flex-wrap justify-start gap-x-4 gap-y-4">
                            {Array.from({ length: activeLayout.cols }).map((_, c) => {
                                const colIndex = isFlipped ? activeLayout.cols - 1 - c : c;
                                
                                if (!activeLayout.layout[rowIndex]?.[colIndex]) {
                                    return <EmptyDesk key={'empty-' + rowIndex + '-' + colIndex} />;
                                }
                                
                                const studentName = seatingChart[rowIndex]?.[colIndex]?.[0];
                                const student = studentName ? students.find(s => s.name === studentName) : null;
                                
                                return student ? <StudentButton key={student.id} student={student} /> : <EmptyDesk key={'desk-' + rowIndex + '-' + colIndex} />;
                            })}
                        </div>
                    );
                })}
            </div>
        ) : !seatingChart ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {students.map((student) => <StudentButton key={student.id} student={student} />)}
          </div>
        ) : (
             <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p>Klassekartet er tomt. Gå til "Klasseverktøy" og "Klassekart" for å generere et.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
