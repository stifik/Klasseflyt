"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import PageHeader from "@/components/navigation/PageHeader";
import { Loader2 } from "lucide-react";
import { SeatingChartTabContent } from "@/components/ClassroomTools";

export default function SeatingPage() {
    const students = useLiveQuery(() => db.students.toArray());
    const settings = useLiveQuery(() => db.settings.get('userSettings'));
    const history = useLiveQuery(() => db.seatingChartHistory.orderBy('createdAt').reverse().toArray());

    const handleSettingsChange = async (newSettings: any) => {
        await db.settings.put({ id: 'userSettings', ...newSettings });
    };

    const handleSeatingChartChange = async (chart: any, source: 'generation' | 'drag' | 'load') => {
        if (chart) {
            await db.seatingChartHistory.add({
                chartJson: JSON.stringify(chart),
                createdAt: new Date(),
                source,
            });
        }
    };

    if (!students || !settings || !history) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <PageHeader title="Klassekart" settingsUrl="/settings#seatingChartLegend" />
            <SeatingChartTabContent
                students={students}
                appSettings={settings}
                onAppSettingsChange={handleSettingsChange}
                onSeatingChartChange={handleSeatingChartChange}
                history={history}
            />
        </div>
    );
}
