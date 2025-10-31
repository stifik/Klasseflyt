"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Reports from "@/components/Reports";
import PageHeader from "@/components/navigation/PageHeader";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function ReportsPage() {
    const students = useLiveQuery(() => db.students.toArray());
    const subjects = useLiveQuery(() => db.subjects.toArray());
    const homework = useLiveQuery(() => db.homework.toArray());
    const submissions = useLiveQuery(() => db.submissions.toArray());
    const submissionAttempts = useLiveQuery(() => db.submissionAttempts.toArray());
    const tests = useLiveQuery(() => db.tests.toArray());
    const testResults = useLiveQuery(() => db.testResults.toArray());
    const learningGoals = useLiveQuery(() => db.learningGoals.toArray());
    const goalAchievements = useLiveQuery(() => db.goalAchievements.toArray());
    const dailyChecks = useLiveQuery(() => db.dailyChecks.toArray());
    const remarks = useLiveQuery(() => db.remarks.toArray());
    const hourlyChecks = useLiveQuery(() => db.hourlyChecks.toArray());
    const settings = useLiveQuery(() => db.settings.get('userSettings'));
    const [activeSubTab, setActiveSubTab] = useState<string>("summary");

    if (!students || !subjects || !homework || !submissions || !submissionAttempts ||
        !tests || !testResults || !learningGoals || !goalAchievements ||
        !dailyChecks || !remarks || !hourlyChecks || !settings) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <PageHeader title="Rapporter" settingsUrl="/settings#hovedapp" />
            <Reports
                students={students}
                subjects={subjects}
                homework={homework}
                submissions={submissions}
                submissionAttempts={submissionAttempts}
                tests={tests}
                testResults={testResults}
                learningGoals={learningGoals}
                goalAchievements={goalAchievements}
                dailyChecks={dailyChecks}
                remarks={remarks}
                hourlyChecks={hourlyChecks}
                settings={settings}
                activeSubTab={activeSubTab}
                onSubTabChange={setActiveSubTab}
            />
        </div>
    );
}
