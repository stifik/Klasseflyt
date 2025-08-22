"use client";

import { useState } from "react";
import type { Student, DailyCheck } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface DailyChecklistProps {
  students: Student[];
  initialChecks: DailyCheck[];
}

export default function DailyChecklist({ students, initialChecks }: DailyChecklistProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [checks, setChecks] = useState<DailyCheck[]>(initialChecks);

  const handleCheckChange = (studentId: string, type: "ipadCharged" | "ipadBrought", checked: boolean) => {
    const todayString = date.toISOString().split("T")[0];
    const existingCheckIndex = checks.findIndex(
      (c) => c.studentId === studentId && c.date.toISOString().split("T")[0] === todayString
    );

    let newChecks;
    if (existingCheckIndex !== -1) {
      newChecks = [...checks];
      newChecks[existingCheckIndex] = { ...newChecks[existingCheckIndex], [type]: checked };
    } else {
      const newCheck: DailyCheck = {
        id: `dc${checks.length + 1}`,
        studentId,
        date,
        ipadCharged: type === "ipadCharged" ? checked : true,
        ipadBrought: type === "ipadBrought" ? checked : true,
      };
      newChecks = [...checks, newCheck];
    }
    setChecks(newChecks);
  };

  const getCheckStatus = (studentId: string, type: "ipadCharged" | "ipadBrought") => {
    const todayString = date.toISOString().split("T")[0];
    const check = checks.find(
      (c) => c.studentId === studentId && c.date.toISOString().split("T")[0] === todayString
    );
    return check ? check[type] : true;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Daglig Sjekk</CardTitle>
            <CardDescription>Kryss av for elever som ikke har med eller ladet iPad.</CardDescription>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Elev</TableHead>
                <TableHead className="text-center">Ladet iPad</TableHead>
                <TableHead className="text-center">Medbrakt iPad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={getCheckStatus(student.id, "ipadCharged")}
                      onCheckedChange={(checked) => handleCheckChange(student.id, "ipadCharged", !!checked)}
                      aria-label={`iPad ladet for ${student.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={getCheckStatus(student.id, "ipadBrought")}
                      onCheckedChange={(checked) => handleCheckChange(student.id, "ipadBrought", !!checked)}
                       aria-label={`iPad medbrakt for ${student.name}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
