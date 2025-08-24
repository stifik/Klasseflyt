
"use client";

import { useState, useMemo } from "react";
import type { Student, Remark } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Button } from "./ui/button";
import { X as XIcon } from "lucide-react";

interface RemarkAnalysisProps {
  students: Student[];
  initialRemarks: Remark[];
}

const dayOfWeekMap = [
    { name: 'Søn', value: 0 }, { name: 'Man', value: 1 }, { name: 'Tir', value: 2 },
    { name: 'Ons', value: 3 }, { name: 'Tor', value: 4 }, { name: 'Fre', value: 5 }, { name: 'Lør', value: 6 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

export default function RemarkAnalysis({ students, initialRemarks }: RemarkAnalysisProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ type: 'day' | 'period' | null; value: number | null }>({ type: null, value: null });

  const studentData = useMemo(() => {
    if (!selectedStudentId) return null;

    const studentRemarks = initialRemarks.filter(r => r.studentId === selectedStudentId);

    const remarksByPeriod = Array.from({ length: 6 }, (_, i) => ({ name: `Time ${i + 1}`, value: i + 1, Antall: 0 }));
    studentRemarks.forEach(remark => {
      if (remark.period >= 1 && remark.period <= 6) {
        remarksByPeriod[remark.period - 1].Antall++;
      }
    });
    
    const remarksByDay = Array.from({ length: 7 }, (_, i) => ({ name: dayOfWeekMap.find(d => d.value === i)?.name || '', value: i, Antall: 0 }));
    studentRemarks.forEach(remark => {
      const day = new Date(remark.date).getDay();
      remarksByDay[day].Antall++;
    });

    const remarksByType = studentRemarks.reduce((acc, remark) => {
        const type = remark.type || "Generell";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieChartData = Object.entries(remarksByType).map(([name, value]) => ({ name, value }));
    
    let drillDownData = null;
    let drillDownTitle = "";

    if (filter.type && filter.value !== null) {
      if (filter.type === 'day') {
        drillDownTitle = `Fordeling for ${dayOfWeekMap.find(d => d.value === filter.value)?.name}`;
        const filteredRemarks = studentRemarks.filter(r => new Date(r.date).getDay() === filter.value);
        drillDownData = Array.from({ length: 6 }, (_, i) => ({ name: `Time ${i + 1}`, Antall: 0 }));
        filteredRemarks.forEach(r => {
          if (r.period >= 1 && r.period <= 6) {
            (drillDownData as any[])[r.period - 1].Antall++;
          }
        });
      } else if (filter.type === 'period') {
        drillDownTitle = `Fordeling for Time ${filter.value}`;
        const filteredRemarks = studentRemarks.filter(r => r.period === filter.value);
        drillDownData = Array.from({ length: 5 }, (_, i) => ({ name: dayOfWeekMap.find(d => d.value === i + 1)?.name, Antall: 0 }));
        filteredRemarks.forEach(r => {
          const day = new Date(r.date).getDay();
          if (day >= 1 && day <= 5) { // Man-Fre
            (drillDownData as any[])[day - 1].Antall++;
          }
        });
      }
    }

    return {
      total: studentRemarks.length,
      byPeriod: remarksByPeriod.filter(p => p.Antall > 0),
      byDay: remarksByDay.filter(d => d.name !== 'Lør' && d.name !== 'Søn'),
      byType: pieChartData,
      drillDownData,
      drillDownTitle,
    };
  }, [selectedStudentId, initialRemarks, filter]);
  
  const handleBarClick = (data: any, type: 'day' | 'period') => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      setFilter({ type, value: payload.value });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>Anmerkningsanalyse</CardTitle>
                <CardDescription>Velg en elev for å se en analyse av deres anmerkninger. Klikk på søyler for å drille ned i data.</CardDescription>
            </div>
            <Select value={selectedStudentId || ''} onValueChange={(id) => { setSelectedStudentId(id); setFilter({type: null, value: null}); }}>
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
             <div className="grid gap-6 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Oversikt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{studentData.total} <span className="text-lg font-normal text-muted-foreground">anmerkninger</span></p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Fordeling per type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {studentData.byType.length > 0 ? (
                            <div className="h-[150px] -ml-4">
                               <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={studentData.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8">
                                            {studentData.byType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                             <p className="text-muted-foreground">Ingen data å vise.</p>
                        )}
                    </CardContent>
                </Card>
             </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Fordeling per time</CardTitle></CardHeader>
                    <CardContent>
                        {studentData.byPeriod.length > 0 ? (
                             <div className="h-[250px] -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={studentData.byPeriod} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={(d) => handleBarClick(d, 'period')}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis allowDecimals={false} fontSize={12} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                        <Bar dataKey="Antall" fill="hsl(var(--primary))" className="cursor-pointer" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <p className="text-muted-foreground">Ingen data å vise.</p>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Fordeling per ukedag</CardTitle></CardHeader>
                    <CardContent>
                        {studentData.byDay.some(d => d.Antall > 0) ? (
                             <div className="h-[250px] -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={studentData.byDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={(d) => handleBarClick(d, 'day')}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis allowDecimals={false} fontSize={12} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                        <Bar dataKey="Antall" fill="hsl(var(--primary))" className="cursor-pointer" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <p className="text-muted-foreground">Ingen data å vise.</p>}
                    </CardContent>
                </Card>
            </div>
            {filter.type && studentData.drillDownData && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Detaljert visning</CardTitle>
                            <CardDescription>{studentData.drillDownTitle}</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setFilter({type: null, value: null})}>
                            <XIcon className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {(studentData.drillDownData as any[]).some(d => d.Antall > 0) ? (
                            <div className="h-[250px] -ml-4">
                               <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={studentData.drillDownData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis allowDecimals={false} fontSize={12} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                        <Bar dataKey="Antall" fill="hsl(var(--accent))" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <p className="text-muted-foreground">Ingen anmerkninger å vise for dette utvalget.</p>}
                    </CardContent>
                </Card>
            )}
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
