
"use client";

import { useState, useEffect, useMemo } from "react";
import type { Student, Remark, AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users, MessageSquare, Trash2, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { nb } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Label } from "./ui/label";
import { db } from "@/lib/db";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import { v4 as uuidv4 } from 'uuid';
import { Badge } from "./ui/badge";

const NUMBER_OF_PERIODS = 6;

interface RemarksProps {
  students: Student[];
  initialRemarks: Remark[];
  onUpdate: () => void;
  settings: AppSettings;
}

export default function Remarks({ students, initialRemarks, onUpdate, settings }: RemarksProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const sortedStudents = useMemo(() => [...students].sort((a,b) => a.name.localeCompare(b.name)), [students]);

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
          if (currentTime >= startTime && currentTime <= endTime) return period.period;
        }
      }
      return 1;
    };

    setCurrentPeriod(getCurrentPeriod());
    const interval = setInterval(() => setCurrentPeriod(getCurrentPeriod()), 60000); 
    return () => clearInterval(interval);
  }, [settings.schedule]);

  const handleAddLogEntry = async () => {
    if (selectedStudents.length === 0 || !message.trim()) {
      toast({
        title: "Mangler informasjon",
        description: "Vennligst velg minst én elev og skriv en melding.",
        variant: "destructive",
      });
      return;
    }

    const logGroupId = uuidv4();
    const newRemarks: Omit<Remark, 'id'>[] = selectedStudents.map(studentId => ({
      studentId,
      date,
      period: currentPeriod,
      type: "Loggført hendelse",
      message: message.trim(),
      logGroupId,
    }));

    try {
      await db.remarks.bulkAdd(newRemarks as Remark[]);
      toast({ title: "Hendelse loggført" });
      setMessage("");
      setSelectedStudents([]);
    } catch (error) {
      console.error(error);
      toast({ title: "Feil", description: "Kunne ikke lagre loggføring.", variant: "destructive" });
    }
  };

  const handleDeleteLogGroup = async (logGroupId: string) => {
    try {
        const remarksToDelete = await db.remarks.where('logGroupId').equals(logGroupId).toArray();
        const idsToDelete = remarksToDelete.map(r => r.id!).filter(id => id !== undefined);
        if (idsToDelete.length > 0) {
            await db.remarks.bulkDelete(idsToDelete);
            toast({ title: "Loggføring slettet" });
        }
    } catch (error) {
        console.error(error);
        toast({ title: "Feil", description: "Kunne ikke slette loggføring.", variant: "destructive" });
    }
  };


  const groupedRemarks = useMemo(() => {
    if (!initialRemarks) return [];
    const remarksForDay = initialRemarks.filter(r => isSameDay(new Date(r.date), date));

    const groups = remarksForDay.reduce((acc, remark) => {
      const groupId = remark.logGroupId || `remark-${remark.id}`;
      if (!acc[groupId]) {
        acc[groupId] = {
          ...remark,
          students: [],
        };
      }
      const student = students.find(s => s.id === remark.studentId);
      if (student) acc[groupId].students.push(student);
      return acc;
    }, {} as Record<string, Remark & { students: Student[] }>);
    
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [initialRemarks, date, students]);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Loggfør hendelse</CardTitle>
            <CardDescription>
              Skriv en melding og tagg de elevene det gjelder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: nb }) : <span>Velg dato</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                  </PopoverContent>
                </Popover>
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                      <Clock className="mr-2 h-4 w-4" />
                      <span>Time {currentPeriod}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1">
                    <div className="flex flex-col">
                        {Array.from({ length: NUMBER_OF_PERIODS }, (_, i) => i + 1).map(p => (
                            <Button key={p} variant={currentPeriod === p ? "secondary" : "ghost"} onClick={() => setCurrentPeriod(p)}>Time {p}</Button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
            </div>
             <div>
                <Label htmlFor="message">Melding</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Skriv hva som skjedde..." />
            </div>
            <div>
              <Label>Velg elever</Label>
              <ScrollArea className="h-40 w-full rounded-md border p-2">
                <div className="space-y-2">
                  {sortedStudents.map(student => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id!)}
                        onCheckedChange={(checked) => {
                          setSelectedStudents(prev => 
                            checked ? [...prev, student.id!] : prev.filter(id => id !== student.id)
                          );
                        }}
                      />
                      <Label htmlFor={`student-${student.id}`} className="font-normal">{student.name}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <Button onClick={handleAddLogEntry} className="w-full">
              <MessageSquare className="mr-2" />
              Loggfør
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Dagens logg</CardTitle>
            <CardDescription>
              Tidslinje over hendelser for {format(date, "PPP", { locale: nb })}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {groupedRemarks.length > 0 ? (
                <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                        {groupedRemarks.map((log) => (
                        <div key={log.logGroupId || log.id} className="relative pl-8">
                            <div className="absolute left-3 top-2 h-full w-px bg-border"></div>
                            <div className="absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Time {log.period}</p>
                                <p className="text-sm">{log.message}</p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                {log.students.map(s => <Badge key={s.id} variant="secondary">{s.name}</Badge>)}
                                </div>
                            </div>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-0 right-0 h-6 w-6"
                                onClick={() => handleDeleteLogGroup(log.logGroupId!)}
                             >
                                <Trash2 className="h-4 w-4 text-destructive" />
                             </Button>
                        </div>
                        ))}
                    </div>
                </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Ingen hendelser loggført for denne dagen.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
