"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import HomeworkOverview from "@/components/HomeworkOverview";
import PageHeader from "@/components/navigation/PageHeader";
import { Loader2 } from "lucide-react";

export default function HomeworkPage() {
    const students = useLiveQuery(() => db.students.toArray());
    const subjects = useLiveQuery(() => db.subjects.toArray());
    const homework = useLiveQuery(() => db.homework.toArray());
    const submissions = useLiveQuery(() => db.submissions.toArray());

    const handleUpdate = () => {
        // Trigger re-query by not doing anything - useLiveQuery will auto-update
    };

    if (!students || !subjects || !homework || !submissions) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <PageHeader title="Lekseoversikt" settingsUrl="/settings#hovedapp" />
            <HomeworkOverview
                students={students}
                subjects={subjects}
                homework={homework}
                submissions={submissions}
                onUpdate={handleUpdate}
            />
        </div>
    );
}
