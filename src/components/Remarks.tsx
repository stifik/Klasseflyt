
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { Student, Remark, SeatingChartData, AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Megaphone, ListChecks, PlusCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Switch } from "./ui/switch";

const NUMBER_OF_PERIODS = 6;

interface RemarksProps {
  students: Student[];
  initialRemarks: Remark[];
  onUpdate: () => void;
  seatingChart: SeatingChartData | null;
  settings: AppSettings;
}

const AddRemarkDialog = ({ student, onAdd, remarkTypes, children }: { student: Student; onAdd: (studentId: string, type: string) => void; remarkTypes: string[]; children: React.ReactNode; }) => {
  const [selectedType, setSelectedType] = useState(remarkTypes[0] || "Generell");
  const [isOpen, setIsOpen] = useState(false);
  
  const handleAddClick = () => {
    onAdd(student.id, selectedType);
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Legg til anmerkning for {student.name}</DialogTitle>
          <DialogDescription>Velg type anmerkning. Dette hjelper med analysen senere.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
           <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="remark-type" className="text-right">Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Velg type..." />
                    </SelectTrigger>
                    <SelectContent>
                        {remarkTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                </Select>
           </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Avbryt</Button>
            </DialogClose>
            <Button onClick={handleAddClick}>Legg til</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function Remarks({ students, initialRemarks: remarks, onUpdate, seatingChart, settings }: RemarksProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const { toast } = useToast();
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  
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
      
      const nextPeriod = schedule
        .filter(p => p.startTime)
        .find(p => {
            const [startHour, startMinute] = p.startTime.split(':').map(Number);
            return (startHour * 60 + startMinute) > currentTime;
        });

      return nextPeriod ? nextPeriod.period : 1;
    };

    setCurrentPeriod(getCurrentPeriod());

    const interval = setInterval(() => {
        setCurrentPeriod(getCurrentPeriod());
    }, 60000); 

    return () => clearInterval(interval);
  }, [settings.schedule]);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  
  const getRemarksForStudent = (studentId: string, checkDate: Date, period?: number): Remark[] => {
    if (!remarks) return [];
    return remarks.filter(
      (r) =>
        r.studentId === studentId &&
        isSameDay(new Date(r.date), checkDate) &&
        (period === undefined || r.period === period)
    );
  };

  const handleAddRemark = async (studentId: string, type: string = "Generell") => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    try {
      await db.remarks.add({ studentId, date, period: currentPeriod, type });
    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: `Kunne ikke legge til anmerkning for ${studentName}.`, variant: "destructive" });
    }
  };

  const handleRemoveLastRemark = async (studentId: string) => {
    const studentRemarksThisPeriod = getRemarksForStudent(studentId, date, currentPeriod)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (studentRemarksThisPeriod.length === 0) return;

    const lastRemark = studentRemarksThisPeriod[0];
    
    try {
      if (lastRemark.id) {
          await db.remarks.delete(lastRemark.id);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: `Kunne ikke fjerne anmerkning.`, variant: "destructive" });
    }
  };


  const handlePressStart = (studentId: string) => {
    pressTimer.current = setTimeout(() => {
      handleRemoveLastRemark(studentId);
    }, 500); 
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const dailyTotals = useMemo(() => {
    if (!remarks) return [];
    const totals = students.map(student => {
      const studentRemarks = getRemarksForStudent(student.id, date);
      return {
        studentId: student.id,
        studentName: student.name,
        count: studentRemarks.length,
      };
    }).filter(s => s.count > 0);
    
    return totals.sort((a, b) => b.count - a.count);
  }, [remarks, date, students]);

  const StudentButton = ({ student }: { student: Student }) => {
    const remarksForPeriod = getRemarksForStudent(student.id, date, currentPeriod);
    const remarksForDay = getRemarksForStudent(student.id, date);
    const countPeriod = remarksForPeriod.length;
    const countDay = remarksForDay.length;
    
    return (
        <Button
            variant={countPeriod > 0 ? "destructive" : "secondary"}
            onClick={() => handleAddRemark(student.id, "Generell")}
            onContextMenu={(e) => { e.preventDefault(); handleRemoveLastRemark(student.id); }}
            onTouchStart={() => handlePressStart(student.id)}
            onTouchEnd={handlePressEnd}
            onMouseDown={() => handlePressStart(student.id)}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            className="justify-between items-stretch h-auto p-0 flex-col w-28 h-20 relative touch-manipulation"
        >
            <div className="flex-grow flex items-center justify-center p-2 flex-col">
              <span className="font-semibold text-xs">{student.name}</span>
              <div className="flex items-center text-xs opacity-80 mt-1">
                <Megaphone className="mr-2" />
                <span>Registrer</span>
              </div>
            </div>
            
            <AddRemarkDialog student={student} onAdd={handleAddRemark} remarkTypes={settings.remarkTypes || ["Generell"]}>
               <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center self-stretch px-2 bg-black/10 hover:bg-black/20"
                >
                  <PlusCircle className="w-5 h-5" />
                </div>
            </AddRemarkDialog>

            {countPeriod > 0 && (
            <div className="absolute top-1 right-1 flex items-center justify-center bg-background text-destructive rounded-full w-5 h-5 text-xs font-bold">
                {countPeriod}
            </div>
            )}
            {countDay > 0 && (
            <div className="absolute bottom-1 left-1 text-xs text-muted-foreground bg-background/50 rounded px-1">
                Total: {countDay}
            </div>
            )}
        </Button>
    );
  };

  const EmptyDesk = () => (
    <div className="w-28 h-20" />
  );
  
  const displayedChart = isFlipped 
    ? seatingChart?.map(row => [...row].reverse()).reverse() 
    : seatingChart;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Registrer anmerkninger</CardTitle>
              <CardDescription>
                Klikk for generell, + for type. Langt trykk/høyreklikk for å fjerne siste.
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
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-wrap gap-2 pt-4">
              {Array.from({ length: NUMBER_OF_PERIODS }, (_, i) => i + 1).map(period => (
                  <Button 
                      key={period} 
                      variant={currentPeriod === period ? "default" : "outline"}
                      onClick={() => setCurrentPeriod(period)}
                  >
                      Time {period}
                  </Button>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          {displayedChart ? (
              <div className="grid gap-y-4">
                  {displayedChart.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex flex-wrap justify-start gap-x-4 gap-y-4">
                          {row.map((desk, deskIndex) => (
                             <div key={deskIndex} className="flex gap-1">
                                  {desk ? desk.map((studentName) => {
                                      const student = students.find(s => s.name === studentName);
                                      return student ? <StudentButton key={student.id} student={student} /> : <EmptyDesk key={student?.id || deskIndex} />;
                                  }) : <EmptyDesk />}
                             </div>
                          ))}
                      </div>
                  ))}
              </div>
          ) : seatingChart ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p>Klassekartet er tomt. Gå til "Klassekart" for å generere et.</p>
            </div>
           ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {students.map((student) => <StudentButton key={student.id} student={student} />)}
            </div>
          )}
        </CardContent>
      </Card>
      
      {dailyTotals && dailyTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
                <ListChecks className="mr-2" />
                Daglig Oppsummering
            </CardTitle>
            <CardDescription>
              Totalt antall anmerkninger for {format(date, "PPP", { locale: nb })}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dailyTotals.map(item => (
                <li key={item.studentId} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                  <span className="font-medium">{item.studentName}</span>
                  <span className="font-bold text-lg">{item.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
