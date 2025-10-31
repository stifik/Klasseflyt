"use client";

import * as React from "react";
import type { AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ScheduleSettingsProps {
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
}

export default function ScheduleSettings({ settings, onSettingsChange }: ScheduleSettingsProps) {
  const handleScheduleChange = (period: number, type: 'startTime' | 'endTime', value: string) => {
    const newSchedule = [...settings.schedule];
    const periodIndex = newSchedule.findIndex(p => p.period === period);
    if (periodIndex > -1) {
      newSchedule[periodIndex] = { ...newSchedule[periodIndex], [type]: value };
    }
    onSettingsChange({ ...settings, schedule: newSchedule });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeplan</CardTitle>
        <CardDescription>Legg inn start- og sluttid for timene. Dette brukes til å auto-velge time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {settings.schedule.map(({ period, startTime, endTime }) => (
          <div key={period} className="grid items-center grid-cols-3 gap-2 p-2 border rounded-lg">
            <Label htmlFor={`period-${period}`} className="font-medium">Time {period}</Label>
            <Input
              id={`period-${period}-start`}
              type="text"
              value={startTime}
              onChange={(e) => handleScheduleChange(period, 'startTime', e.target.value)}
              placeholder="TT:MM"
              pattern="[0-9]{2}:[0-9]{2}"
            />
            <Input
              id={`period-${period}-end`}
              type="text"
              value={endTime}
              onChange={(e) => handleScheduleChange(period, 'endTime', e.target.value)}
              placeholder="TT:MM"
              pattern="[0-9]{2}:[0-9]{2}"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
