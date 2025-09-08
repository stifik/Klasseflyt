
"use client";

import { useState, useEffect, useMemo } from "react";
import type { Student, HourlyCheck, BehaviorType, SeatingChartData, AppSettings, Remark, SeatingLayout } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, CheckCircle2, Star, MessageSquare, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { v4 as uuidv4 } from 'uuid';
import { Input } from "./ui/input";

const NUMBER_OF_PERIODS = 6;

interface HourlyCheckProps {
  students: Student[];
  initialChecks: HourlyCheck[];
  onUpdate: () => void;
  seatingChart: SeatingChartData | null;
  settings: AppSettings;
  activeLayout: SeatingLayout | null;
}

const colorConfig: Record<BehaviorType['color'], { text: string, bg: string, border: string }> = {
    green: { text: 'text-green-800', bg: 'bg-green-100', border: 'border-green-300' },
    yellow: { text: 'text-yellow-800', bg: 'bg-yellow-100', border: 'border-yellow-300' },
    blue: { text: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-300' },
    red: { text: 'text-red-800', bg: 'bg-red-100', border: 'border-red-300' },
    purple: { text: 'text-purple-800', bg: 'bg-purple-100', border: 'border-purple-300' },
    gray: { text: 'text-gray-800', bg: 'bg-gray-100', border: 'border-gray-300' },
};

const Icon = ({ name, className }: { name: string, className?: string }) => {
    const LucideIcon = (LucideIcons as any)[name];
    if (!LucideIcon) return <LucideIcons.Star className={className} />;
    return <LucideIcon className={className} />;
}

export default function HourlyCheck({ students, initialChecks, onUpdate, seatingChart, settings, activeLayout }: HourlyCheckProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const behaviorTypes = settings.behaviorTypes || [];
  const [activeBehaviorId, setActiveBehaviorId] = useState<string | null>(behaviorTypes.length > 0 ? behaviorTypes[0].id : null);
  
  const { toast } = useToast();
  
  const [localChecks, setLocalChecks] = useState(initialChecks || []);

  const [selectedStudentsForLog, setSelectedStudentsForLog] = useState<string[]>([]);
  const [logMessage, setLogMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const sortedStudents = useMemo(() => [...students].sort((a,b) => a.name.localeCompare(b.name)), [students]);

  const filteredStudents = useMemo(() => {
    return sortedStudents.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedStudents, searchQuery]);


  useEffect(() => {
    setLocalChecks(initialChecks || []);
  }, [initialChecks]);
  
  // Update active behavior if the list changes
  useEffect(() => {
    if (behaviorTypes.length > 0 && !behaviorTypes.find(bt => bt.id === activeBehaviorId)) {
        setActiveBehaviorId(behaviorTypes[0].id);
    } else if (behaviorTypes.length === 0) {
        setActiveBehaviorId(null);
    }
  }, [behaviorTypes, activeBehaviorId]);


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

  const isSameDay = (d1: Date, d2: Date) => {
    const d1Date = new Date(d1);
    const d2Date = new Date(d2);
    return d1Date.getFullYear() === d2Date.getFullYear() &&
           d1Date.getMonth() === d2Date.getMonth() &&
           d1Date.getDate() === d2Date.getDate();
  }
  
  const getChecksForStudent = (studentId: string, checkDate: Date, period: number): HourlyCheck[] => {
    return localChecks.filter(
      (c) =>
        c.studentId === studentId &&
        isSameDay(c.date, checkDate) &&
        c.period === period
    );
  };

  const handleStudentClick = async (studentId: string) => {
    if (!activeBehaviorId) return;
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    const dateStartOfDay = new Date(date);
    dateStartOfDay.setHours(0, 0, 0, 0);

    const existingCheck = localChecks.find(c => 
        c.studentId === studentId &&
        c.period === currentPeriod &&
        c.behaviorId === activeBehaviorId &&
        isSameDay(c.date, dateStartOfDay)
    );

    if (existingCheck) {
        setLocalChecks(prev => prev.filter(c => c.id !== existingCheck.id));
        try {
            await db.hourlyChecks.delete(existingCheck.id!);
        } catch (error) {
             console.error(error);
             toast({ title: "Feil", description: `Kunne ikke fjerne atferd for ${studentName}.`, variant: "destructive" });
             setLocalChecks(prev => [...prev, existingCheck]);
        }
    } else {
        const newCheck: Omit<HourlyCheck, 'id'> = { studentId, date, period: currentPeriod, behaviorId: activeBehaviorId };
        const tempId = -1 * Date.now();
        setLocalChecks(prev => [...prev, { ...newCheck, id: tempId }]);
        try {
            const newId = await db.hourlyChecks.add(newCheck as HourlyCheck);
            setLocalChecks(prev => prev.map(c => c.id === tempId ? { ...newCheck, id: newId } : c));
        } catch (error) {
            console.error(error);
            toast({ title: "Feil", description: `Kunne ikke lagre atferd for ${studentName}.`, variant: "destructive" });
            setLocalChecks(prev => prev.filter(c => c.id !== tempId));
        }
    }
  };

    const handleAddLogEntry = async () => {
        if (selectedStudentsForLog.length === 0 || !logMessage.trim()) {
        toast({
            title: "Mangler informasjon",
            description: "Vennligst velg minst én elev og skriv en melding.",
            variant: "destructive",
        });
        return;
        }

        const logGroupId = uuidv4();
        const newRemarks: Omit<Remark, 'id'>[] = selectedStudentsForLog.map(studentId => ({
        studentId,
        date,
        period: currentPeriod,
        type: "Loggført hendelse",
        message: logMessage.trim(),
        logGroupId,
        }));

        try {
        await db.remarks.bulkAdd(newRemarks as Remark[]);
        toast({ title: "Hendelse loggført" });
        setLogMessage("");
        setSelectedStudentsForLog([]);
        setSearchQuery(""); // Reset search query
        onUpdate();
        } catch (error) {
        console.error(error);
        toast({ title: "Feil", description: "Kunne ikke lagre loggføring.", variant: "destructive" });
        }
    };


  const StudentButton = ({ student }: { student: Student }) => {
    const checksForPeriod = getChecksForStudent(student.id, date, currentPeriod);
    const activeBehaviorType = behaviorTypes.find(bt => bt.id === activeBehaviorId);
    const hasActiveBehavior = checksForPeriod.some(c => c.behaviorId === activeBehaviorId);
    const selectedColorClasses = activeBehaviorType ? colorConfig[activeBehaviorType.color] : null;

    return (
        <button
            onClick={() => handleStudentClick(student.id)}
            className={cn(
                "flex flex-col items-center justify-center p-2 text-center border rounded-lg w-28 h-20 transition-all",
                "bg-secondary hover:bg-muted",
                { [cn(selectedColorClasses?.bg, selectedColorClasses?.border)]: hasActiveBehavior && selectedColorClasses }
            )}
        >
             <span className="mb-1 text-xs font-semibold">{student.name}</span>
             <div className="flex gap-2">
                {behaviorTypes.map(bt => {
                    const isChecked = checksForPeriod.some(c => c.behaviorId === bt.id);
                    if (!isChecked) return null;
                    const color = colorConfig[bt.color]?.text || 'text-gray-600';
                    return <Icon key={bt.id} name={bt.icon} className={cn("h-4 w-4", color)} />;
                })}
             </div>
        </button>
    );
  };

  const EmptyDesk = () => (
    <div className="w-28 h-20" />
  );
  
  return (
    <div className="space-y-6">
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
              <Calendar locale={nb} mode="single" selected={date} onSelect={(d) => { if (d) { setDate(d); setLocalChecks(initialChecks); } }} initialFocus />
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
            {behaviorTypes.length > 0 ? behaviorTypes.map(bt => {
              const isActive = activeBehaviorId === bt.id;
              const colors = colorConfig[bt.color];
              return (
                  <Button
                      key={bt.id}
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveBehaviorId(bt.id)}
                      className={cn("justify-start", { [cn(colors.bg, colors.border)]: isActive })}
                  >
                      {isActive && <CheckCircle2 className="mr-2 h-4 w-4" />}
                      <Icon name={bt.icon} className={cn("mr-2 h-4 w-4", colors.text)} />
                      {bt.label}
                  </Button>
              );
            }) : <p className="text-sm text-muted-foreground">Ingen atferdstyper definert. Gå til Innstillinger for å legge til.</p>}
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
                                    return <EmptyDesk key={`empty-${rowIndex}-${colIndex}`} />;
                                }
                                
                                const studentName = seatingChart[rowIndex]?.[colIndex]?.[0];
                                const student = studentName ? students.find(s => s.name === studentName) : null;
                                
                                return student ? <StudentButton key={student.id} student={student} /> : <EmptyDesk key={`desk-${rowIndex}-${colIndex}`} />;
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
                <p>Klassekartet er tomt. Gå til "Klasseverktøy &gt; Klassekart" for å generere et.</p>
            </div>
        )}
      </CardContent>
    </Card>

    <Card>
        <CardHeader>
            <CardTitle>Loggfør hendelse for flere elever</CardTitle>
            <CardDescription>
                Skriv en melding og velg elevene det gjelder for å loggføre en felles hendelse.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="message">Melding for Time {currentPeriod}</Label>
                    <Textarea id="message" value={logMessage} onChange={(e) => setLogMessage(e.target.value)} placeholder="Skriv hva som skjedde..." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="student-search">Velg elever</Label>
                    <Input
                        id="student-search"
                        placeholder="Søk etter elev..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="grid gap-4 mt-4 md:grid-cols-2">
                <Button onClick={handleAddLogEntry} className="w-full">
                    <MessageSquare className="mr-2" />
                    Loggfør hendelse
                </Button>
                <ScrollArea className="h-40 w-full rounded-md border p-2">
                <div className="space-y-2">
                    {filteredStudents.map(student => (
                    <div key={student.id} className="flex items-center space-x-2">
                        <Checkbox
                        id={`log-student-${student.id}`}
                        checked={selectedStudentsForLog.includes(student.id!)}
                        onCheckedChange={(checked) => {
                            setSelectedStudentsForLog(prev => 
                            checked ? [...prev, student.id!] : prev.filter(id => id !== student.id)
                            );
                        }}
                        />
                        <Label htmlFor={`log-student-${student.id}`} className="font-normal">{student.name}</Label>
                    </div>
                    ))}
                </div>
                </ScrollArea>
            </div>
        </CardContent>
    </Card>
    </div>
  );
}
