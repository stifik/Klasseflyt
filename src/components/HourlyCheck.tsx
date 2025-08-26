
"use client";

import { useState, useEffect } from "react";
import type { Student, HourlyCheck, BehaviorType, SeatingChartData, AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Smile, Annoyed, Handshake, CheckCircle2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";

const NUMBER_OF_PERIODS = 6;

interface HourlyCheckProps {
  students: Student[];
  initialChecks: HourlyCheck[];
  onUpdate: () => void;
  seatingChart: SeatingChartData | null;
  settings: AppSettings;
}

const behaviorConfig: Record<BehaviorType, { icon: React.ElementType, label: string, color: string, selectedColor: string }> = {
    WorkedWell: { icon: Smile, label: "Jobbet godt", color: "text-green-600", selectedColor: "bg-green-100 border-green-300" },
    Disturbed: { icon: Annoyed, label: "Forstyrret", color: "text-yellow-600", selectedColor: "bg-yellow-100 border-yellow-300" },
    HelpedOthers: { icon: Handshake, label: "Hjalp andre", color: "text-blue-600", selectedColor: "bg-blue-100 border-blue-300" }
};

export default function HourlyCheck({ students, initialChecks: checks, onUpdate, seatingChart, settings }: HourlyCheckProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeBehavior, setActiveBehavior] = useState<BehaviorType>('WorkedWell');
  const { toast } = useToast();
  
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
  
  const getChecksForStudent = (studentId: string, checkDate: Date, period: number, behavior?: BehaviorType): HourlyCheck[] => {
    if (!checks) return [];
    return checks.filter(
      (c) =>
        c.studentId === studentId &&
        isSameDay(new Date(c.date), checkDate) &&
        c.period === period &&
        (behavior === undefined || c.behavior === behavior)
    );
  };

  const handleStudentClick = async (studentId: string) => {
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    const existingCheck = getChecksForStudent(studentId, date, currentPeriod, activeBehavior);
    
    try {
        if (existingCheck.length > 0) {
            // If it exists, remove it (toggle off)
            await db.hourlyChecks.delete(existingCheck[0].id!);
        } else {
            // If it doesn't exist, add it (toggle on)
            await db.hourlyChecks.add({ studentId, date, period: currentPeriod, behavior: activeBehavior });
        }
    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: `Kunne ikke lagre atferd for ${studentName}.`, variant: "destructive" });
    }
  };

  const StudentButton = ({ student }: { student: Student }) => {
    const checksForPeriod = getChecksForStudent(student.id, date, currentPeriod);
    const hasActiveBehavior = checksForPeriod.some(c => c.behavior === activeBehavior);

    return (
        <button
            onClick={() => handleStudentClick(student.id)}
            className={cn(
                "flex flex-col items-center justify-center p-2 text-center border rounded-lg w-28 h-20 transition-all",
                "bg-secondary hover:bg-muted",
                { [behaviorConfig[activeBehavior].selectedColor]: hasActiveBehavior }
            )}
        >
             <span className="mb-1 text-xs font-semibold">{student.name}</span>
             <div className="flex gap-2">
                {Object.keys(behaviorConfig).map(key => {
                    const behavior = key as BehaviorType;
                    const config = behaviorConfig[behavior];
                    const isChecked = checksForPeriod.some(c => c.behavior === behavior);
                    if (!isChecked) return null;
                    return <config.icon key={behavior} className={cn("h-4 w-4", config.color)} />;
                })}
             </div>
        </button>
    );
  };

  const EmptyDesk = () => (
    <div className="w-28 h-20" />
  );
  
  const displayedChart = isFlipped 
    ? seatingChart?.map(row => [...row].reverse()).reverse() 
    : seatingChart;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Timeinnsjekk</CardTitle>
            <CardDescription>
              Velg en atferd, og klikk deretter på elevene det gjelder.
            </CardDescription>
              {seatingChart && (
              <div className="flex items-center space-x-2 mt-4">
                  <Switch id="flip-view-hourly" checked={isFlipped} onCheckedChange={setIsFlipped} />
                  <Label htmlFor="flip-view-hourly">Speilvendt visning (lærerperspektiv)</Label>
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
          <Label className="font-semibold">Velg atferd:</Label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(behaviorConfig).map(key => {
              const behavior = key as BehaviorType;
              const config = behaviorConfig[behavior];
              const isActive = activeBehavior === behavior;
              return (
                  <Button
                      key={behavior}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveBehavior(behavior)}
                      className={cn("justify-start", { [config.selectedColor]: isActive })}
                  >
                      {isActive && <CheckCircle2 className="mr-2 h-4 w-4" />}
                      <config.icon className={cn("mr-2 h-4 w-4", config.color)} />
                      {config.label}
                  </Button>
              );
            })}
          </div>
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
  );
}
