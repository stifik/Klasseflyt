

"use client";

import { useState, useMemo, FC } from 'react';
import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus, Remark, ReportSettings, HourlyCheck, BehaviorType, AppSettings, Test, TestResult, LearningGoal, GoalAchievement, SubmissionAttempt } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { Printer, Copy, Loader2, Clock, ChevronDown, ChevronUp, MessageSquare, Award, Target, Check, MessageSquarePlus, BadgeCheck } from 'lucide-react';
import { getWeekNumber } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RemarkAnalysis from './RemarkAnalysis';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import * as LucideIcons from "lucide-react";
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Textarea } from './ui/textarea';
import { db } from '@/lib/db';

interface ReportsProps {
  students: Student[];
  subjects: Subject[];
  homework: Homework[];
  submissions: Submission[];
  submissionAttempts: SubmissionAttempt[];
  tests: Test[];
  testResults: TestResult[];
  learningGoals: LearningGoal[];
  goalAchievements: GoalAchievement[];
  dailyChecks: DailyCheck[];
  remarks: Remark[];
  hourlyChecks: HourlyCheck[];
  settings: AppSettings;
  activeSubTab?: string | null;
  onSubTabChange: (subTab: string) => void;
}

const statusColors: Record<HomeworkStatus, string> = {
  "Godkjent": "#22c55e",
  "Må rettes": "#f59e0b",
  "Glemt bok": "#f97316",
  "Ikke levert": "#ef4444",
  "Syk/Fravær": "#3b82f6",
};

const statusOrder: HomeworkStatus[] = ["Godkjent", "Må rettes", "Glemt bok", "Ikke levert", "Syk/Fravær"];

const generateSummaryMessage = (
    studentName: string,
    week: number,
    approvedAssignments: string[],
    missingAssignments: string[],
    incompleteAssignments: string[],
    forgottenBooks: string[],
    ipadNotChargedCount: number,
    ipadNotBroughtCount: number,
    remarksCount: number,
    weekTestResults: { subjectName: string, testTitle: string, score: number, maxScore: number }[],
    settings: ReportSettings,
    additionalText?: string,
): string => {
    
    const homeworkIssues: string[] = [];
    if (settings.includeHomework) {
        if (missingAssignments.length > 0) homeworkIssues.push(`Ikke levert: ${missingAssignments.join(', ')}`);
        if (incompleteAssignments.length > 0) homeworkIssues.push(`Må rettes: ${incompleteAssignments.join(', ')}`);
        if (forgottenBooks.length > 0) homeworkIssues.push(`Glemt bok: ${forgottenBooks.join(', ')}`);
    }

    const ipadIssues: string[] = [];
    if (settings.includeIpad) {
        if (ipadNotChargedCount > 0) ipadIssues.push(`Ikke ladet: ${ipadNotChargedCount} gang(er)`);
        if (ipadNotBroughtCount > 0) ipadIssues.push(`Ikke medbrakt: ${ipadNotBroughtCount} gang(er)`);
    }

    const hasRemarks = settings.includeRemarks && remarksCount > 0;
    const hasIssues = homeworkIssues.length > 0 || ipadIssues.length > 0 || hasRemarks;
    const hasTestResults = settings.includeTests && weekTestResults.length > 0;
    
    const homeworkIsPerfect = settings.includeHomework && approvedAssignments.length > 0 && homeworkIssues.length === 0;
    const ipadIsPerfect = settings.includeIpad && ipadIssues.length === 0;

    if (!hasIssues && !hasTestResults && !settings.includePositiveFeedback) {
        return "";
    }

    let message = `${settings.greeting}\nEn liten oppsummering for ${studentName} i uke ${week}:\n\n`;
    
    if (settings.includePositiveFeedback) {
        if (!hasIssues) {
            message += `${settings.positiveFeedbackMessage}\n\n`;
        } else {
            if (homeworkIsPerfect && ipadIsPerfect) {
                message += `${settings.positiveFeedbackBoth}\n\n`;
            } else {
                if (homeworkIsPerfect) {
                    message += `${settings.positiveFeedbackHomework}\n\n`;
                }
                if (ipadIsPerfect) {
                    message += `${settings.positiveFeedbackIpad}\n\n`;
                }
            }
        }
    }

    if (homeworkIssues.length > 0) {
        message += `Status for lekser:\n`;
        if (approvedAssignments.length > 0) {
            message += `- Godkjent: ${approvedAssignments.join(', ')}\n`;
        }
        message += `- ${homeworkIssues.join('\n- ')}\n\n`;
    }

    if (ipadIssues.length > 0) {
        message += `iPad:\n- ${ipadIssues.join('\n- ')}\n\n`;
    }
    
    if (hasRemarks) {
        message += `Anmerkninger: ${remarksCount} stk\n\n`;
    }

    if (hasTestResults) {
        message += `Resultater:\n`;
        weekTestResults.forEach(r => {
            message += `- ${r.subjectName} (${r.testTitle}): ${r.score}/${r.maxScore} poeng\n`;
        });
        message += '\n';
    }
    
    if (additionalText && additionalText.trim()) {
        message += `${additionalText.trim()}\n\n`;
    }

    message += `${settings.closing}\n${settings.teacherName}`;
    return message;
};

const WeeklySummary = ({ students, subjects, homework, submissions, submissionAttempts, dailyChecks, remarks, settings, tests, testResults }: Omit<ReportsProps, 'activeSubTab' | 'onSubTabChange' | 'learningGoals' | 'goalAchievements' | 'hourlyChecks'>) => {
    const { toast } = useToast();
    const [selectedWeek, setSelectedWeek] = useState<number>(() => getWeekNumber(new Date()));
    const [generatedMessages, setGeneratedMessages] = useState<Array<{ studentName: string; message: string }>>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [additionalText, setAdditionalText] = useState("");
    const [reportableTestResultIds, setReportableTestResultIds] = useState<number[]>([]);
    
    const uniqueWeeks = useMemo(() => {
        const currentWeek = getWeekNumber(new Date());
        const safeHomework = homework || [];
        const safeDailyChecks = dailyChecks || [];
        const safeRemarks = remarks || [];
        const safeTests = tests || [];

        const homeworkWeeks = safeHomework.map(h => h.week);
        const checkWeeks = safeDailyChecks.map(c => getWeekNumber(new Date(c.date)));
        const remarkWeeks = safeRemarks.map(r => getWeekNumber(new Date(r.date)));
        const testWeeks = safeTests.map(t => getWeekNumber(new Date(t.date)));
        
        const allWeeks = new Set([currentWeek, ...homeworkWeeks, ...checkWeeks, ...remarkWeeks, ...testWeeks]);
        return Array.from(allWeeks).sort((a,b) => b-a);
    }, [homework, dailyChecks, remarks, tests]);
  
    const handleGenerateSummaries = () => {
        setIsGenerating(true);
        setGeneratedMessages([]);
        setReportableTestResultIds([]);

        const safeHomework = homework || [];
        const safeSubmissions = submissions || [];
        const safeSubmissionAttempts = submissionAttempts || [];
        const safeDailyChecks = dailyChecks || [];
        const safeRemarks = remarks || [];
        const safeTests = tests || [];
        const safeTestResults = testResults || [];

        const weekSubmissions = safeSubmissions.filter(s => {
            const hw = safeHomework.find(h => h.id === s.homeworkId);
            return hw && hw.week === selectedWeek;
        });

        const weekSubmissionAttempts = safeSubmissionAttempts.filter(att => 
            new Date(att.date).getFullYear() === new Date().getFullYear() && 
            getWeekNumber(new Date(att.date)) === selectedWeek
        );
        
        const weekHomeworkIds = new Set(safeHomework.filter(h => h.week === selectedWeek).map(h => h.id));
        
        // Include tests from current week, but also look for un-reported results from any time
        const weekTests = safeTests.filter(t => getWeekNumber(new Date(t.date)) === selectedWeek);
        const unreportedResults = safeTestResults.filter(r => r.reportedInWeek === undefined);

        const allStudentTestResults = [...new Set([...weekTests.map(t => t.id!), ...unreportedResults.map(r => r.testId)])];
        const relevantTests = safeTests.filter(t => allStudentTestResults.includes(t.id));
        
        const allIncludedTestResultIds: number[] = [];

        const studentsToReport = students.map(student => {
            const studentWeekSubmissionIds = new Set(weekSubmissions.filter(s => s.studentId === student.id).map(s => s.id));
            const studentWeekAttempts = weekSubmissionAttempts.filter(att => studentWeekSubmissionIds.has(att.submissionId));
            
            const studentWeekChecks = safeDailyChecks.filter(c => c.studentId === student.id && getWeekNumber(new Date(c.date)) === selectedWeek);
            const studentWeekRemarks = safeRemarks.filter(r => r.studentId === student.id && getWeekNumber(new Date(r.date)) === selectedWeek);
            
            const studentUnreportedResults = unreportedResults.filter(r => r.studentId === student.id && relevantTests.some(t => t.id === r.testId));
            
            studentUnreportedResults.forEach(r => allIncludedTestResultIds.push(r.id!));

            const hasHomeworkIssues = settings.reportSettings.includeHomework && studentWeekAttempts.some(att => 
                att.status === 'Ikke levert' || att.status === 'Må rettes' || att.status === 'Glemt bok'
            );
            const hasIpadIssues = settings.reportSettings.includeIpad && studentWeekChecks.some(c => !c.ipadBrought || !c.ipadCharged);
            const hasRemarks = settings.reportSettings.includeRemarks && studentWeekRemarks.length > 0;
            const hasTests = settings.reportSettings.includeTests && studentUnreportedResults.length > 0;
            
            const hasAnyIssues = hasHomeworkIssues || hasIpadIssues || hasRemarks;
            
            const onlyAbsence = !hasIpadIssues && !hasRemarks && studentWeekAttempts.length > 0 && studentWeekAttempts.every(att => att.status === 'Syk/Fravær');

            if (onlyAbsence) return null;
            if (hasAnyIssues || hasTests || settings.reportSettings.includePositiveFeedback) {
                return { student, studentWeekAttempts, studentWeekChecks, studentWeekRemarks, studentUnreportedResults };
            }
            return null;
        }).filter(Boolean);

        if (studentsToReport.length === 0) {
            toast({ title: "Ingen data", description: `Fant ingen relevante hendelser for uke ${selectedWeek}.` });
            setIsGenerating(false);
            return;
        }

        setReportableTestResultIds([...new Set(allIncludedTestResultIds)]);

        const messages = studentsToReport.map(report => {
            if (!report) return null;
            const { student, studentWeekAttempts, studentWeekChecks, studentWeekRemarks, studentUnreportedResults } = report;
            
            const formatHomeworkWithSubject = (attempt: SubmissionAttempt) => {
                const submission = safeSubmissions.find(s => s.id === attempt.submissionId);
                if (!submission) return 'Ukjent';
                const hw = safeHomework.find(h => h.id === submission.homeworkId);
                const subject = subjects.find(sub => sub.id === hw?.subjectId);
                if (!subject) return 'Ukjent';
                if (hw?.title) {
                    return `${subject.name} (${hw.title})`;
                }
                return subject.name;
            };
            
            const formattedTestResults = studentUnreportedResults.map(r => {
                const test = relevantTests.find(t => t.id === r.testId);
                if (!test || r.score === null) return null;
                const subject = subjects.find(s => s.id === test.subjectId);
                return {
                    subjectName: subject?.name || 'Ukjent',
                    testTitle: test.title,
                    score: r.score,
                    maxScore: test.maxScore,
                };
            }).filter((r): r is NonNullable<typeof r> => r !== null);


            const message = generateSummaryMessage(
                student.name,
                selectedWeek,
                studentWeekAttempts.filter(s => s.status === 'Godkjent').map(formatHomeworkWithSubject),
                studentWeekAttempts.filter(s => s.status === 'Ikke levert').map(formatHomeworkWithSubject),
                studentWeekAttempts.filter(s => s.status === 'Må rettes').map(formatHomeworkWithSubject),
                studentWeekAttempts.filter(s => s.status === 'Glemt bok').map(formatHomeworkWithSubject),
                studentWeekChecks.filter(c => c.ipadBrought && !c.ipadCharged).length,
                studentWeekChecks.filter(c => !c.ipadBrought).length,
                studentWeekRemarks.length,
                formattedTestResults,
                settings.reportSettings,
                additionalText
            );
            return { studentName: student.name, message };
        }).filter((item): item is { studentName: string; message: string } => item !== null && item.message !== "");

        if (messages.length === 0) {
            toast({ title: "Ingenting å rapportere", description: `Alle elever hadde en prikkfri uke ${selectedWeek}.` });
        }

        setGeneratedMessages(messages);
        setIsGenerating(false);
    };

    const handleMarkAsReported = async () => {
        if (reportableTestResultIds.length === 0) return;
        try {
            await db.testResults.bulkUpdate(reportableTestResultIds.map(id => ({
                key: id,
                changes: { reportedInWeek: selectedWeek }
            })));
            toast({
                title: "Resultater markert som rapportert",
                description: `${reportableTestResultIds.length} prøveresultat(er) vil ikke bli inkludert i fremtidige ukesmeldinger.`,
            });
            setReportableTestResultIds([]); // Disable button after marking
        } catch (error) {
            console.error(error);
            toast({ title: "Feil", description: "Kunne ikke markere resultater som rapportert.", variant: "destructive" });
        }
    };

    const handleCopyMessage = (message: string) => {
        navigator.clipboard.writeText(message);
        toast({ title: "Kopiert!", description: "Meldingen er kopiert til utklippstavlen." });
    };
    
    return (
        <Card>
            <CardHeader>
            <CardTitle>Ukesoppsummering for Meldinger</CardTitle>
            <CardDescription>Generer automatisk meldinger til foresatte for elever med anmerkninger for en valgt uke.</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(parseInt(v))}>
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
                
                <Collapsible>
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <MessageSquarePlus className="mr-2 h-4 w-4" />
                            Legg til felles fritekst
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                        <Textarea 
                            placeholder="Skriv inn tekst som skal inkluderes i alle meldinger her..."
                            value={additionalText}
                            onChange={(e) => setAdditionalText(e.target.value)}
                        />
                    </CollapsibleContent>
                </Collapsible>
            </div>
            
             {reportableTestResultIds.length > 0 && (
                <div className="mt-4 p-4 border rounded-lg bg-secondary">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-sm font-medium">
                            {reportableTestResultIds.length} nye prøveresultat(er) er inkludert i disse meldingene.
                        </p>
                        <Button onClick={handleMarkAsReported} size="sm">
                            <BadgeCheck className="mr-2"/>
                            Marker som rapportert for Uke {selectedWeek}
                        </Button>
                    </div>
                </div>
            )}

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
    )
}

const StatusBar: FC<{ stats: Record<HomeworkStatus, number>, total: number }> = ({ stats, total }) => {
    if (total === 0) return null;
    return (
        <div className="w-full h-4 flex rounded-full overflow-hidden bg-gray-200">
            {statusOrder.map(status => {
                const count = stats[status] || 0;
                if (count === 0) return null;
                const percentage = (count / total) * 100;
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
    );
};

const Icon = ({ name, className }: { name: string, className?: string }) => {
    const LucideIcon = (LucideIcons as any)[name];
    if (!LucideIcon) return <LucideIcons.Star className={className} />;
    return <LucideIcon className={className} />;
}

const ReportDetails = ({ stat, behaviorTypes, reportSettings }: { stat: ReturnType<typeof useStudentStats>[0], behaviorTypes: BehaviorType[], reportSettings: ReportSettings }) => (
    <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
             {reportSettings.includeIpadInReport && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardHeader>
                        <CardTitle className="text-base text-blue-900 dark:text-blue-200">iPad-ansvar</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-blue-800 dark:text-blue-300">
                        <p>Glemt å lade: <strong>{stat.ipadNotCharged}</strong> gang(er)</p>
                        <p>Glemt å ta med: <strong>{stat.ipadNotBrought}</strong> gang(er)</p>
                    </CardContent>
                </Card>
            )}
            {reportSettings.includeHourlyCheckInReport && (
                <Card className="bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
                    <CardHeader>
                        <CardTitle className="text-base text-teal-900 dark:text-teal-200">Innsats i timen</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-teal-800 dark:text-teal-300 flex flex-col">
                        {behaviorTypes.map(bt => {
                            const count = stat.behaviorCounts[bt.id] || 0;
                            if (count === 0) return null;
                            return (
                                <p key={bt.id} className="flex items-center">
                                    <Icon name={bt.icon} className="mr-2 w-4 h-4 text-teal-600" />
                                    <span>{bt.label}: <strong>{count}</strong> gang(er)</span>
                                </p>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>

        {reportSettings.includeHomeworkInReport && (
            <div className="grid gap-4 md:grid-cols-2">
                {stat.statsBySubject.map(subStat => (
                <Card key={subStat.subjectId}>
                    <CardHeader>
                        <CardTitle className="text-base">{subStat.subjectName} ({subStat.totalSubmissions})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <StatusBar stats={subStat.statusCounts} total={subStat.totalSubmissions} />
                        
                        {subStat.problemSubmissions.length > 0 && (
                            <div className="pt-2 border-t">
                                <ul className="pl-1 mt-1 text-sm space-y-1">
                                    {subStat.problemSubmissions.map((c, i) => 
                                        <li key={i} className="text-xs">
                                            <strong>Uke {c.week}: </strong> 
                                            <span> </span>
                                            {c.status === 'Glemt bok' ? 'Glemt bok' : c.title}
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
        )}
        {reportSettings.includeLearningGoalsInReport && stat.learningGoals.length > 0 && (
             <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center">
                        <Target className="mr-2" />
                        Læringsmål
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {stat.learningGoals.map(goal => (
                            <li key={goal.goal.id} className="text-sm border-b pb-2">
                                <p className="font-medium">{goal.subjectName}: {goal.goal.title}</p>
                                <p className={cn("text-xs flex items-center", goal.achievement?.status === 'Achieved' ? 'text-green-600' : 'text-muted-foreground')}>
                                    {goal.achievement?.status === 'Achieved' && <Check className="w-4 h-4 mr-1" />}
                                    Status: {goal.achievement?.status === 'Achieved' ? 'Mål Nådd' : (goal.achievement?.status === 'InProgress' ? 'Jobber med' : 'Ikke startet')}
                                </p>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        )}
        {reportSettings.includeTestsInReport && stat.testResults.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center">
                        <Award className="mr-2" />
                        Prøveresultater
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {stat.testResults.map(result => (
                            <li key={result.test.id} className="text-sm border-b pb-2">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{result.test.title} <span className="text-xs text-muted-foreground">({result.subjectName})</span></p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(result.test.date), "PPP", { locale: nb })}
                                            {result.result.reportedInWeek && <span className="italic"> (Rapportert uke {result.result.reportedInWeek})</span>}
                                        </p>
                                    </div>
                                    <p className="font-bold text-lg">{result.result.score}<span className="font-normal text-sm text-muted-foreground">/{result.test.maxScore}</span></p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        )}
         {reportSettings.includeRemarksInReport && stat.loggedRemarks.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center">
                        <MessageSquare className="mr-2" />
                        Loggførte hendelser og anmerkninger
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {stat.loggedRemarks.map(remark => (
                            <li key={remark.id} className="text-sm border-b pb-2">
                                <p className="font-medium">{remark.message || remark.type}</p>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(remark.date), "PPP", { locale: nb })} - Time {remark.period}
                                </p>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        )}
        <div className="pt-4 text-xs text-center text-muted-foreground print-only">
            Tegnforklaring: 
            {statusOrder.map((name) => <span key={name} className="inline-flex items-center ml-4"><span className="w-3 h-3 mr-1 rounded-full" style={{backgroundColor: statusColors[name]}}></span>{name}</span>)}
        </div>
    </div>
);


const FullReportCard = ({ stat, isOpen, isPrintVersion = false, behaviorTypes, reportSettings }: { stat: ReturnType<typeof useStudentStats>[0], isOpen: boolean, isPrintVersion?: boolean, behaviorTypes: BehaviorType[], reportSettings: ReportSettings }) => (
     <Card className={cn(
        "print:shadow-none print:border-none",
        isPrintVersion && "border-b border-t"
     )}>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{stat.studentName}</CardTitle>
                    {reportSettings.includeHomeworkInReport && <CardDescription>Totaloversikt ({stat.totalHomework} lekser)</CardDescription>}
                </div>
                {!isPrintVersion && (
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            {isOpen ? "Skjul detaljer" : "Vis detaljer"}
                            {isOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                        </Button>
                    </CollapsibleTrigger>
                )}
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {reportSettings.includeHomeworkInReport && <StatusBar stats={stat.totalStatusCounts} total={stat.totalHomework} />}
            <div className="flex text-sm text-muted-foreground gap-4">
                {reportSettings.includeRemarksInReport && stat.totalRemarks > 0 && <p className="flex items-center"><MessageSquare className="mr-2 h-4 w-4" />{stat.totalRemarks} anmerkninger/loggføringer</p>}
            </div>
            
            {isPrintVersion ? (
                <ReportDetails stat={stat} behaviorTypes={behaviorTypes} reportSettings={reportSettings} />
            ) : (
                <CollapsibleContent>
                    <ReportDetails stat={stat} behaviorTypes={behaviorTypes} reportSettings={reportSettings} />
                </CollapsibleContent>
            )}
        </CardContent>
    </Card>
);

const useStudentStats = (
    students: Student[], 
    subjects: Subject[], 
    homework: Homework[], 
    submissions: Submission[],
    submissionAttempts: SubmissionAttempt[],
    tests: Test[], 
    testResults: TestResult[], 
    dailyChecks: DailyCheck[], 
    remarks: Remark[], 
    hourlyChecks: HourlyCheck[],
    learningGoals: LearningGoal[],
    goalAchievements: GoalAchievement[],
    behaviorTypes: BehaviorType[]
) => {
    return useMemo(() => {
        const safeStudents = students || [];
        const safeSubjects = subjects || [];
        const safeHomework = homework || [];
        const safeSubmissions = submissions || [];
        const safeSubmissionAttempts = submissionAttempts || [];
        const safeTests = tests || [];
        const safeTestResults = testResults || [];
        const safeDailyChecks = dailyChecks || [];
        const safeRemarks = remarks || [];
        const safeHourlyChecks = hourlyChecks || [];
        const safeLearningGoals = learningGoals || [];
        const safeGoalAchievements = goalAchievements || [];
        const safeBehaviorTypes = behaviorTypes || [];

        return safeStudents.map(student => {
            const studentSubmissionIds = new Set(safeSubmissions.filter(s => s.studentId === student.id).map(s => s.id));
            const studentAttempts = safeSubmissionAttempts.filter(att => studentSubmissionIds.has(att.submissionId));

            const studentTestResults = safeTestResults.filter(r => r.studentId === student.id && r.score !== null);
            const studentDailyChecks = safeDailyChecks.filter(c => c.studentId === student.id);
            const studentHourlyChecks = safeHourlyChecks.filter(c => c.studentId === student.id);
            const studentRemarks = safeRemarks
                .filter(r => r.studentId === student.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const studentGoalAchievements = safeGoalAchievements.filter(ga => ga.studentId === student.id);

            const totalStatusCounts = studentAttempts.reduce((acc, attempt) => {
                acc[attempt.status] = (acc[attempt.status] || 0) + 1;
                return acc;
            }, {} as Record<HomeworkStatus, number>);
            const totalHomework = studentAttempts.length;

            const statsBySubject = safeSubjects.map(subject => {
                const subjectHomeworkIds = new Set(safeHomework.filter(h => h.subjectId === subject.id).map(h => h.id));
                const subjectSubmissionIds = new Set(safeSubmissions.filter(s => subjectHomeworkIds.has(s.homeworkId) && s.studentId === student.id).map(s => s.id));
                const subjectAttempts = safeSubmissionAttempts.filter(att => subjectSubmissionIds.has(att.submissionId));
                
                const statusCounts = subjectAttempts.reduce((acc, attempt) => {
                    acc[attempt.status] = (acc[attempt.status] || 0) + 1;
                    return acc;
                }, {} as Record<HomeworkStatus, number>);
                
                const problemSubmissions = subjectAttempts
                    .filter(s => s.status === "Må rettes" || s.status === "Glemt bok")
                    .map(s => {
                        const submission = safeSubmissions.find(sub => sub.id === s.submissionId);
                        const hw = submission ? safeHomework.find(h => h.id === submission.homeworkId) : undefined;
                        return {
                            week: hw?.week,
                            title: hw?.title,
                            comment: s.comment,
                            status: s.status,
                        };
                    })
                    .filter(s => s.week !== undefined);
                
                return {
                    subjectId: subject.id,
                    subjectName: subject.name,
                    statusCounts,
                    totalSubmissions: subjectAttempts.length,
                    problemSubmissions,
                };
            }).filter(s => s.totalSubmissions > 0);
            
            const behaviorCounts = studentHourlyChecks.reduce((acc, check) => {
                acc[check.behaviorId] = (acc[check.behaviorId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const formattedTestResults = studentTestResults.map(result => {
                const test = safeTests.find(t => t.id === result.testId);
                if (!test) return null;
                const subjectName = safeSubjects.find(s => s.id === test.subjectId)?.name || 'Ukjent';
                return { result, test, subjectName };
            }).filter(Boolean).sort((a, b) => new Date(b!.test.date).getTime() - new Date(a!.test.date).getTime());

            const studentGoals = safeLearningGoals
                .map(goal => {
                    const achievement = studentGoalAchievements.find(a => a.goalId === goal.id);
                    const subjectName = safeSubjects.find(s => s.id === goal.subjectId)?.name;
                    return { goal, achievement, subjectName };
                })
                .filter(g => g.subjectName)
                .sort((a, b) => a.subjectName!.localeCompare(b.subjectName!) || a.goal.createdAt.getTime() - b.goal.createdAt.getTime());


            return {
                studentId: student.id,
                studentName: student.name,
                statsBySubject,
                totalHomework,
                totalStatusCounts,
                testResults: formattedTestResults as { result: TestResult; test: Test; subjectName: string; }[],
                ipadNotCharged: studentDailyChecks.filter(c => c.ipadBrought && !c.ipadCharged).length,
                ipadNotBrought: studentDailyChecks.filter(c => !c.ipadBrought).length,
                behaviorCounts,
                loggedRemarks: studentRemarks,
                totalRemarks: studentRemarks.length,
                learningGoals: studentGoals as { goal: LearningGoal, achievement?: GoalAchievement, subjectName: string }[],
            };
        }).sort((a,b) => a.studentName.localeCompare(b.studentName));
    }, [students, subjects, homework, submissions, submissionAttempts, tests, testResults, dailyChecks, remarks, hourlyChecks, learningGoals, goalAchievements, behaviorTypes]);
};


const StudentReport = (props: Omit<ReportsProps, 'activeSubTab' | 'onSubTabChange'>) => {
    const [openStudents, setOpenStudents] = useState<Record<string, boolean>>({});
    const behaviorTypes = props.settings.behaviorTypes || [];
    const studentStats = useStudentStats(
        props.students, 
        props.subjects, 
        props.homework, 
        props.submissions, 
        props.submissionAttempts,
        props.tests, 
        props.testResults, 
        props.dailyChecks, 
        props.remarks, 
        props.hourlyChecks,
        props.learningGoals,
        props.goalAchievements, 
        behaviorTypes
    );
    
    const toggleStudent = (studentId: string) => {
        setOpenStudents(prev => ({ ...prev, [studentId]: !prev[studentId] }));
    };

    return (
        <Card>
            <CardHeader className="no-print">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Elevrapporter</CardTitle>
                        <CardDescription>Oversikt over hver enkelt elevs fremgang og ansvarsområder.</CardDescription>
                    </div>
                    <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Skriv ut alle</Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 screen-only">
                {studentStats.map(stat => (
                    <Collapsible key={stat.studentId} open={openStudents[stat.studentId] || false} onOpenChange={() => toggleStudent(stat.studentId!)}>
                        <FullReportCard stat={stat} isOpen={openStudents[stat.studentId!] || false} behaviorTypes={behaviorTypes} reportSettings={props.settings.reportSettings} />
                    </Collapsible>
                ))}
            </CardContent>
             {/* Hidden, print-only version */}
            <div className="hidden print-only printable-area">
                {studentStats.map(stat => (
                    <div key={stat.studentId} className="page-break">
                         <FullReportCard stat={stat} isOpen={true} isPrintVersion={true} behaviorTypes={behaviorTypes} reportSettings={props.settings.reportSettings} />
                    </div>
                ))}
            </div>
        </Card>
    );
}


export default function Reports(props: ReportsProps) {
    const { activeSubTab, onSubTabChange, ...rest } = props;
    const defaultSubTab = "summary";

    if (!props.learningGoals || !props.goalAchievements || !props.submissionAttempts) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="ml-2">Laster rapportdata...</p>
            </div>
        );
    }

    return (
        <Tabs 
            value={activeSubTab || defaultSubTab} 
            onValueChange={onSubTabChange}
            className="w-full"
        >
            <TabsList className="grid w-full grid-cols-3 no-print">
                <TabsTrigger value="summary">Ukesoppsummering</TabsTrigger>
                <TabsTrigger value="student-report">Elevrapporter</TabsTrigger>
                <TabsTrigger value="analysis">Anmerkningsanalyse</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
                <WeeklySummary {...props} />
            </TabsContent>
            <TabsContent value="student-report">
                <StudentReport {...props} />
            </TabsContent>
            <TabsContent value="analysis">
                <RemarkAnalysis students={props.students} initialRemarks={props.remarks || []} />
            </TabsContent>
        </Tabs>
    )
}

    



