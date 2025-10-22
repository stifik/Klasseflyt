
"use client";

import { useState, FC, useEffect } from 'react';
import type { Student, Subject, Homework, Submission, DailyCheck, HomeworkStatus, Remark, ReportSettings, AppSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { Printer, Copy, Loader2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getWeekNumber } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RemarkAnalysis from './RemarkAnalysis';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import Reports from './Reports';


interface AnalysisProps {
  students: Student[];
  subjects: Subject[];
  homework: Homework[];
  submissions: Submission[];
  remarks: Remark[];
  settings: AppSettings;
  activeSubTab?: string | null;
  onSubTabChange: (subTab: string) => void;
}

export default function Analysis(props: AnalysisProps) {
    // Fetch additional data needed by Reports component
    const submissionAttempts = useLiveQuery(() => db.submissionAttempts.toArray()) || [];
    const tests = useLiveQuery(() => db.tests.toArray()) || [];
    const testResults = useLiveQuery(() => db.testResults.toArray()) || [];
    const learningGoals = useLiveQuery(() => db.learningGoals.toArray()) || [];
    const goalAchievements = useLiveQuery(() => db.goalAchievements.toArray()) || [];
    const dailyChecks = useLiveQuery(() => db.dailyChecks.toArray()) || [];
    const hourlyChecks = useLiveQuery(() => db.hourlyChecks.toArray()) || [];

    // The Reports component now handles all the logic and UI
    return <Reports
        {...props}
        submissionAttempts={submissionAttempts}
        tests={tests}
        testResults={testResults}
        learningGoals={learningGoals}
        goalAchievements={goalAchievements}
        dailyChecks={dailyChecks}
        hourlyChecks={hourlyChecks}
    />;
}
