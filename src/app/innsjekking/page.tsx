"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useCheckInTimer } from "@/hooks/useCheckInTimer";
import { handleManualCheckIn } from "@/lib/checkInHandler";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Users, Play, Target, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/lib/types";

/**
 * Dedikert innsjekking-side
 * Optimalisert for rask og enkel innsjekking med NFC eller manuelt
 */
export default function InnsjekkingPage() {
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get('userSettings'));
  const seatingChartRecords = useLiveQuery(() => db.seatingChartHistory.toArray()) || [];
  const seatingLayouts = useLiveQuery(() => db.seatingLayouts.toArray()) || [];
  const [isFlipped, setIsFlipped] = useState(false);
  const { toast } = useToast();
  
  const { activeSession, startManualCheckIn, stopManualCheckIn } = useCheckInTimer();

  // Get current seating chart
  const currentSeatingChart = useLiveQuery(async () => {
    const latest = await db.seatingChartHistory.orderBy('createdAt').last();
    return latest ? JSON.parse(latest.chartJson) : null;
  }, []);

  const activeLayout = useLiveQuery(async () => {
    if (settings?.selectedSeatingLayoutId) {
      return await db.seatingLayouts.get(settings.selectedSeatingLayoutId);
    }
    return null;
  }, [settings?.selectedSeatingLayoutId]);

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

  // Get today's absences
  const todaysAbsences = useLiveQuery(() => {
    const todayString = new Date().toISOString().split('T')[0];
    return db.absences
      .filter(a => new Date(a.date).toISOString().split('T')[0] === todayString)
      .toArray();
  }, []);

  // Check if student is absent
  const isStudentAbsent = (studentId: number) => {
    return todaysAbsences?.some(a => a.studentId === studentId) || false;
  };

  // Toggle absence
  const handleAbsenceToggle = async (studentId: number) => {
    const todayString = new Date().toISOString().split('T')[0];
    const existingAbsence = todaysAbsences?.find(a => a.studentId === studentId);

    try {
      if (existingAbsence) {
        if (existingAbsence.id) {
          await db.absences.delete(existingAbsence.id);
          toast({
            title: "Fravær fjernet",
            description: "Eleven er ikke lenger markert som fraværende.",
          });
        }
      } else {
        await db.absences.add({
          studentId,
          date: new Date()
        });
        toast({
          title: "Fravær registrert",
          description: "Eleven er markert som fraværende.",
        });
      }
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke registrere fravær.",
        variant: "destructive",
      });
    }
  };

  // Manual check-in handler
  const handleStudentClick = async (student: Student) => {
    if (!activeSession || !student.id) return;
    
    // Check if already checked in
    if (checkedInStudentIds.has(student.id)) {
      toast({
        title: "Allerede innsjekket",
        description: `${student.name} er allerede sjekket inn.`,
      });
      return;
    }

    const result = await handleManualCheckIn(student.id, activeSession);
    
    if (result.success) {
      toast({
        title: "✅ Sjekket inn!",
        description: result.message,
      });
    } else {
      toast({
        title: "❌ Feil",
        description: result.message || "Kunne ikke sjekke inn",
        variant: "destructive",
      });
    }
  };

  // Empty desk component - invisible
  const EmptyDesk = () => (
    <div className="w-full aspect-[7/5]" />
  );

  // Student button component
  const StudentButton = ({ student }: { student: Student }) => {
    const isCheckedIn = checkedInStudentIds.has(student.id!);
    const isAbsent = isStudentAbsent(student.id!);
    
    return (
      <div className="relative w-full aspect-[7/5]">
        <Button
          variant={isCheckedIn ? "default" : "outline"}
          disabled={!activeSession || isCheckedIn || isAbsent}
          onClick={() => handleStudentClick(student)}
          className={cn("justify-center h-auto py-2 flex-col w-full h-full", {
            "bg-green-600 hover:bg-green-700 text-white": isCheckedIn,
            "opacity-50": !activeSession || isAbsent,
            "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950": activeSession && !isCheckedIn && !isAbsent,
          })}
        >
          <span className="font-semibold text-xs">{student.name}</span>
          <div className="flex items-center text-xs opacity-80">
            {isCheckedIn ? (
              <span>✓ Sjekket inn</span>
            ) : isAbsent ? (
              <span>Fraværende</span>
            ) : (
              <span>{activeSession?.isManual || !settings?.nfcEnabled ? 'Klikk for å sjekke inn' : 'Klikk eller scan NFC'}</span>
            )}
          </div>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-0 right-0 w-6 h-6"
          onClick={(e) => {
            e.stopPropagation();
            handleAbsenceToggle(student.id!);
          }}
        >
          <UserX className={cn(
            "w-4 h-4",
            isAbsent ? "text-destructive" : "text-muted-foreground hover:text-destructive"
          )} />
          <span className="sr-only">Meld fravær</span>
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Innsjekking</h1>
        <p className="text-muted-foreground">
          {activeSession 
            ? "Klikk på elever i klassekartet for å sjekke dem inn"
            : "Start en innsjekking-sesjon for å begynne"
          }
        </p>
      </div>

      {/* Quick stats + Manual controls */}
      <div className="grid gap-4 md:grid-cols-4">
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
                ? `${activeSession.bellTime.type === 'morgen' ? 'Morgen' : 'Ordinær'}`
                : 'Ingen sesjon'}
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
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSession ? `${activeSession.pointsPercent}%` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeSession
                ? `${activeSession.minutesElapsed} min`
                : 'Ingen sesjon'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manuell kontroll</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <Button
              onClick={() => startManualCheckIn('morgen', 10)}
              disabled={!!activeSession}
              size="sm"
              className="w-full text-xs h-7"
            >
              Start morgen
            </Button>
            <Button
              onClick={() => startManualCheckIn('ordinær', 10)}
              disabled={!!activeSession}
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
            >
              Start ordinær
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Seating chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Klassekart</CardTitle>
              <CardDescription>
                {activeSession 
                  ? "Klikk på elever for å sjekke dem inn. Grønne = innsjekket."
                  : "Start en innsjekking-sesjon for å begynne."
                }
              </CardDescription>
            </div>
            {currentSeatingChart && (
              <div className="flex items-center space-x-2">
                <Switch id="flip-view" checked={isFlipped} onCheckedChange={setIsFlipped} />
                <Label htmlFor="flip-view" className="text-sm">Speilvendt</Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentSeatingChart && activeLayout ? (
            <div className="space-y-2">
              {Array.from({ length: activeLayout.rows }).map((_, r) => {
                const rowIndex = isFlipped ? activeLayout.rows - 1 - r : r;
                return (
                  <div 
                    key={rowIndex} 
                    className="grid gap-2" 
                    style={{ gridTemplateColumns: `repeat(${activeLayout.cols}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: activeLayout.cols }).map((_, c) => {
                      const colIndex = isFlipped ? activeLayout.cols - 1 - c : c;

                      if (!activeLayout.layout[rowIndex]?.[colIndex]) {
                        return <EmptyDesk key={`empty-${rowIndex}-${colIndex}`} />;
                      }

                      const studentName = currentSeatingChart[rowIndex]?.[colIndex]?.[0];
                      const student = studentName ? students.find(s => s.name === studentName) : null;

                      return student && student.id ? (
                        <StudentButton key={student.id} student={student} />
                      ) : (
                        <EmptyDesk key={`desk-${rowIndex}-${colIndex}`} />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : !currentSeatingChart ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <p>Ingen klassekart tilgjengelig. Gå til "Klasseverktøy → Klassekart" for å opprette et.</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <p>Klassekartet er tomt. Gå til "Klasseverktøy → Klassekart" for å generere et.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
