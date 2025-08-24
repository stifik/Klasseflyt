
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus, Remark, ReportSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { Printer, Copy, Loader2, BookX } from 'lucide-react';
import { getWeekNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";


interface ReportsProps {
  students: Student[];
  subjects: Subject[];
  homework: Homework[];
  submissions: Submission[];
  dailyChecks: DailyCheck[];
  remarks: Remark[];
  settings: ReportSettings;
}

const statusColors: Record<HomeworkStatus, string> = {
  "Godkjent": "#22c55e",
  "Ikke levert": "#ef4444",
  "Må rettes": "#f59e0b",
  "Syk/Fravær": "#3b82f6",
  "Glemt bok": "#f97316",
};

const statusOrder: HomeworkStatus[] = ["Godkjent", "Må rettes", "Glemt bok", "Ikke levert", "Syk/Fravær"];


// Lokal funksjon for å generere melding
const generateSummaryMessage = (
    studentName: string,
    week: number,
    hasIssues: boolean,
    missingAssignments: string[],
    incompleteAssignments: string[],
    forgottenBooks: string[],
    ipadNotChargedCount: number,
    ipadNotBroughtCount: number,
    remarksCount: number,
    settings: ReportSettings,
): string => {
    
    if (hasIssues) {
      let message = `${settings.greeting}\nEn liten oppsummering for ${studentName} i uke ${week}.\n\n`;
      
      if (settings.includeHomework) {
          const homeworkIssues: string[] = [];
          if (missingAssignments.length > 0) {
              homeworkIssues.push(`Ikke levert: ${missingAssignments.join(', ')}`);
          }
          if (incompleteAssignments.length > 0) {
              homeworkIssues.push(`Må rettes: ${incompleteAssignments.join(', ')}`);
          }
           if (forgottenBooks.length > 0) {
              homeworkIssues.push(`Glemt bok: ${forgottenBooks.join(', ')}`);
          }

          if (homeworkIssues.length > 0) {
              message += `Lekser:\n- ${homeworkIssues.join('\n- ')}\n\n`;
          }
      }

      if (settings.includeIpad) {
          const ipadIssues: string[] = [];
          if (ipadNotChargedCount > 0) {
              ipadIssues.push(`Ikke ladet: ${ipadNotChargedCount} gang(er)`);
          }
          if (ipadNotBroughtCount > 0) {
              ipadIssues.push(`Ikke medbrakt: ${ipadNotBroughtCount} gang(er)`);
          }

          if (ipadIssues.length > 0) {
              message += `iPad:\n- ${ipadIssues.join('\n- ')}\n\n`;
          }
      }

      if (settings.includeRemarks && remarksCount > 0) {
          message += `Anmerkninger: ${remarksCount} stk\n\n`;
      }

      message += `${settings.closing}\n${settings.teacherName}`;
      return message;
    }

    if (settings.includePositiveFeedback) {
        return `${settings.greeting}\nEn liten oppdatering for ${studentName} i uke ${week}: Alt har vært helt supert! God innsats.\n\n${settings.closing}\n${settings.teacherName}`;
    }

    return "";
};


export default function Reports({ students, subjects, homework, submissions, dailyChecks, remarks, settings }: ReportsProps) {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(() => {
    // Sett nåværende uke som standard
    return getWeekNumber(new Date());
  });
  const [generatedMessages, setGeneratedMessages] = useState<Array<{ studentName: string; message: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const studentStats = useMemo(() => {
    return students.map(student => {
      const studentSubmissions = submissions.filter(s => s.studentId === student.id);
      const studentChecks = dailyChecks.filter(c => c.studentId === student.id);
      const studentRemarks = remarks.filter(r => r.studentId === student.id);

      const delays = studentSubmissions.filter(s => s.status === 'Ikke levert' || s.status === 'Må rettes').length;
      const ipadNotCharged = studentChecks.filter(c => !c.ipadCharged).length;
      const ipadNotBrought = studentChecks.filter(c => !c.ipadBrought).length;

      const statsBySubject = subjects.map(subject => {
        const subjectHomeworkIds = new Set(homework.filter(h => h.subjectId === subject.id).map(h => h.id));
        const subjectSubmissions = studentSubmissions.filter(s => subjectHomeworkIds.has(s.homeworkId));
        
        const statusCounts = subjectSubmissions.reduce((acc, sub) => {
          acc[sub.status] = (acc[sub.status] || 0) + 1;
          return acc;
        }, {} as Record<HomeworkStatus, number>);
        
        const totalSubmissions = subjectSubmissions.length;

        const comments = subjectSubmissions.filter(s => s.comment).map(s => ({
            homeworkTitle: homework.find(h => h.id === s.homeworkId)?.title || 'Ukjent lekse',
            week: homework.find(h => h.id === s.homeworkId)?.week || 0,
            comment: s.comment!
        }));

        const problemSubmissions = subjectSubmissions
            .filter(s => s.status === "Må rettes")
            .map(s => ({
                week: homework.find(h => h.id === s.homeworkId)?.week,
                title: homework.find(h => h.id === s.homeworkId)?.title,
                comment: s.comment
            }))
            .filter(s => s.title);

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          statusCounts,
          comments,
          totalSubmissions,
          problemSubmissions,
        };
      });

      const remarksByDate = studentRemarks
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .reduce((acc, remark) => {
          const dateString = format(new Date(remark.date), 'PPP', { locale: nb });
          if (!acc[dateString]) {
            acc[dateString] = 0;
          }
          acc[dateString]++;
          return acc;
        }, {} as Record<string, number>);

      const remarksByPeriod = studentRemarks.reduce((acc, remark) => {
          const period = remark.period || 0;
          acc[period] = (acc[period] || 0) + 1;
          return acc;
      }, {} as Record<number, number>);

      const remarksByWeek = studentRemarks.reduce((acc, remark) => {
          const week = getWeekNumber(new Date(remark.date));
          acc[week] = (acc[week] || 0) + 1;
          return acc;
      }, {} as Record<number, number>);
      
      const periodChartData = Array.from({ length: 6 }, (_, i) => ({
          name: `T${i + 1}`,
          count: remarksByPeriod[i + 1] || 0,
      }));

      return {
        studentId: student.id,
        studentName: student.name,
        totalDelays: delays,
        ipadNotCharged,
        ipadNotBrought,
        totalRemarks: studentRemarks.length,
        remarksByDate,
        remarksByPeriod,
        remarksByWeek,
        periodChartData,
      };
    });
  }, [students, subjects, homework, submissions, dailyChecks, remarks]);

  const uniqueWeeks = [...new Set(homework.map(h => h.week))].sort((a,b) => b-a);
  
  useEffect(() => {
    const currentWeek = getWeekNumber(new Date());
    if (!uniqueWeeks.includes(currentWeek) && uniqueWeeks.length > 0) {
      setSelectedWeek(uniqueWeeks[0]);
    } else {
      setSelectedWeek(currentWeek);
    }
  }, [homework]);

  const handleGenerateSummaries = async () => {
    if (!selectedWeek) {
      toast({ title: "Mangler uke", description: "Vennligst velg en uke for å generere sammendrag.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGeneratedMessages([]);

    const weekHomeworkIds = new Set(homework.filter(h => h.week === selectedWeek).map(h => h.id));

    const studentsToReport = students.map(student => {
      const studentWeekSubmissions = submissions.filter(s => s.studentId === student.id && weekHomeworkIds.has(s.homeworkId));
      const studentWeekChecks = dailyChecks.filter(c => c.studentId === student.id && getWeekNumber(new Date(c.date)) === selectedWeek);
      const studentWeekRemarks = remarks.filter(r => r.studentId === student.id && getWeekNumber(new Date(r.date)) === selectedWeek);

      const hasHomeworkIssues = settings.includeHomework && studentWeekSubmissions.some(s => 
        s.status === 'Ikke levert' || s.status === 'Må rettes' || s.status === 'Glemt bok'
      );
      const hasIpadIssues = settings.includeIpad && studentWeekChecks.some(c => !c.ipadBrought || !c.ipadCharged);
      const hasRemarks = settings.includeRemarks && studentWeekRemarks.length > 0;
      
      const hasAnyIssues = hasHomeworkIssues || hasIpadIssues || hasRemarks;
      
      const onlyAbsence = !hasIpadIssues && !hasRemarks && studentWeekSubmissions.length > 0 && studentWeekSubmissions.every(s => s.status === 'Syk/Fravær');

      if (onlyAbsence) return null;
      if (hasAnyIssues || settings.includePositiveFeedback) {
        return { student, hasAnyIssues, studentWeekSubmissions, studentWeekChecks, studentWeekRemarks };
      }
      return null;
    }).filter(Boolean);


    if (studentsToReport.length === 0) {
        toast({ title: "Ingen data", description: `Fant ingen relevante hendelser for uke ${selectedWeek}.` });
        setIsGenerating(false);
        return;
    }

    const messages = studentsToReport.map(report => {
        if (!report) return null;
        const { student, hasAnyIssues, studentWeekSubmissions, studentWeekChecks, studentWeekRemarks } = report;

        const message = generateSummaryMessage(
            student.name,
            selectedWeek,
            hasAnyIssues,
            studentWeekSubmissions.filter(s => s.status === 'Ikke levert').map(s => homework.find(h => h.id === s.homeworkId)?.title || ''),
            studentWeekSubmissions.filter(s => s.status === 'Må rettes').map(s => homework.find(h => h.id === s.homeworkId)?.title || ''),
            studentWeekSubmissions.filter(s => s.status === 'Glemt bok').map(s => subjects.find(sub => sub.id === homework.find(h => h.id === s.homeworkId)?.subjectId)?.name || ''),
            studentWeekChecks.filter(c => c.ipadBrought && !c.ipadCharged).length,
            studentWeekChecks.filter(c => !c.ipadBrought).length,
            studentWeekRemarks.length,
            settings
        );
        return { studentName: student.name, message };
    }).filter((item): item is { studentName: string; message: string } => item !== null && item.message !== "");

    if (messages.length === 0) {
        toast({ title: "Ingenting å rapportere", description: `Alle elever hadde en prikkfri uke ${selectedWeek}.` });
    }

    setGeneratedMessages(messages);
    setIsGenerating(false);
  };

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast({ title: "Kopiert!", description: "Meldingen er kopiert til utklippstavlen." });
  };
  
  return (
    <div className="space-y-6">
      <Card className="no-print">
        <CardHeader>
          <CardTitle>Ukesoppsummering for Meldinger</CardTitle>
          <CardDescription>Generer automatisk meldinger til foresatte for elever med anmerkninger for en valgt uke.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={selectedWeek ? String(selectedWeek) : ''} onValueChange={(v) => setSelectedWeek(parseInt(v))}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Velg uke" />
              </SelectTrigger>
              <SelectContent>
                {uniqueWeeks.map(w => <SelectItem key={w} value={String(w)}>Uke {w}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerateSummaries} disabled={isGenerating || !selectedWeek} className="w-full sm:w-auto">
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Generer Oppsummering
            </Button>
          </div>

          {generatedMessages.length > 0 && (
            <div className="mt-4 space-y-4">
              {generatedMessages.map(({ studentName, message }, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{studentName}</CardTitle>
                     <Button variant="outline" size="sm" onClick={() => handleCopyMessage(message)}><Copy className="mr-2 h-4 w-4"/> Kopier</Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Elevrapporter</CardTitle>
                    <CardDescription>Oversikt over hver enkelt elevs fremgang og ansvarsområder.</CardDescription>
                </div>
                <Button onClick={() => window.print()} className="no-print"><Printer className="mr-2 h-4 w-4" /> Skriv ut rapport</Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4 printable-area">
            {studentStats.map(stat => (
              <Card key={stat.studentId} className="page-break">
                <CardHeader>
                    <div className="flex justify-between w-full pr-4">
                        <CardTitle>{stat.studentName}</CardTitle>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Leksemangler: {stat.totalDelays}</span>
                          <span>Anmerkninger: {stat.totalRemarks}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4 pt-0">
                  <div className="grid gap-4 md:grid-cols-2">
                     {stat.statsBySubject.map(subStat => (
                      <Card key={subStat.subjectId}>
                        <CardHeader>
                          <CardTitle className="text-base">{subStat.subjectName} ({subStat.totalSubmissions})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {subStat.totalSubmissions > 0 ? (
                            <div className="w-full h-4 flex rounded-full overflow-hidden bg-gray-200">
                              {statusOrder.map(status => {
                                const count = subStat.statusCounts[status] || 0;
                                if (count === 0) return null;
                                const percentage = (count / subStat.totalSubmissions) * 100;
                                return (
                                  <div
                                    key={status}
                                    className="h-full progress-bar-segment"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: statusColors[status],
                                    }}
                                    title={`${status}: ${count}`}
                                  />
                                );
                              })}
                            </div>
                          ) : <p className="text-sm text-muted-foreground">Ingen leksedata for dette faget.</p>}
                          
                           {subStat.problemSubmissions.length > 0 && (
                                <div className="pt-2 border-t">
                                    <h4 className="font-semibold text-sm flex items-center gap-2"><BookX className="w-4 h-4 text-yellow-600" /> Lekser som må rettes</h4>
                                    <ul className="pl-4 mt-1 text-sm list-disc space-y-1">
                                        {subStat.problemSubmissions.map((c, i) => 
                                            <li key={i}>
                                                <strong>Uke {c.week}: {c.title}</strong>
                                                {c.comment && <p className="text-xs text-muted-foreground pl-2 italic">"{c.comment}"</p>}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                   <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader><CardTitle className="text-base">iPad-ansvar</CardTitle></CardHeader>
                        <CardContent className="text-sm">
                          <p>Glemt å lade: <strong>{stat.ipadNotCharged}</strong> gang(er)</p>
                          <p>Glemt å ta med: <strong>{stat.ipadNotBrought}</strong> gang(er)</p>
                        </CardContent>
                      </Card>
                       <Card>
                        <CardHeader><CardTitle className="text-base">Anmerkninger ({stat.totalRemarks} totalt)</CardTitle></CardHeader>
                        <CardContent>
                           {stat.totalRemarks > 0 ? (
                            <div className="h-[150px] -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stat.periodChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                                        <Bar dataKey="count" fill="hsl(var(--primary))" name="Antall" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                           ) : <p className="text-sm text-muted-foreground">Ingen anmerkninger registrert.</p>}
                           <div className="mt-4 space-y-1 text-sm">
                                {Object.entries(stat.remarksByWeek).map(([week, count]) => (
                                    <div key={week} className="flex justify-between">
                                        <span>Uke {week}:</span>
                                        <span className="font-medium">{count} anm.</span>
                                    </div>
                                ))}
                           </div>
                        </CardContent>
                      </Card>
                  </div>
                  <div className="pt-4 text-xs text-center text-muted-foreground">
                    Tegnforklaring: 
                    {statusOrder.map((name) => <span key={name} className="inline-flex items-center ml-4"><span className="w-3 h-3 mr-1 rounded-full" style={{backgroundColor: statusColors[name]}}></span>{name}</span>)}
                  </div>
                </CardContent>
              </Card>
            ))}
             <div className="pt-4 text-xs text-center text-muted-foreground no-print">
                -- Slutt på rapport --
              </div>
        </CardContent>
      </Card>
    </div>
  );
}

