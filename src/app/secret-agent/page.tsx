"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import SecretAgentPicker from "@/components/SecretAgentPicker";
import PageHeader from "@/components/navigation/PageHeader";
import { Loader2 } from "lucide-react";

export default function SecretAgentPage() {
    const students = useLiveQuery(() => db.students.toArray());
    const absences = useLiveQuery(() => db.absences.toArray());

    if (!students) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader title="Hemmelig Agent" settingsUrl="/settings#hovedapp" />
            <SecretAgentPicker students={students} absences={absences} />
        </div>
    );
}
