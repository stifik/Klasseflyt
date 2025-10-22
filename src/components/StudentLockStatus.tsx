"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { AppSettings, SeatingLayout } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

interface StudentLockStatusProps {
  appSettings: AppSettings;
}

export default function StudentLockStatus({ appSettings }: StudentLockStatusProps) {
  const students = useLiveQuery(() => db.students.toArray());
  
  const activeLayout: SeatingLayout | undefined = useLiveQuery(() => {
    if (appSettings.selectedSeatingLayoutId) {
      return db.seatingLayouts.get(appSettings.selectedSeatingLayoutId);
    }
    return Promise.resolve(undefined);
  }, [appSettings.selectedSeatingLayoutId]) as SeatingLayout | undefined;

  const lockedStudentNames = useMemo(() => {
    return new Set(activeLayout?.lockedDesks?.map((desk) => desk.studentName) || []);
  }, [activeLayout]);

  if (!students) {
    return <p>Laster elever...</p>;
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Debug: Student Lock Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 text-sm">
          {students.sort((a,b) => a.name.localeCompare(b.name)).map(student => {
            const isLocked = lockedStudentNames.has(student.name);
            return (
              <li key={student.id}>
                {student.name} - <strong>{isLocked ? "LÅST" : "ULÅST"}</strong>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
