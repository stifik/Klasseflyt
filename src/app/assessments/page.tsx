"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Assessments from "@/components/Assessments";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function AssessmentsPage() {
    const students = useLiveQuery(() => db.students.toArray());
    const subjects = useLiveQuery(() => db.subjects.toArray());
    const tests = useLiveQuery(() => db.tests.toArray());
    const testResults = useLiveQuery(() => db.testResults.toArray());
    const learningGoals = useLiveQuery(() => db.learningGoals.toArray());
    const goalAchievements = useLiveQuery(() => db.goalAchievements.toArray());
    const [activeSubTab, setActiveSubTab] = useState<string>("tests");

    if (!students || !subjects || !tests || !testResults || !learningGoals || !goalAchievements) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <Assessments
            students={students}
            subjects={subjects}
            tests={tests}
            testResults={testResults}
            learningGoals={learningGoals}
            goalAchievements={goalAchievements}
            activeSubTab={activeSubTab}
            onSubTabChange={setActiveSubTab}
        />
    );
}
