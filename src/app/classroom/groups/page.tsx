"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import GroupTool from "@/components/GroupTool";
import { Loader2 } from "lucide-react";

export default function GroupsPage() {
    const students = useLiveQuery(() => db.students.toArray());
    const settings = useLiveQuery(() => db.settings.get('userSettings'));
    const absences = useLiveQuery(() => db.absences.toArray());
    const groupSets = useLiveQuery(() => db.groupSets.toArray());
    const stationAssignmentLogs = useLiveQuery(() => db.stationAssignmentLogs.toArray());

    const handleSettingsChange = async (newSettings: any) => {
        await db.settings.put({ id: 'userSettings', ...newSettings });
    };

    if (!students || !settings) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <GroupTool
            students={students}
            appSettings={settings}
            onAppSettingsChange={handleSettingsChange}
            stationAssignmentLogs={stationAssignmentLogs}
            groupSets={groupSets}
            absences={absences}
        />
    );
}
