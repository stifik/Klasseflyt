
"use client";

import { useState, useEffect, useRef } from "react";
import type { Student, Remark, SeatingChartData } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Megaphone } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { addRemark, deleteRemark } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";

const NUMBER_OF_PERIODS = 6;

interface RemarksProps {
  userId: string;
  students: Student[];
  initialRemarks: Remark[];
  onUpdate: () => void;
  seatingChart: SeatingChartData | null;
}

export default function Remarks({ userId, students, initialRemarks, onUpdate, seatingChart }: RemarksProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [remarks, setRemarks] = useState<Remark[]>(initialRemarks);
  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
  const { toast } = useToast();
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

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

  const handleAddRemark = async (studentId: string) => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    
    try {
      await addRemark(userId, { studentId, date, period: currentPeriod });
      onUpdate(); // Trigger data refresh
    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: `Kunne ikke legge til anmerkning for ${studentName}.`, variant: "destructive" });
    }
  };

  const handleRemoveLastRemark = async (studentId: string) => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    const studentRemarksThisPeriod = getRemarksForStudent(studentId, date, currentPeriod)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (studentRemarksThisPeriod.length === 0) return;

    const lastRemark = studentRemarksThisPeriod[0];
    
    try {
      await deleteRemark(userId, lastRemark.id);
      onUpdate(); // Trigger data refresh
    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: `Kunne ikke fjerne anmerkning for ${studentName}.`, variant: "destructive" });
    }
  };

  const handlePressStart = (studentId: string) => {
    pressTimer.current = setTimeout(() => {
      handleRemoveLastRemark(studentId);
    }, 500); // 500ms for long press
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const StudentButton = ({ student }: { student: Student }) => {
    const remarksForPeriod = getRemarksForStudent(student.id, date, currentPeriod);
    const remarksForDay = getRemarksForStudent(student.id, date);
    const countPeriod = remarksForPeriod.length;
    const countDay = remarksForDay.length;
    
    return (
      <Button
        variant={countPeriod > 0 ? "destructive" : "secondary"}
        onClick={() => handleAddRemark(student.id)}
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
    );
  };

  const EmptyDesk = () => (
    <div className="w-28 h-20" />
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Registrer anmerkninger</CardTitle>
            <CardDescription>
              Kort trykk for å legge til. Langt trykk eller høyreklikk for å fjerne siste.
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
  );
}
