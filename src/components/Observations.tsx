
"use client";

import { useState, useEffect, FC } from 'react';
import type { Student, Remark, SeatingChartData, AppSettings, DashboardSubTab } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Remarks from './Remarks'; // Re-using the existing component

// Placeholder for TimeCheck component
const TimeCheck = () => (
    <div className="p-4 border rounded-lg">
        <h2 className="text-xl font-semibold">Timeinnsjekk</h2>
        <p className="text-muted-foreground mt-2">Dette verktøyet er under utvikling.</p>
    </div>
);


interface ObservationsProps {
    students: Student[];
    initialRemarks: Remark[];
    onUpdate: () => void;
    seatingChart: SeatingChartData | null;
    settings: AppSettings;
    activeSubTab: DashboardSubTab | null;
}

const Observations: FC<ObservationsProps> = (props) => {
    const [activeTab, setActiveTab] = useState<DashboardSubTab>(props.activeSubTab || "remarks");
    
    useEffect(() => {
        if (props.activeSubTab) {
            setActiveTab(props.activeSubTab);
        }
    }, [props.activeSubTab]);

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DashboardSubTab)} className="w-full space-y-4">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timecheck">Timeinnsjekk</TabsTrigger>
                <TabsTrigger value="remarks">Anmerkninger</TabsTrigger>
            </TabsList>
            <TabsContent value="timecheck">
                <TimeCheck />
            </TabsContent>
            <TabsContent value="remarks">
                <Remarks {...props} />
            </TabsContent>
        </Tabs>
    );
}

export default Observations;
