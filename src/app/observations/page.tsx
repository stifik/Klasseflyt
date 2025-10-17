"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Observations from "@/components/Observations";
import { Loader2 } from "lucide-react";

export default function ObservationsPage() {
    const students = useLiveQuery(() => db.students.toArray());
    const settings = useLiveQuery(() => db.settings.get('userSettings'));
    const remarks = useLiveQuery(() => db.remarks.toArray());
    const hourlyChecks = useLiveQuery(() => db.hourlyChecks.toArray());
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

    const handleUpdate = () => {
        // Trigger re-query by not doing anything - useLiveQuery will auto-update
    };

    if (!students || !settings || !remarks || !hourlyChecks) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <Observations
            students={students}
            initialRemarks={remarks}
            initialHourlyChecks={hourlyChecks}
            onUpdate={handleUpdate}
            seatingChart={seatingChart}
            settings={settings}
            activeLayout={activeLayout}
        />
    );
}
