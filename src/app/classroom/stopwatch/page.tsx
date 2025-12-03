"use client";

import Stopwatch from "@/components/Stopwatch";

export default function StopwatchPage() {
    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold mb-6">Timere</h1>
            <Stopwatch />
        </div>
    );
}
