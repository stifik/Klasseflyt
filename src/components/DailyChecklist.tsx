

"use client";

import { useState, useMemo } from "react";
import type { Student, DailyCheck, SeatingChartData, SeatingLayout, Absence } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, BatteryWarning, TabletSmartphone, UserX } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { givePoints } from "@/lib/rewardService";
import { useLiveQuery } from "dexie-react-hooks";

type IpadStatus = "OK" | "NotCharged" | "NotBrought";

interface DailyChecklistProps {
  students: Student[];
  seatingChart: SeatingChartData | null;
  activeLayout: SeatingLayout | null;
  absences: Absence[];
}

export default function DailyChecklist({ students, seatingChart, activeLayout, absences }: DailyChecklistProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [isFlipped, setIsFlipped] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // Add force update trigger
  const { toast } = useToast();
  
  // Get all data and filter in useMemo to ensure proper reactivity
  const allChecks = useLiveQuery(() => db.dailyChecks.toArray(), [forceUpdate]);
  const allAbsences = useLiveQuery(() => db.absences.toArray(), [forceUpdate]);
  
  // Get date string for filtering
  const dateString = useMemo(() => date.toISOString().split("T")[0], [date]);
  
  // Filter data for today using useMemo with proper dependencies
  const todaysChecks = useMemo(() => {
    if (!allChecks) return [];
    return allChecks.filter(c => new Date(c.date).toISOString().split("T")[0] === dateString);
  }, [allChecks, dateString]);
  
  const todaysAbsences = useMemo(() => {
    if (!allAbsences) return [];
    return allAbsences.filter(a => new Date(a.date).toISOString().split("T")[0] === dateString);
  }, [allAbsences, dateString]);

  // Memoize these functions with proper dependencies
  const getAbsenceForDate = useMemo(() => {
    return (studentId: string) => {
      return todaysAbsences.find(a => a.studentId === studentId);
    };
  }, [todaysAbsences]);

  const getCheckForDate = useMemo(() => {
    return (studentId: string) => {
      return todaysChecks.find(c => c.studentId === studentId);
    };
  }, [todaysChecks]);
  
  const getStatus = useMemo(() => {
    return (studentId: string): IpadStatus => {
      const check = getCheckForDate(studentId);
      if (!check) return "OK";
      if (!check.ipadBrought) return "NotBrought";
      if (!check.ipadCharged) return "NotCharged";
      return "OK";
    };
  }, [getCheckForDate]);
  
  const handleStatusChange = async (studentId: string) => {
    const currentStatus = getStatus(studentId);
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    const existingCheck = getCheckForDate(studentId);

    try {
        switch (currentStatus) {
            case "OK":
                await db.dailyChecks.add({ studentId, date, ipadCharged: false, ipadBrought: true });
                break;
            case "NotCharged":
                 if (existingCheck) {
                   await db.dailyChecks.update(existingCheck.id!, { ipadBrought: false });
                 }
                break;
            case "NotBrought":
                if (existingCheck) {
                  await db.dailyChecks.delete(existingCheck.id!);
                }
                break;
        }
        
        // Force a refresh of the data
        setForceUpdate(prev => prev + 1);
        
    } catch (error) {
        console.error(error);
        toast({title: "Feil", description: `Kunne ikke lagre endring for ${studentName}.`, variant: "destructive"});
    }
  };

  const handleAbsenceToggle = async (studentId: string) => {
    const existingAbsence = getAbsenceForDate(studentId);
    try {
      if (existingAbsence) {
        await db.absences.delete(existingAbsence.id!);
      } else {
        await db.absences.add({ studentId, date });
      }
      
      // Force a refresh of the data
      setForceUpdate(prev => prev + 1);
      
    } catch (error) {
      console.error(error);
      toast({title: "Feil", description: "Kunne ikke oppdatere fravær.", variant: "destructive"});
    }
  };
  
  const statusConfig: Record<IpadStatus, { variant: "default" | "destructive" | "outline", icon?: React.ReactNode, label: string }> = {
    OK: { variant: "default", label: "OK" },
    NotCharged: { variant: "outline", icon: <BatteryWarning className="mr-2" />, label: "Ikke ladet" },
    NotBrought: { variant: "destructive", icon: <TabletSmartphone className="mr-2" />, label: "Ikke medbrakt" },
  };

  const StudentButton = ({ student }: { student: Student }) => {
  // Guard against undefined id
  if (!student.id) return null;
    
  const status = getStatus(student.id);
  const config = statusConfig[status];
  const isAbsent = !!getAbsenceForDate(student.id);
  const [showGivePoints, setShowGivePoints] = useState(false);

  if (isAbsent) {
    return (
       <Button
        variant="secondary"
        onClick={() => handleAbsenceToggle(student.id!)}
        className="justify-center h-auto py-2 flex-col w-28 h-20 text-muted-foreground"
      >
        <span className="font-semibold text-xs">{student.name}</span>
         <div className="flex items-center text-xs">
           <UserX className="mr-2" />
           <span>Fravær</span>
        </div>
      </Button>
    );
  }
    
  return (
    <div className="relative w-28 h-20">
      <Button
        key={student.id}
        variant={config.variant}
        onClick={() => handleStatusChange(student.id!)}
        className={cn("justify-center h-auto py-2 flex-col w-full h-full", {
           "bg-green-600 hover:bg-green-700 text-white": status === "OK",
           "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500": status === "NotCharged",
        })}
      >
        <span className="font-semibold text-xs">{student.name}</span>
        <div className="flex items-center text-xs opacity-80">
           {config.icon}
           <span>{config.label}</span>
        </div>
      </Button>
      {/* Gi poeng for iPad ladet og klar */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute bottom-0 right-0 w-6 h-6"
        title="Gi poeng for iPad ladet og klar"
        onClick={async () => {
          const success = await givePoints(student.id!, 5, "iPad ladet og klar");
          if (success) {
            setShowGivePoints(true);
            setTimeout(() => setShowGivePoints(false), 1200);
          }
        }}
      >
        <span className="text-green-600 font-bold text-lg">+</span>
        <span className="sr-only">Gi poeng for iPad ladet og klar</span>
      </Button>
      {showGivePoints && (
        <div className="absolute bottom-7 right-0 bg-green-100 text-green-800 px-2 py-1 rounded text-xs shadow">+5 poeng!</div>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-0 right-0 w-6 h-6"
        onClick={() => handleAbsenceToggle(student.id!)}
      >
        <UserX className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        <span className="sr-only">Meld fravær</span>
      </Button>
    </div>
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
            <CardTitle>Daglig sjekk & Fravær</CardTitle>
            <CardDescription>
              Registrer status for iPad og fravær. Klikk på ikonet øverst til høyre på en elev for å melde fravær.
            </CardDescription>
             {seatingChart && (
                <div className="flex items-center space-x-2 mt-4">
                    <Switch id="flip-view-daily" checked={isFlipped} onCheckedChange={setIsFlipped} />
                    <Label htmlFor="flip-view-daily">Speilvendt visning (lærerperspektiv)</Label>
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
              <Calendar locale={nb} mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
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
                                
                                return student && student.id ? <StudentButton key={student.id} student={student} /> : <EmptyDesk key={`desk-${rowIndex}-${colIndex}`} />;
                            })}
                        </div>
                    );
                })}
            </div>
        ) : !seatingChart ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {students.filter(s => s.id).map((student) => <StudentButton key={student.id} student={student} />)}
          </div>
        ) : (
             <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p>Klassekartet er tomt. Gå til "Klasseverktøy &gt; Klassekart" for å generere et.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
