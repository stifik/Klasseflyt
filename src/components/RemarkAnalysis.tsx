
"use client";

import { useState, useMemo } from "react";
import type { Student, Remark } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { nb } from "date-fns/locale";

interface RemarkAnalysisProps {
  students: Student[];
  initialRemarks: Remark[];
}

const dayOfWeekMap = [
    { name: 'Søn', value: 0 },
    { name: 'Man', value: 1 },
    { name: 'Tir', value: 2 },
    { name: 'Ons', value: 3 },
    { name: 'Tor', value: 4 },
    { name: 'Fre', value: 5 },
    { name: 'Lør', value: 6 },
];

export default function RemarkAnalysis({ students, initialRemarks }: RemarkAnalysisProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const studentData = useMemo(() => {
    if (!selectedStudentId) return null;

    const studentRemarks = initialRemarks.filter(r => r.studentId === selectedStudentId);

    const remarksByPeriod = Array.from({ length: 6 }, (_, i) => ({
      name: `Time ${i + 1}`,
      Antall: 0,
    }));
    studentRemarks.forEach(remark => {
      if (remark.period >= 1 && remark.period <= 6) {
        remarksByPeriod[remark.period - 1].Antall++;
      }
    });
    
    const remarksByDay = Array.from({ length: 7 }, (_, i) => ({
      name: dayOfWeekMap.find(d => d.value === i)?.name || '',
      Antall: 0,
    }));

    studentRemarks.forEach(remark => {
        const day = new Date(remark.date).getDay();
        remarksByDay[day].Antall++;
    });

    return {
      total: studentRemarks.length,
      byPeriod: remarksByPeriod.filter(p => p.Antall > 0),
      byDay: remarksByDay.filter(d => d.name !== 'Lør' && d.name !== 'Søn'),
    };
  }, [selectedStudentId, initialRemarks]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Anmerkningsanalyse</CardTitle>
                <CardDescription>Velg en elev for å se en analyse av deres anmerkninger.</CardDescription>
            </div>
            <Select value={selectedStudentId || ''} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full mt-2 sm:mt-0 sm:w-[280px]">
                <SelectValue placeholder="Velg elev..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        {selectedStudentId && studentData ? (
          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Oversikt</CardTitle>
                    <CardDescription>Totalt antall anmerkninger registrert.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{studentData.total} <span className="text-lg font-normal text-muted-foreground">anmerkninger</span></p>
                </CardContent>
            </Card>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Fordeling per time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {studentData.byPeriod.length > 0 ? (
                             <div className="h-[250px] -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={studentData.byPeriod} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis allowDecimals={false} fontSize={12} />
                                        <Tooltip 
                                            cursor={{ fill: 'hsl(var(--muted))' }}
                                            contentStyle={{ 
                                                backgroundColor: 'hsl(var(--background))', 
                                                borderColor: 'hsl(var(--border))',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar dataKey="Antall" fill="hsl(var(--primary))" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Ingen data å vise.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Fordeling per ukedag</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {studentData.byDay.some(d => d.Antall > 0) ? (
                             <div className="h-[250px] -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={studentData.byDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis allowDecimals={false} fontSize={12} />
                                        <Tooltip 
                                            cursor={{ fill: 'hsl(var(--muted))' }}
                                            contentStyle={{ 
                                                backgroundColor: 'hsl(var(--background))', 
                                                borderColor: 'hsl(var(--border))',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar dataKey="Antall" fill="hsl(var(--primary))" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Ingen data å vise.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Velg en elev fra menyen for å se statistikk.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
