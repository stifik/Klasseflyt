"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import DailyChecklist from "@/components/DailyChecklist";
import { Loader2 } from "lucide-react";

export default function DailyCheckPage() {
    const students = useLiveQuery(() => db.students.toArray());
    const settings = useLiveQuery(() => db.settings.get('userSettings'));
    const absences = useLiveQuery(() => db.absences.toArray());
    const positiveActions = useLiveQuery(() => db.actions.toArray());
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

    if (!students || !absences || !positiveActions) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <DailyChecklist
            students={students}
            seatingChart={seatingChart}
            activeLayout={activeLayout}
            absences={absences}
            positiveActions={positiveActions}
        />
    );
}
