"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import StudentPicker from "@/components/StudentPicker";
import { Loader2 } from "lucide-react";

export default function PickerPage() {
    const students = useLiveQuery(() => db.students.toArray());
    const settings = useLiveQuery(() => db.settings.get('userSettings'));
    const seatingChart = useLiveQuery(async () => {
        const latest = await db.seatingChartHistory.orderBy('createdAt').last();
        return latest ? JSON.parse(latest.chartJson) : null;
    }, []);
    const activeLayout = useLiveQuery(async () => {
        if (settings?.selectedSeatingLayoutId) {
            return await db.seatingLayouts.get(settings.selectedSeatingLayoutId);
        }
        return null;
    }, [settings?.selectedSeatingLayoutId]);
    const absences = useLiveQuery(() => db.absences.toArray());

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
        <StudentPicker
            students={students}
            seatingChart={seatingChart}
            activeLayout={activeLayout}
            appSettings={settings}
            onAppSettingsChange={handleSettingsChange}
            absences={absences}
        />
    );
}
