
"use client";

import { useState, useMemo } from "react";
import type { Student, Remark } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Button } from "./ui/button";
import { X as XIcon } from "lucide-react";
import { subDays } from 'date-fns';

interface RemarkAnalysisProps {
  students: Student[];
  initialRemarks: Remark[];
}

const dayOfWeekMap = [
    { name: 'Søn', value: 0 }, { name: 'Man', value: 1 }, { name: 'Tir', value: 2 },
    { name: 'Ons', value: 3 }, { name: 'Tor', value: 4 }, { name: 'Fre', value: 5 }, { name: 'Lør', value: 6 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#4dd0e1', '#ffcdd2', '#d1c4e9'];

interface FilterState {
  day?: number;
  period?: number;
}

export default function RemarkAnalysis({ students, initialRemarks }: RemarkAnalysisProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("whole-class");
  const [filter, setFilter] = useState<FilterState>({});
  const [dateFilter, setDateFilter] = useState<string>("all-time");

  const analysisData = useMemo(() => {
    // 1. Create a definitive map of currently existing students and their IDs. This is the foundation.
    const studentMap = new Map(students.filter(s => s.id).map(s => [s.id!, s.name]));
    const studentIdSet = new Set(studentMap.keys());
    
    // 2. Filter out remarks from deleted students. This is the crucial step to prevent "Unknown Student".
    const validRemarks = initialRemarks.filter(r => studentIdSet.has(r.studentId));

    // 3. Apply date filter
    const now = new Date();
    const remarksFilteredByDate = validRemarks.filter(r => {
        const remarkDate = new Date(r.date);
        if (dateFilter === "7-days") return remarkDate >= subDays(now, 7);
        if (dateFilter === "30-days") return remarkDate >= subDays(now, 30);
        return true; // "all-time"
    });

    // 4. Apply student filter (whole class or specific student)
    const isWholeClass = selectedStudentId === "whole-class";
    const relevantRemarks = isWholeClass 
      ? remarksFilteredByDate 
      : remarksFilteredByDate.filter(r => r.studentId === selectedStudentId);

    // 5. Calculate data for the main overview charts
    const remarksByPeriod = Array.from({ length: 6 }, (_, i) => ({ name: `Time ${i + 1}`, value: i + 1, Antall: 0 }));
    relevantRemarks.forEach(r => { if (r.period >= 1 && r.period <= 6) remarksByPeriod[r.period - 1].Antall++; });
    
    const remarksByDay = Array.from({ length: 7 }, (_, i) => ({ name: dayOfWeekMap.find(d => d.value === i)!.name, value: i, Antall: 0 }));
    relevantRemarks.forEach(r => { remarksByDay[new Date(r.date).getDay()].Antall++; });

    const remarksByType = relevantRemarks.reduce((acc, r) => {
        const type = r.type || "Generell";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const pieChartData = Object.entries(remarksByType).map(([name, value]) => ({ name, value }));
    
    // 6. Handle drill-down logic
    let drillDownData: any[] | null = null;
    let drillDownTitle = "";
    let drillDownSubtitle = "";

    if (filter.day !== undefined) {
      const dayName = dayOfWeekMap.find(d => d.value === filter.day)!.name;
      const dayRemarks = relevantRemarks.filter(r => new Date(r.date).getDay() === filter.day);
      
      drillDownTitle = `Analyse for ${dayName}`;
      drillDownSubtitle = `Fordeling per time og elev.`;

      const periodCounts = Array.from({ length: 6 }, (_, i) => ({ name: `Time ${i + 1}`, value: i + 1, Antall: 0 }));
      dayRemarks.forEach(r => { if (r.period >= 1 && r.period <= 6) periodCounts[r.period - 1].Antall++; });

      const studentCounts = dayRemarks.reduce((acc, r) => {
          acc[r.studentId] = (acc[r.studentId] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
        
      const studentList = Object.entries(studentCounts)
          .map(([studentId, Antall]) => ({ name: studentMap.get(studentId), Antall }))
          .sort((a, b) => b.Antall - a.Antall);
      
      drillDownData = [
          { type: 'chart', title: 'Fordeling per time', data: periodCounts.filter(p => p.Antall > 0) },
          { type: 'chart', title: 'Elever med flest anmerkninger', data: studentList }
      ];

    } else if (filter.period !== undefined) {
      drillDownTitle = `Analyse for Time ${filter.period}`;
      const periodRemarks = relevantRemarks.filter(r => r.period === filter.period);

      const studentCounts = periodRemarks.reduce((acc, r) => {
          acc[r.studentId] = (acc[r.studentId] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);
        
      drillDownData = Object.entries(studentCounts)
            .map(([studentId, Antall]) => ({ name: studentMap.get(studentId), Antall }))
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
  }, [selectedStudentId, initialRemarks, students, filter, dateFilter]);
  
  const handleBarClick = (data: any, type: 'day' | 'period') => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      if (selectedStudentId === "whole-class") {
         setFilter({ [type]: payload.value });
      }
    }
  };
  
  const isWholeClass = selectedStudentId === "whole-class";
  const currentTitle = isWholeClass 
    ? 'Analyse for Hele Klassen' 
    : `Analyse for ${students.find(s => s.id === selectedStudentId)?.name || ''}`;
  const hasDrillDown = filter.day !== undefined || filter.period !== undefined;

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
                    <SelectItem key={student.id} value={student.id!}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {analysisData.total === 0 ? (
           <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Ingen anmerkninger å vise for dette utvalget.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {!hasDrillDown ? (
                <>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle className="text-xl">Oversikt</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{analysisData.total} <span className="text-lg font-normal text-muted-foreground">anmerkninger</span></p>
                            <p className="text-xs text-muted-foreground">i valgt periode</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Fordeling per type</CardTitle></CardHeader>
                        <CardContent className="h-[150px] -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={analysisData.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                                        {analysisData.byType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle>Fordeling per time</CardTitle></CardHeader>
                        <CardContent className="h-[250px] -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analysisData.byPeriod} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={(d) => isWholeClass && handleBarClick(d, 'period')}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis allowDecimals={false} fontSize={12} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                    <Bar dataKey="Antall" className={isWholeClass ? "cursor-pointer" : ""}>
                                        {analysisData.byPeriod.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Fordeling per ukedag</CardTitle></CardHeader>
                        <CardContent className="h-[250px] -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analysisData.byDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={(d) => isWholeClass && handleBarClick(d, 'day')}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis allowDecimals={false} fontSize={12} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                    <Bar dataKey="Antall" className={isWholeClass ? "cursor-pointer" : ""}>
                                        {analysisData.byDay.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
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
                            <XIcon className="w-4 h-4" /><span className="sr-only">Lukk</span>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {Array.isArray(analysisData.drillDownData?.[0]?.data) ? (
                            <div className="grid gap-6 md:grid-cols-2">
                                {(analysisData.drillDownData as any[]).map((chartInfo, index) => (
                                    <Card key={index}>
                                        <CardHeader><CardTitle>{chartInfo.title}</CardTitle></CardHeader>
                                        <CardContent className="h-[250px] -ml-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                 <BarChart data={chartInfo.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" fontSize={12} />
                                                    <YAxis allowDecimals={false} fontSize={12} />
                                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                                    <Bar dataKey="Antall">
                                                        {chartInfo.data.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[250px] -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysisData.drillDownData as any[]} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" fontSize={12} />
                                        <YAxis allowDecimals={false} fontSize={12} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                                        <Bar dataKey="Antall">
                                            {(analysisData.drillDownData as any[]).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    