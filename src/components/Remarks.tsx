
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
import { cn } from "@/lib/utils";
import { addRemark, deleteRemark } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";

const NUMBER_OF_PERIODS = 6;

interface RemarksProps {
  userId: string;
  students: Student[];
  initialRemarks: Remark[];
  onUpdate: () => void;
  seatingChart: SeatingChartData | null;
  settings: AppSettings;
}

const AddRemarkDialog = ({ student, onAdd, remarkTypes }: { student: Student; onAdd: (studentId: string, type: string) => void; remarkTypes: string[]; }) => {
  const [selectedType, setSelectedType] = useState(remarkTypes[0] || "Generell");
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-1 left-1 h-6 w-6">
            <PlusCircle />
        </Button>
      </DialogTrigger>
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
        <DialogClose asChild>
          <Button onClick={() => onAdd(student.id, selectedType)}>Legg til</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default function Remarks({ userId, students, initialRemarks, onUpdate, seatingChart, settings }: RemarksProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [remarks, setRemarks] = useState<Remark[]>(initialRemarks);
  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
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


  useEffect(() => {
    setRemarks(initialRemarks);
  }, [initialRemarks]);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  
  const getRemarksForStudent = (studentId: string, checkDate: Date, period?: number): Remark[] => {
    return remarks.filter(
      (r) =>
        r.studentId === studentId &&
        isSameDay(new Date(r.date), checkDate) &&
        (period === undefined || r.period === period)
    );
  };

  const handleAddRemark = async (studentId: string, type: string = "Generell") => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    const tempId = `temp-${Date.now()}`;
    const newRemarkData = { studentId, date, period: currentPeriod, type };
    const optimisticRemark: Remark = { id: tempId, ...newRemarkData };

    setRemarks(prev => [...prev, optimisticRemark]);
    
    try {
      const savedRemark = await addRemark(userId, newRemarkData);
      setRemarks(prev => prev.map(r => r.id === tempId ? savedRemark : r));
    } catch (error) {
      console.error(error);
      setRemarks(prev => prev.filter(r => r.id !== tempId));
      toast({ title: "Feil", description: `Kunne ikke legge til anmerkning for ${studentName}.`, variant: "destructive" });
    }
  };

  const handleRemoveLastRemark = async (studentId: string) => {
    const studentRemarksThisPeriod = getRemarksForStudent(studentId, date, currentPeriod)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (studentRemarksThisPeriod.length === 0) return;

    const lastRemark = studentRemarksThisPeriod[0];
    
    setRemarks(prev => prev.filter(r => r.id !== lastRemark.id));

    try {
      await deleteRemark(userId, lastRemark.id);
      onUpdate(); 
    } catch (error) {
      console.error(error);
      setRemarks(prev => [...prev, lastRemark]);
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
      <div className="relative">
        <AddRemarkDialog student={student} onAdd={handleAddRemark} remarkTypes={settings.remarkTypes || ["Generell"]} />
        <Button
            variant={countPeriod > 0 ? "destructive" : "secondary"}
            onClick={() => handleAddRemark(student.id, "Generell")}
            onContextMenu={(e) => { e.preventDefault(); handleRemoveLastRemark(student.id); }}
            onTouchStart={() => handlePressStart(student.id)}
            onTouchEnd={handlePressEnd}
            onMouseDown={() => handlePressStart(student.id)}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            className="justify-center h-auto py-2 flex-col w-28 h-20 relative touch-manipulation"
        >
            <span className="font-semibold text-xs">{student.name}</span>
            {countPeriod > 0 && (
            <div className="absolute top-1 right-1 flex items-center justify-center bg-background text-destructive rounded-full w-5 h-5 text-xs font-bold">
                {countPeriod}
            </div>
            )}
            {countDay > 0 && (
            <div className="absolute bottom-1 right-1 text-xs text-muted-foreground bg-background/50 rounded px-1">
                Total: {countDay}
            </div>
            )}
            <div className="flex items-center text-xs opacity-80 mt-1">
            <Megaphone className="mr-2" />
            <span>Registrer</span>
            </div>
        </Button>
      </div>
    );
  };

  const EmptyDesk = () => (
    <div className="w-28 h-20" />
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Registrer anmerkninger</CardTitle>
              <CardDescription>
                Trykk for generell, + for type. Langt trykk/høyreklikk for å fjerne siste.
              </CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full mt-2 sm:mt-0 sm:w-[280px] justify-start text-left font-normal"
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
          {seatingChart ? (
              <div className="grid gap-y-4">
                  {seatingChart.map((row, rowIndex) => (
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
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {students.map((student) => <StudentButton key={student.id} student={student} />)}
            </div>
          )}
        </CardContent>
      </Card>
      
      {dailyTotals.length > 0 && (
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

    