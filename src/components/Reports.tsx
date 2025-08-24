
"use client";

import { useState, useMemo } from 'react';
import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus, Remark, ReportSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { Printer, Copy, Loader2 } from 'lucide-react';
import { getWeekNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

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

// Lokal funksjon for å generere melding
const generateSummaryMessage = (
    studentName: string,
    week: number,
    missingAssignments: string[],
    incompleteAssignments: string[],
    forgottenBooks: string[],
    ipadNotChargedCount: number,
    ipadNotBroughtCount: number,
    remarksCount: number,
    settings: ReportSettings,
): string => {
    let message = `Hei,\nEn liten oppsummering for ${studentName} i uke ${week}.\n\n`;
    let hasIssues = false;

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
            hasIssues = true;
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
            hasIssues = true;
        }
    }

    if (settings.includeRemarks && remarksCount > 0) {
        message += `Anmerkninger: ${remarksCount} stk\n\n`;
        hasIssues = true;
    }

    if (!hasIssues) return "";

    message += "Vennlig hilsen,\nLæreren";
    return message;
};


export default function Reports({ students, subjects, homework, submissions, dailyChecks, remarks, settings }: ReportsProps) {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
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

        const comments = subjectSubmissions.filter(s => s.comment).map(s => ({
            homeworkTitle: homework.find(h => h.id === s.homeworkId)?.title || 'Ukjent lekse',
            comment: s.comment!
        }));

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          statusCounts,
          comments,
          chartData: Object.entries(statusCounts).map(([name, value]) => ({ name, value, fill: statusColors[name as HomeworkStatus] })),
        };
      });

      const remarksByDate = studentRemarks
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .reduce((acc, remark) => {
          const dateString = format(remark.date, 'PPP', { locale: nb });
          if (!acc[dateString]) {
            acc[dateString] = 0;
          }
          acc[dateString]++;
          return acc;
        }, {} as Record<string, number>);

      return {
        studentId: student.id,
        studentName: student.name,
        totalDelays: delays,
        ipadNotCharged,
        ipadNotBrought,
        totalRemarks: studentRemarks.length,
        remarksByDate,
        statsBySubject,
      };
    });
  }, [students, subjects, homework, submissions, dailyChecks, remarks]);

  const uniqueWeeks = [...new Set(homework.map(h => h.week))].sort((a,b) => b-a);
  
  const handleGenerateSummaries = async () => {
    if (!selectedWeek) {
      toast({ title: "Mangler uke", description: "Vennligst velg en uke for å generere sammendrag.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGeneratedMessages([]);

    const weekHomeworkIds = new Set(homework.filter(h => h.week === selectedWeek).map(h => h.id));

    const studentsWithIssues = students.filter(student => {
      const studentWeekSubmissions = submissions.filter(s => s.studentId === student.id && weekHomeworkIds.has(s.homeworkId));
      const studentWeekChecks = dailyChecks.filter(c => c.studentId === student.id && getWeekNumber(new Date(c.date)) === selectedWeek);
      const studentWeekRemarks = remarks.filter(r => r.studentId === student.id && getWeekNumber(new Date(r.date)) === selectedWeek);

      const hasHomeworkIssues = settings.includeHomework && studentWeekSubmissions.some(s => 
        s.status === 'Ikke levert' || s.status === 'Må rettes' || s.status === 'Glemt bok'
      );
      const hasIpadIssues = settings.includeIpad && studentWeekChecks.some(c => !c.ipadBrought || !c.ipadCharged);
      const hasRemarks = settings.includeRemarks && studentWeekRemarks.length > 0;
      const onlyAbsence = studentWeekSubmissions.length > 0 && studentWeekSubmissions.every(s => s.status === 'Syk/Fravær') && !hasIpadIssues && !hasRemarks;
      
      return (hasHomeworkIssues || hasIpadIssues || hasRemarks) && !onlyAbsence;
    });

    if (studentsWithIssues.length === 0) {
        toast({ title: "Ingen anmerkninger", description: `Fant ingen elever med anmerkninger i uke ${selectedWeek}.` });
        setIsGenerating(false);
        return;
    }

    const messages = studentsWithIssues.map(student => {
        const studentWeekSubmissions = submissions.filter(s => s.studentId === student.id && weekHomeworkIds.has(s.homeworkId));
        const studentWeekChecks = dailyChecks.filter(c => c.studentId === student.id && getWeekNumber(new Date(c.date)) === selectedWeek);
        const studentWeekRemarks = remarks.filter(r => r.studentId === student.id && getWeekNumber(new Date(r.date)) === selectedWeek);

        const message = generateSummaryMessage(
            student.name,
            selectedWeek,
            studentWeekSubmissions.filter(s => s.status === 'Ikke levert').map(s => homework.find(h => h.id === s.homeworkId)?.title || ''),
            studentWeekSubmissions.filter(s => s.status === 'Må rettes').map(s => homework.find(h => h.id === s.homeworkId)?.title || ''),
            studentWeekSubmissions.filter(s => s.status === 'Glemt bok').map(s => subjects.find(sub => sub.id === homework.find(h => h.id === s.homeworkId)?.subjectId)?.name || ''),
            studentWeekChecks.filter(c => c.ipadBrought && !c.ipadCharged).length,
            studentWeekChecks.filter(c => !c.ipadBrought).length,
            studentWeekRemarks.length,
            settings
        );
        return { studentName: student.name, message };
    }).filter(item => item.message); // Filtrer bort tomme meldinger

    setGeneratedMessages(messages);
    setIsGenerating(false);
  };

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast({ title: "Kopiert!", description: "Meldingen er kopiert til utklippstavlen." });
  };
  
  const handlePrint = () => {
    window.print();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Elevrapporter</CardTitle>
          <CardDescription>Oversikt over hver enkelt elevs fremgang og ansvarsområder. Åpne en elev for detaljer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4 no-print">
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Skriv ut rapport</Button>
          </div>
          <Accordion type="single" collapsible className="w-full printable-area" id="reports-section">
            {studentStats.map(stat => (
              <AccordionItem key={stat.studentId} value={stat.studentId} className="page-break">
                <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                        <span className="font-bold">{stat.studentName}</span>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Leksemangler: {stat.totalDelays}</span>
                          <span>Anmerkninger: {stat.totalRemarks}</span>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {stat.statsBySubject.map(subStat => (
                      <Card key={subStat.subjectId}>
                        <CardHeader>
                          <CardTitle>{subStat.subjectName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {subStat.chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={subStat.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="value" name="Antall" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-sm text-muted-foreground">Ingen data for dette faget.</p>}
                            {subStat.comments.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold">Kommentarer:</h4>
                                    <ul className="pl-4 mt-1 text-sm list-disc">
                                        {subStat.comments.map((c, i) => <li key={i}><strong>{c.homeworkTitle}:</strong> {c.comment}</li>)}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                   <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader><CardTitle>iPad-ansvar</CardTitle></CardHeader>
                        <CardContent className="text-sm">
                          <p>Glemt å lade: <strong>{stat.ipadNotCharged}</strong> gang(er)</p>
                          <p>Glemt å ta med: <strong>{stat.ipadNotBrought}</strong> gang(er)</p>
                        </CardContent>
                      </Card>
                       <Card>
                        <CardHeader><CardTitle>Anmerkninger ({stat.totalRemarks} totalt)</CardTitle></CardHeader>
                        <CardContent className="text-sm">
                           {Object.keys(stat.remarksByDate).length > 0 ? (
                                <ul className="list-disc list-inside">
                                    {Object.entries(stat.remarksByDate).map(([date, count]) => (
                                      <li key={date}>
                                        {date} {count > 1 && `(${count})`}
                                      </li>
                                    ))}
                                </ul>
                           ) : <p>Ingen anmerkninger registrert.</p>}
                        </CardContent>
                      </Card>
                  </div>
                  <div className="pt-4 text-xs text-center text-muted-foreground">
                    Tegnforklaring: 
                    {Object.entries(statusColors).map(([name, color]) => <span key={name} className="inline-flex items-center ml-4"><span className="w-3 h-3 mr-1 rounded-full" style={{backgroundColor: color}}></span>{name}</span>)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      
      <Card className="no-print">
        <CardHeader>
          <CardTitle>Ukesoppsummering for Meldinger</CardTitle>
          <CardDescription>Generer automatisk meldinger til foresatte for elever med anmerkninger for en valgt uke.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select onValueChange={(v) => setSelectedWeek(parseInt(v))}>
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
    </div>
  );
}
