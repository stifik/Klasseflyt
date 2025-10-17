"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DailyChecklist from "@/components/DailyChecklist";
import { Loader2 } from "lucide-react";

export default function DailyCheckPage() {
    const students = useLiveQuery(() => db.students.toArray());

    if (!students) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return <DailyChecklist students={students} />;
}
