
"use client";

import { useState, useEffect } from "react";
import type { Student, DailyCheck } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, BatteryWarning, TabletSmartphone } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { setDailyCheck, deleteDailyCheckByStudentAndDate } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";

type IpadStatus = "OK" | "NotCharged" | "NotBrought";

interface DailyChecklistProps {
  students: Student[];
  initialChecks: DailyCheck[];
  onUpdate: () => void;
}

export default function DailyChecklist({ students, initialChecks, onUpdate }: DailyChecklistProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [checks, setChecks] = useState<DailyCheck[]>(initialChecks);
  const { toast } = useToast();

  useEffect(() => {
    setChecks(initialChecks);
  }, [initialChecks]);

  const getCheckForDate = (studentId: string, checkDate: Date) => {
    const dateString = checkDate.toISOString().split("T")[0];
    return checks.find(
      (c) => c.studentId === studentId && new Date(c.date).toISOString().split("T")[0] === dateString
    );
  };
  
  const getStatus = (studentId: string): IpadStatus => {
    const check = getCheckForDate(studentId, date);
    if (!check) return "OK";
    if (!check.ipadBrought) return "NotBrought";
    if (!check.ipadCharged) return "NotCharged";
    return "OK";
  };
  
  const handleStatusChange = async (studentId: string) => {
    const currentStatus = getStatus(studentId);
    const dateString = date.toISOString().split("T")[0];
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';

    let newStatus: IpadStatus;
    let newCheckData: DailyCheck | null = null;
    
    switch (currentStatus) {
      case "OK":
        newStatus = "NotCharged";
        newCheckData = { id: '', studentId, date, ipadCharged: false, ipadBrought: true };
        break;
      case "NotCharged":
        newStatus = "NotBrought";
        newCheckData = { id: '', studentId, date, ipadCharged: false, ipadBrought: false };
        break;
      case "NotBrought":
      default:
        newStatus = "OK";
        break;
    }
    
    // Optimistic UI Update
    const previousChecks = [...checks];
    if (newCheckData) {
        // Remove old check for this student and date, and add new one
        const otherChecks = checks.filter(c => !(c.studentId === studentId && new Date(c.date).toISOString().split('T')[0] === dateString));
        setChecks([...otherChecks, newCheckData]);
    } else {
        // Remove the check (status is OK)
        setChecks(checks.filter(c => !(c.studentId === studentId && new Date(c.date).toISOString().split('T')[0] === dateString)));
    }

    try {
        if (newStatus === 'OK') {
            await deleteDailyCheckByStudentAndDate(studentId, date);
        } else {
            // newCheckData will not be null here
            await setDailyCheck(newCheckData!);
        }
        // Data is out of sync, trigger a full refetch in the background
        onUpdate(); 
    } catch (error) {
        console.error(error);
        // Revert UI on error
        setChecks(previousChecks);
        toast({title: "Feil", description: `Kunne ikke lagre endring for ${studentName}.`, variant: "destructive"});
    }
  };
  
  const statusConfig: Record<IpadStatus, { variant: "default" | "destructive" | "outline", icon?: React.ReactNode, label: string }> = {
    OK: { variant: "default", label: "OK" },
    NotCharged: { variant: "outline", icon: <BatteryWarning className="mr-2" />, label: "Ikke ladet" },
    NotBrought: { variant: "destructive", icon: <TabletSmartphone className="mr-2" />, label: "Ikke medbrakt" },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Daglig iPad-sjekk</CardTitle>
            <CardDescription>Registrer status for hver elevs iPad.</CardDescription>
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
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {students.map((student) => {
                const status = getStatus(student.id);
                const config = statusConfig[status];
                return (
                    <Button
                        key={student.id}
                        variant={config.variant}
                        onClick={() => handleStatusChange(student.id)}
                        className={cn("justify-center h-auto py-2 flex-col", {
                           "bg-green-600 hover:bg-green-700 text-white": status === "OK",
                           "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500": status === "NotCharged",
                        })}
                    >
                        <span className="font-semibold">{student.name}</span>
                        <div className="flex items-center text-xs opacity-80">
                           {config.icon}
                           <span>{config.label}</span>
                        </div>
                    </Button>
                )
            })}
        </div>
      </CardContent>
    </Card>
  );
}
