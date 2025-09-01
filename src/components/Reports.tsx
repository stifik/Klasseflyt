
"use client";

import { useState, useMemo, FC } from 'react';
import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus, Remark, ReportSettings, HourlyCheck, BehaviorType, AppSettings, Test, TestResult, LearningGoal, GoalAchievement } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { Printer, Copy, Loader2, Clock, ChevronDown, ChevronUp, MessageSquare, Award, Target, Check } from 'lucide-react';
import { getWeekNumber } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RemarkAnalysis from './RemarkAnalysis';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import * as LucideIcons from "lucide-react";
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface ReportsProps {
  students: Student[];
  subjects: Subject[];
  homework: Homework[];
  submissions: Submission[];
  tests: Test[];
  testResults: TestResult[];
  learningGoals: LearningGoal[];
  goalAchievements: GoalAchievement[];
  dailyChecks: DailyCheck[];
  remarks: Remark[];
  hourlyChecks: HourlyCheck[];
  settings: AppSettings;
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
    hasIssues: boolean,
    approvedAssignments: string[],
    missingAssignments: string[],
    incompleteAssignments: string[],
    forgottenBooks: string[],
    ipadNotChargedCount: number,
    ipadNotBroughtCount: number,
    remarksCount: number,
    weekTestResults: { subjectName: string, testTitle: string, score: number, maxScore: number }[],
    settings: ReportSettings,
): string => {

    const homeworkIssues: string[] = [];
    if (missingAssignments.length > 0) homeworkIssues.push(`Ikke levert: ${missingAssignments.join(', ')}`);
    if (incompleteAssignments.length > 0) homeworkIssues.push(`Må rettes: ${incompleteAssignments.join(', ')}`);
    if (forgottenBooks.length > 0) homeworkIssues.push(`Glemt bok: ${forgottenBooks.join(', ')}`);
    
    const ipadIssues: string[] = [];
    if (ipadNotChargedCount > 0) ipadIssues.push(`Ikke ladet: ${ipadNotChargedCount} gang(er)`);
    if (ipadNotBroughtCount > 0) ipadIssues.push(`Ikke medbrakt: ${ipadNotBroughtCount} gang(er)`);

    const hasHomeworkIssues = homeworkIssues.length > 0;
    const hasApprovedHomework = approvedAssignments.length > 0;

    let message = `${settings.greeting}\nEn liten oppsummering for ${studentName} i uke ${week}.\n\n`;
      
    if (settings.includeHomework) {
        if (hasHomeworkIssues) {
            message += `Status for lekser:\n`;
            if (hasApprovedHomework) {
                message += `- Godkjent: ${approvedAssignments.join(', ')}\n`;
            }
            message += `- ${homeworkIssues.join('\n- ')}\n\n`;
        } else if (settings.includePositiveFeedback && hasApprovedHomework) {
             if (hasIssues) {
                message += `Lekser: All leksing denne uken er godkjent. Veldig bra innsats!\n\n`;
            } else {
                 message = `${settings.greeting}\nEn liten oppdatering for ${studentName} i uke ${week}: Alt har vært helt supert! God innsats.\n\n`;
            }
        }
    }

    if (settings.includeIpad && ipadIssues.length > 0) {
        message += `iPad:\n- ${ipadIssues.join('\n- ')}\n\n`;
    }
    
    if (settings.includeTests && weekTestResults.length > 0) {
        message += `Resultater:\n`;
        weekTestResults.forEach(r => {
            message += `- ${r.subjectName} (${r.testTitle}): ${r.score}/${r.maxScore} poeng\n`;
        });
        message += '\n';
    }

    if (settings.includeRemarks && remarksCount > 0) {
        message += `Anmerkninger: ${remarksCount} stk\n\n`;
    }

    // Don't send message if there are no issues and positive feedback is off.
    if (!hasIssues && !settings.includePositiveFeedback) {
        return "";
    }
    
    if (!hasIssues && settings.includePositiveFeedback && !hasApprovedHomework) {
        message = `${settings.greeting}\nEn liten oppdatering for ${studentName} i uke ${week}: Alt har vært helt supert! God innsats.\n\n`;
    }


    message += `${settings.closing}\n${settings.teacherName}`;
    return message;
};

const WeeklySummary = ({ students, subjects, homework, submissions, dailyChecks, remarks, settings, tests, testResults }: ReportsProps) => {
    const { toast } = useToast();
    const [selectedWeek, setSelectedWeek] = useState<number>(() => getWeekNumber(new Date()));
    const [generatedMessages, setGeneratedMessages] = useState<Array<{ studentName: string; message: string }>>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const uniqueWeeks = useMemo(() => {
        if (!homework && !dailyChecks && !remarks) return [];
        const homeworkWeeks = homework?.map(h => h.week) || [];
        const checkWeeks = dailyChecks?.map(c => getWeekNumber(new Date(c.date))) || [];
        const remarkWeeks = remarks?.map(r => getWeekNumber(new Date(r.date))) || [];
        const testWeeks = tests?.map(t => getWeekNumber(new Date(t.date))) || [];
        return [...new Set([...homeworkWeeks, ...checkWeeks, ...remarkWeeks, ...testWeeks])].sort((a,b) => b-a);
    }, [homework, dailyChecks, remarks, tests]);
  
    const handleGenerateSummaries = () => {
        setIsGenerating(true);
        setGeneratedMessages([]);

        const weekHomeworkIds = new Set((homework || []).filter(h => h.week === selectedWeek).map(h => h.id));
        
        // New logic: Include tests from the selected week AND the week before.
        const relevantWeeks = [selectedWeek, selectedWeek - 1];
        const weekTests = (tests || []).filter(t => relevantWeeks.includes(getWeekNumber(new Date(t.date))));

        const studentsToReport = students.map(student => {
            const studentWeekSubmissions = (submissions || []).filter(s => s.studentId === student.id && weekHomeworkIds.has(s.homeworkId));
            const studentWeekChecks = (dailyChecks || []).filter(c => c.studentId === student.id && getWeekNumber(new Date(c.date)) === selectedWeek);
            const studentWeekRemarks = (remarks || []).filter(r => r.studentId === student.id && getWeekNumber(new Date(r.date)) === selectedWeek);
            const studentWeekTestResults = (testResults || []).filter(r => r.studentId === student.id && weekTests.some(t => t.id === r.testId));

            const hasHomeworkIssues = settings.reportSettings.includeHomework && studentWeekSubmissions.some(s => 
                s.status === 'Ikke levert' || s.status === 'Må rettes' || s.status === 'Glemt bok'
            );
            const hasIpadIssues = settings.reportSettings.includeIpad && studentWeekChecks.some(c => !c.ipadBrought || !c.ipadCharged);
            const hasRemarks = settings.reportSettings.includeRemarks && studentWeekRemarks.length > 0;
            const hasTests = settings.reportSettings.includeTests && studentWeekTestResults.length > 0;
            
            const hasAnyIssues = hasHomeworkIssues || hasIpadIssues || hasRemarks;
            
            const onlyAbsence = !hasIpadIssues && !hasRemarks && studentWeekSubmissions.length > 0 && studentWeekSubmissions.every(s => s.status === 'Syk/Fravær');

            if (onlyAbsence) return null;
            if (hasAnyIssues || hasTests || settings.reportSettings.includePositiveFeedback) {
                return { student, hasAnyIssues, studentWeekSubmissions, studentWeekChecks, studentWeekRemarks, studentWeekTestResults };
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
            const { student, hasAnyIssues, studentWeekSubmissions, studentWeekChecks, studentWeekRemarks, studentWeekTestResults } = report;
            
            const formatHomeworkWithSubject = (s: Submission) => {
                const hw = (homework || []).find(h => h.id === s.homeworkId);
                const subject = subjects.find(sub => sub.id === hw?.subjectId);
                return `${subject?.name || 'Ukjent'} (${hw?.title || ''})`;
            };
            
            const formattedTestResults = studentWeekTestResults.map(r => {
                const test = weekTests.find(t => t.id === r.testId);
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
                hasAnyIssues,
                studentWeekSubmissions.filter(s => s.status === 'Godkjent').map(formatHomeworkWithSubject),
                studentWeekSubmissions.filter(s => s.status === 'Ikke levert').map(formatHomeworkWithSubject),
                studentWeekSubmissions.filter(s => s.status === 'Må rettes').map(formatHomeworkWithSubject),
                studentWeekSubmissions.filter(s => s.status === 'Glemt bok').map(formatHomeworkWithSubject),
                studentWeekChecks.filter(c => c.ipadBrought && !c.ipadCharged).length,
                studentWeekChecks.filter(c => !c.ipadBrought).length,
                studentWeekRemarks.length,
                formattedTestResults,
                settings.reportSettings
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
        <Card>
            <CardHeader>
            <CardTitle>Ukesoppsummering for Meldinger</CardTitle>
            <CardDescription>Generer automatisk meldinger til foresatte for elever med anmerkninger for en valgt uke.</CardDescription>
            </CardHeader>
            <CardContent>
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

const ReportDetails = ({ stat, behaviorTypes }: { stat: ReturnType<typeof useStudentStats>[0], behaviorTypes: BehaviorType[] }) => (
    <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
             <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                    <CardTitle className="text-base text-blue-900 dark:text-blue-200">iPad-ansvar</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-800 dark:text-blue-300">
                    <p>Glemt å lade: <strong>{stat.ipadNotCharged}</strong> gang(er)</p>
                    <p>Glemt å ta med: <strong>{stat.ipadNotBrought}</strong> gang(er)</p>
                </CardContent>
            </Card>
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
        </div>

        <div className="grid gap-4 md:grid-cols-2">
            {stat.statsBySubject.map(subStat => (
            <Card key={subStat.subjectId}>
                <CardHeader>
                    <CardTitle className="text-base">{subStat.subjectName} ({subStat.totalSubmissions})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <StatusBar stats={subStat.statusCounts} total={subStat.totalSubmissions} />
                    {subStat.delays > 0 && <p className="text-xs text-muted-foreground flex items-center"><Clock className="mr-2 h-3 w-3" />{subStat.delays} forsinkelser</p>}
                
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
        {stat.learningGoals.length > 0 && (
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
        {stat.testResults.length > 0 && (
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
         {stat.loggedRemarks.length > 0 && (
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


const FullReportCard = ({ stat, isOpen, isPrintVersion = false, behaviorTypes }: { stat: ReturnType<typeof useStudentStats>[0], isOpen: boolean, isPrintVersion?: boolean, behaviorTypes: BehaviorType[] }) => (
     <Card className={cn(
        "print:shadow-none print:border-none",
        isPrintVersion && "border-b border-t"
     )}>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{stat.studentName}</CardTitle>
                    <CardDescription>Totaloversikt ({stat.totalHomework} lekser)</CardDescription>
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
            <StatusBar stats={stat.totalStatusCounts} total={stat.totalHomework} />
            <div className="flex text-sm text-muted-foreground gap-4">
                {stat.totalDelays > 0 && <p className="flex items-center"><Clock className="mr-2 h-4 w-4" />{stat.totalDelays} forsinkelser totalt</p>}
                {stat.totalRemarks > 0 && <p className="flex items-center"><MessageSquare className="mr-2 h-4 w-4" />{stat.totalRemarks} anmerkninger/loggføringer</p>}
            </div>
            
            {isPrintVersion ? (
                <ReportDetails stat={stat} behaviorTypes={behaviorTypes} />
            ) : (
                <CollapsibleContent>
                    <ReportDetails stat={stat} behaviorTypes={behaviorTypes} />
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
        return students.map(student => {
            const studentSubmissions = submissions.filter(s => s.studentId === student.id);
            const studentTestResults = testResults.filter(r => r.studentId === student.id && r.score !== null);
            const studentDailyChecks = dailyChecks.filter(c => c.studentId === student.id);
            const studentHourlyChecks = hourlyChecks.filter(c => c.studentId === student.id);
            const studentRemarks = remarks
                .filter(r => r.studentId === student.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const studentGoalAchievements = goalAchievements.filter(ga => ga.studentId === student.id);

            const totalStatusCounts = studentSubmissions.reduce((acc, sub) => {
                acc[sub.status] = (acc[sub.status] || 0) + 1;
                return acc;
            }, {} as Record<HomeworkStatus, number>);
            const totalHomework = studentSubmissions.length;
            
            const totalDelays = studentSubmissions.filter(s => s.isDelayed).length;

            const statsBySubject = subjects.map(subject => {
                const subjectHomeworkIds = new Set(homework.filter(h => h.subjectId === subject.id).map(h => h.id));
                const subjectSubmissions = studentSubmissions.filter(s => subjectHomeworkIds.has(s.homeworkId));
                
                const statusCounts = subjectSubmissions.reduce((acc, sub) => {
                    acc[sub.status] = (acc[sub.status] || 0) + 1;
                    return acc;
                }, {} as Record<HomeworkStatus, number>);
                
                const problemSubmissions = subjectSubmissions
                    .filter(s => s.status === "Må rettes" || s.status === "Glemt bok")
                    .map(s => ({
                        week: homework.find(h => h.id === s.homeworkId)?.week,
                        title: homework.find(h => h.id === s.homeworkId)?.title,
                        comment: s.comment,
                        status: s.status,
                    }))
                    .filter(s => s.title);
                
                const subjectDelays = subjectSubmissions.filter(s => s.isDelayed).length;

                return {
                    subjectId: subject.id,
                    subjectName: subject.name,
                    statusCounts,
                    totalSubmissions: subjectSubmissions.length,
                    delays: subjectDelays,
                    problemSubmissions,
                };
            }).filter(s => s.totalSubmissions > 0);
            
            const behaviorCounts = studentHourlyChecks.reduce((acc, check) => {
                acc[check.behaviorId] = (acc[check.behaviorId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const formattedTestResults = studentTestResults.map(result => {
                const test = tests.find(t => t.id === result.testId);
                if (!test) return null;
                const subjectName = subjects.find(s => s.id === test.subjectId)?.name || 'Ukjent';
                return { result, test, subjectName };
            }).filter(Boolean).sort((a, b) => new Date(b!.test.date).getTime() - new Date(a!.test.date).getTime());

            const studentGoals = learningGoals
                .map(goal => {
                    const achievement = studentGoalAchievements.find(a => a.goalId === goal.id);
                    const subjectName = subjects.find(s => s.id === goal.subjectId)?.name;
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
                totalDelays,
                testResults: formattedTestResults as { result: TestResult; test: Test; subjectName: string; }[],
                ipadNotCharged: studentDailyChecks.filter(c => c.ipadBrought && !c.ipadCharged).length,
                ipadNotBrought: studentDailyChecks.filter(c => !c.ipadBrought).length,
                behaviorCounts,
                loggedRemarks: studentRemarks,
                totalRemarks: studentRemarks.length,
                learningGoals: studentGoals as { goal: LearningGoal, achievement?: GoalAchievement, subjectName: string }[],
            };
        }).sort((a,b) => a.studentName.localeCompare(b.studentName));
    }, [students, subjects, homework, submissions, tests, testResults, dailyChecks, remarks, hourlyChecks, learningGoals, goalAchievements, behaviorTypes]);
};


const StudentReport = (props: ReportsProps) => {
    const [openStudents, setOpenStudents] = useState<Record<string, boolean>>({});
    const behaviorTypes = props.settings.behaviorTypes || [];
    const studentStats = useStudentStats(
        props.students, 
        props.subjects, 
        props.homework, 
        props.submissions, 
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
                    <Collapsible key={stat.studentId} open={openStudents[stat.studentId] || false} onOpenChange={() => toggleStudent(stat.studentId)}>
                        <FullReportCard stat={stat} isOpen={openStudents[stat.studentId] || false} behaviorTypes={behaviorTypes} />
                    </Collapsible>
                ))}
            </CardContent>
             {/* Hidden, print-only version */}
            <div className="hidden print-only printable-area">
                {studentStats.map(stat => (
                    <div key={stat.studentId} className="page-break">
                         <FullReportCard stat={stat} isOpen={true} isPrintVersion={true} behaviorTypes={behaviorTypes} />
                    </div>
                ))}
            </div>
        </Card>
    );
}


export default function Reports(props: ReportsProps) {
    const [activeTab, setActiveTab] = useState("summary");

    // Defensive check to ensure all required props are loaded
    if (!props.learningGoals || !props.goalAchievements) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="ml-2">Laster rapportdata...</p>
            </div>
        );
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
