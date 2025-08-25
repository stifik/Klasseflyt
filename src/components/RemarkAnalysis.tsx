
"use client";

import { useState, useMemo } from "react";
import type { Student, Remark } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Button } from "./ui/button";
import { X as XIcon } from "lucide-react";
import { subDays, startOfDay } from 'date-fns';

interface RemarkAnalysisProps {
  students: Student[];
  initialRemarks: Remark[];
}

const dayOfWeekMap = [
    { name: 'Søn', value: 0 }, { name: 'Man', value: 1 }, { name: 'Tir', value: 2 },
    { name: 'Ons', value: 3 }, { name: 'Tor', value: 4 }, { name: 'Fre', value: 5 }, { name: 'Lør', value: 6 },
];
const dayOfWeekArray = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#4dd0e1', '#ffcdd2', '#d1c4e9'];


interface FilterState {
  day?: number;
  period?: number;
}

export default function RemarkAnalysis({ students, initialRemarks }: RemarkAnalysisProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("whole-class");
  const [filter, setFilter] = useState<FilterState>({});
  const [dateFilter, setDateFilter] = useState<string>("all-time");

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Ukjent';

  const analysisData = useMemo(() => {
    const isWholeClass = selectedStudentId === "whole-class";
    
    const now = new Date();
    const filteredRemarksByDate = initialRemarks.filter(r => {
        const remarkDate = new Date(r.date);
        if (dateFilter === "7-days") {
            return remarkDate >= subDays(now, 7);
        }
        if (dateFilter === "30-days") {
            return remarkDate >= subDays(now, 30);
        }
        return true; // "all-time"
    });

    let relevantRemarks = isWholeClass 
      ? filteredRemarksByDate 
      : filteredRemarksByDate.filter(r => r.studentId === selectedStudentId);

    // Initial charts data
    const remarksByPeriod = Array.from({ length: 6 }, (_, i) => ({ name: `Time ${i + 1}`, value: i + 1, Antall: 0 }));
    relevantRemarks.forEach(remark => {
      if (remark.period >= 1 && remark.period <= 6) {
        remarksByPeriod[remark.period - 1].Antall++;
      }
    });
    
    const remarksByDay = Array.from({ length: 7 }, (_, i) => ({ name: dayOfWeekMap.find(d => d.value === i)?.name || '', value: i, Antall: 0 }));
    relevantRemarks.forEach(remark => {
      const day = new Date(remark.date).getDay();
      remarksByDay[day].Antall++;
    });

    const remarksByType = relevantRemarks.reduce((acc, remark) => {
        const type = remark.type || "Generell";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pieChartData = Object.entries(remarksByType).map(([name, value]) => ({ name, value }));
    
    // Drill-down logic
    let drillDownData: any[] | null = null;
    let drillDownTitle = "";
    let drillDownSubtitle = "";
    

    if (filter.day !== undefined) {
      const dayName = dayOfWeekArray[filter.day];
      relevantRemarks = relevantRemarks.filter(r => new Date(r.date).getDay() === filter.day);
      
      if (filter.period !== undefined) {
        drillDownTitle = `Anmerkninger på ${dayName}, Time ${filter.period}`;
        relevantRemarks = relevantRemarks.filter(r => r.period === filter.period);
        
        const studentCounts = relevantRemarks.reduce((acc, remark) => {
            acc[remark.studentId] = (acc[remark.studentId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        drillDownData = Object.entries(studentCounts)
            .map(([studentId, Antall]) => ({ name: getStudentName(studentId), Antall }))
            .sort((a,b) => b.Antall - a.Antall);

      } else {
        drillDownTitle = `Analyse for ${dayName}`;
        drillDownSubtitle = `Fordeling per time og elev. Klikk på en time for å filtrere videre.`;
        
        const periodCounts = Array.from({ length: 6 }, (_, i) => ({ name: `Time ${i + 1}`, value: i + 1, Antall: 0 }));
        relevantRemarks.forEach(remark => {
          if (remark.period >= 1 && remark.period <= 6) {
            periodCounts[remark.period - 1].Antall++;
          }
        });

        const studentCounts = relevantRemarks.reduce((acc, remark) => {
            acc[remark.studentId] = (acc[remark.studentId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const studentList = Object.entries(studentCounts)
            .map(([studentId, Antall]) => ({ name: getStudentName(studentId), Antall }))
            .sort((a, b) => b.Antall - a.Antall);

        drillDownData = [
          { type: 'chart', title: 'Fordeling per time', data: periodCounts.filter(p => p.Antall > 0), chartType: 'period' },
          { type: 'chart', title: 'Elever med flest anmerkninger', data: studentList, chartType: 'student' }
        ];
      }
    } else if (filter.period !== undefined) {
      drillDownTitle = `Analyse for Time ${filter.period}`;
      relevantRemarks = relevantRemarks.filter(r => r.period === filter.period);

      const studentCounts = relevantRemarks.reduce((acc, remark) => {
          acc[remark.studentId] = (acc[remark.studentId] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
        
      drillDownData = Object.entries(studentCounts)
            .map(([studentId, Antall]) => ({ name: getStudentName(studentId), Antall }))
            .sort((a,b) => b.Antall - a.Antall);
    }


    return {
      total: relevantRemarks.length,
      byPeriod: remarksByPeriod.filter(p => p.Antall > 0),
      byDay: remarksByDay.filter(d => d.name !== 'Lør' && d.name !== 'Søn' && d.Antall > 0),
      byType: pieChartData,
      drillDownData,
      drillDownTitle,
      drillDownSubtitle,
    };
  }, [selectedStudentId, initialRemarks, filter, students, dateFilter, getStudentName]);
  
  const handleBarClick = (data: any, type: 'day' | 'period' | 'student') => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      
      if (isWholeClass) {
        if (type === 'day') {
          setFilter({ day: payload.value });
        } else if (type === 'period' && filter.day !== undefined) {
          // Drill down from day -> period
          setFilter({ ...filter, period: payload.value });
        } else if (type === 'period') {
           setFilter({ period: payload.value });
        }
      }
    }
  };
  
  const isWholeClass = selectedStudentId === "whole-class";
  const currentTitle = isWholeClass 
    ? 'Analyse for Hele Klassen' 
    : `Analyse for ${students.find(s => s.id === selectedStudentId)?.name || ''}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <CardTitle>{currentTitle}</CardTitle>
                <CardDescription>Velg en elev, tidsperiode, og klikk på søyler for å drille ned i data.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Velg tidsperiode..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all-time">Hele perioden</SelectItem>
                      <SelectItem value="30-days">Siste 30 dager</SelectItem>
                      <SelectItem value="7-days">Siste 7 dager</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={selectedStudentId} onValueChange={(id) => { setSelectedStudentId(id); setFilter({}); }}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Velg elev..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whole-class">Hele Klassen</SelectItem>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {initialRemarks.length > 0 ? (
          <div className="space-y-6">
            {!filter.day && !filter.period ? (
                <>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Oversikt</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{analysisData.total} <span className="text-lg font-normal text-muted-foreground">anmerkninger</span></p>
                             <p className="text-xs text-muted-foreground">i valgt periode</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Fordeling per type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {analysisData.byType.length > 0 ? (
                                <div className="h-[150px] -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={analysisData.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                                                {analysisData.byType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                                            <Legend wrapperStyle={{fontSize: "12px"}}/>
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
                            {analysisData.byPeriod.length > 0 ? (
                                <div className="h-[250px] -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analysisData.byPeriod} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={(d) => isWholeClass && handleBarClick(d, 'period')}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" fontSize={12} />
                                            <YAxis allowDecimals={false} fontSize={12} />
                                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                            <Bar dataKey="Antall" className={isWholeClass ? "cursor-pointer" : ""}>
                                                {analysisData.byPeriod.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <p className="text-muted-foreground">Ingen data å vise.</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Fordeling per ukedag</CardTitle></CardHeader>
                        <CardContent>
                            {analysisData.byDay.length > 0 ? (
                                <div className="h-[250px] -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analysisData.byDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={(d) => isWholeClass && handleBarClick(d, 'day')}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" fontSize={12} />
                                            <YAxis allowDecimals={false} fontSize={12} />
                                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                            <Bar dataKey="Antall" className={isWholeClass ? "cursor-pointer" : ""}>
                                                {analysisData.byDay.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <p className="text-muted-foreground">Ingen data å vise.</p>}
                        </CardContent>
                    </Card>
                </div>
                </>
            ) : (
                 <Card>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle>{analysisData.drillDownTitle}</CardTitle>
                            {analysisData.drillDownSubtitle && <CardDescription>{analysisData.drillDownSubtitle}</CardDescription>}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setFilter({})}>
                            <XIcon className="w-4 h-4" />
                            <span className="sr-only">Lukk detaljvisning</span>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {analysisData.drillDownData && analysisData.drillDownData.length > 0 ? (
                            Array.isArray(analysisData.drillDownData[0]?.data) ? (
                                // Multi-chart view (e.g., day breakdown)
                                <div className="grid gap-6 md:grid-cols-2">
                                    {(analysisData.drillDownData as any[]).map((chartInfo, index) => (
                                        <Card key={index}>
                                            <CardHeader><CardTitle>{chartInfo.title}</CardTitle></CardHeader>
                                            <CardContent className="h-[250px] -ml-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                     <BarChart data={chartInfo.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={(d) => handleBarClick(d, chartInfo.chartType)}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="name" fontSize={12} />
                                                        <YAxis allowDecimals={false} fontSize={12} />
                                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                                        <Bar dataKey="Antall" className={chartInfo.chartType === 'period' ? 'cursor-pointer' : ''}>
                                                            {chartInfo.data.map((entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                // Single chart view
                                <div className="h-[250px] -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analysisData.drillDownData as any[]} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" fontSize={12} />
                                            <YAxis allowDecimals={false} fontSize={12} />
                                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                            <Bar dataKey="Antall">
                                                {(analysisData.drillDownData as any[]).map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )
                        ) : (
                            <p className="text-muted-foreground">Ingen anmerkninger å vise for dette utvalget.</p>
                        )}
                    </CardContent>
                </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Ingen anmerkninger er registrert ennå.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
