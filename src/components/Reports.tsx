"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { generateWeeklySummary, GenerateWeeklySummaryInput } from '@/ai/flows/generate-weekly-summary';
import { Printer, Copy, Loader2 } from 'lucide-react';
import { getStudents, getSubjects, getHomework, getSubmissions, getDailyChecks } from '@/lib/firestore';


const statusColors: Record<HomeworkStatus, string> = {
  "Godkjent": "#22c55e",
  "Ikke levert": "#ef4444",
  "Må rettes": "#f59e0b",
  "Syk/Fravær": "#3b82f6",
  "Glemt bok": "#f97316",
};

export default function Reports() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dailyChecks, setDailyChecks] = useState<DailyCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [generatedMessages, setGeneratedMessages] = useState<Array<{ studentName: string; message: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => {
    async function loadData() {
      try {
        const [studentsData, subjectsData, homeworkData, submissionsData, dailyChecksData] = await Promise.all([
          getStudents(),
          getSubjects(),
          getHomework(),
          getSubmissions(),
          getDailyChecks()
        ]);
        setStudents(studentsData);
        setSubjects(subjectsData);
        setHomework(homeworkData.map(h => ({...h, date: new Date(h.date)})));
        setSubmissions(submissionsData);
        setDailyChecks(dailyChecksData.map(c => ({...c, date: new Date(c.date)})));
      } catch (error) {
        toast({ title: "Feil", description: "Kunne ikke laste data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const studentStats = useMemo(() => {
    return students.map(student => {
      const studentSubmissions = submissions.filter(s => s.studentId === student.id);
      const studentChecks = dailyChecks.filter(c => c.studentId === student.id);

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

      return {
        studentId: student.id,
        studentName: student.name,
        totalDelays: delays,
        ipadNotCharged,
        ipadNotBrought,
        statsBySubject,
      };
    });
  }, [students, subjects, homework, submissions, dailyChecks]);

  const uniqueWeeks = [...new Set(homework.map(h => h.week))].sort((a,b) => b-a);
  
  const handleGenerateSummaries = async () => {
    if (!selectedWeek) {
      toast({ title: "Mangler uke", description: "Vennligst velg en uke for å generere sammendrag.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGeneratedMessages([]);

    const weekHomeworkIds = new Set(homework.filter(h => h.week === selectedWeek).map(h => h.id));
    const studentsWithIssues = students.filter(student => 
      submissions.some(s => 
        s.studentId === student.id && 
        weekHomeworkIds.has(s.homeworkId) && 
        (s.status === 'Ikke levert' || s.status === 'Må rettes' || s.status === 'Glemt bok')
      )
    );

    if (studentsWithIssues.length === 0) {
        toast({ title: "Ingen mangler", description: `Fant ingen elever med utestående arbeid i uke ${selectedWeek}.` });
        setIsGenerating(false);
        return;
    }

    const promises = studentsWithIssues.map(async student => {
      const studentWeekSubmissions = submissions.filter(s => s.studentId === student.id && weekHomeworkIds.has(s.homeworkId));
      
      const input: GenerateWeeklySummaryInput = {
        studentName: student.name,
        week: `Uke ${selectedWeek}`,
        missingAssignments: studentWeekSubmissions.filter(s => s.status === 'Ikke levert').map(s => homework.find(h => h.id === s.homeworkId)?.title || ''),
        incompleteAssignments: studentWeekSubmissions.filter(s => s.status === 'Må rettes').map(s => homework.find(h => h.id === s.homeworkId)?.title || ''),
        correctedAssignments: [], // This could be enhanced with more detailed data tracking
        forgottenBooks: studentWeekSubmissions.filter(s => s.status === 'Glemt bok').map(s => subjects.find(sub => sub.id === homework.find(h => h.id === s.homeworkId)?.subjectId)?.name || ''),
      };
      const result = await generateWeeklySummary(input);
      return { studentName: student.name, message: result.message };
    });

    try {
      const results = await Promise.all(promises);
      setGeneratedMessages(results);
    } catch (error) {
       toast({ title: "Feil med AI", description: "Kunne ikke generere sammendrag.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast({ title: "Kopiert!", description: "Meldingen er kopiert til utklippstavlen." });
  };
  
  const handlePrint = () => {
    window.print();
  }
  
  if (loading) {
    return <div className="flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /> Laster data...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Elevstatistikk</CardTitle>
          <CardDescription>Oversikt over hver enkelt elevs fremgang og ansvarsområder.</CardDescription>
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
                        <span className="text-sm text-muted-foreground">Forsinkelser: {stat.totalDelays}</span>
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
                  <Card>
                    <CardHeader><CardTitle>iPad-ansvar</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                      <p>Glemt å lade: <strong>{stat.ipadNotCharged}</strong> gang(er)</p>
                      <p>Glemt å ta med: <strong>{stat.ipadNotBrought}</strong> gang(er)</p>
                    </CardContent>
                  </Card>
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
          <CardTitle>Ukesoppsummering for Meldinger (AI)</CardTitle>
          <CardDescription>Generer automatisk meldinger til elever med utestående arbeid for en valgt uke.</CardDescription>
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
            <Button onClick={handleGenerateSummaries} disabled={isGenerating} className="w-full sm:w-auto">
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
