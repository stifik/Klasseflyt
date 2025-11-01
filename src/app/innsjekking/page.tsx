"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useCheckInTimer } from "@/hooks/useCheckInTimer";
import CheckInNFC from "@/components/CheckInNFC";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users, Play, StopCircle } from "lucide-react";

/**
 * Dedikert innsjekking-side
 * Optimalisert for rask og enkel innsjekking med NFC eller manuelt
 */
export default function InnsjekkingPage() {
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get('userSettings'));
  
  const { activeSession, startManualCheckIn, stopManualCheckIn } = useCheckInTimer();

  // Get today's check-ins for count
  const todayCheckIns = useLiveQuery(async () => {
    if (!activeSession) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.checkInLogs
      .where('timestamp')
      .between(today.getTime(), tomorrow.getTime())
      .and(log => log.bellTimeId === activeSession.bellTime.id!)
      .toArray();
  }, [activeSession?.bellTime.id]);

  const checkedInStudentIds = new Set((todayCheckIns || []).map(log => log.studentId));
  const checkInCount = checkedInStudentIds.size;

  // Check if NFC is enabled
  const nfcEnabled = settings?.nfcEnabled || false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Innsjekking</h1>
        <p className="text-muted-foreground">
          Start en innsjekking-sesjon og la elevene scanne kortene sine
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSession ? (
                <span className="text-green-600 dark:text-green-400">Aktiv</span>
              ) : (
                <span className="text-muted-foreground">Venter</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeSession
                ? `${activeSession.bellTime.type === 'morgen' ? 'Morgen' : 'Ordinær'} innsjekking`
                : 'Start en sesjon for å begynne'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Innsjekket</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {checkInCount} / {students.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {students.length - checkInCount} gjenstår
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poengfordeling</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSession ? `${activeSession.pointsPercent}%` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeSession
                ? `${activeSession.minutesElapsed} min siden start`
                : 'Ingen aktiv sesjon'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manual controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manuell innsjekking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => startManualCheckIn('morgen', 10)}
              disabled={!!activeSession}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Start morgeninnsjekking
            </Button>
            <Button
              onClick={() => startManualCheckIn('ordinær', 10)}
              disabled={!!activeSession}
              variant="outline"
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Start ordinær innsjekking
            </Button>
          </div>

          {activeSession?.isManual && (
            <Button
              onClick={stopManualCheckIn}
              variant="destructive"
              className="w-full"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Stopp innsjekking
            </Button>
          )}
        </CardContent>
      </Card>

      {/* NFC Check-in component */}
      {nfcEnabled ? (
        <CheckInNFC
          activeSession={activeSession}
          checkInCount={checkInCount}
          totalStudents={students.length}
          students={students}
          checkedInStudentIds={checkedInStudentIds}
          onStartManual={startManualCheckIn}
          onStopManual={stopManualCheckIn}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>NFC er deaktivert</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aktiver NFC i innstillingene for å bruke kortscan-funksjonalitet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Student list with check-in status */}
      <Card>
        <CardHeader>
          <CardTitle>Elevliste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {students.map((student) => (
              <div
                key={student.id}
                className={`flex items-center justify-between p-2 rounded ${
                  checkedInStudentIds.has(student.id!)
                    ? 'bg-green-50 dark:bg-green-950/20'
                    : 'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <span className="font-medium">{student.name}</span>
                {checkedInStudentIds.has(student.id!) && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />
                    Innsjekket
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
