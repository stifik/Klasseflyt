"use client";

import React, { useMemo, useState, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useCheckInTimer } from "@/hooks/useCheckInTimer";
import { handleManualCheckIn, handleCheckInTap } from "@/lib/checkInHandler";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, Play, Target, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/navigation/PageHeader";
import type { Student } from "@/lib/types";
import { useEffect } from "react";
import { useNFCWebSocket } from "@/hooks/useNFCWebSocket";

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
  const [forceUpdate, setForceUpdate] = useState(0);
  const { toast } = useToast();
  
  // Check if dev mode is enabled
  const isDevMode = typeof window !== 'undefined' && window.localStorage?.getItem('nfc_dev_mode') === 'true';

  // Dev mode state
  const [devWeekday, setDevWeekday] = useState<string>('');
  const [devTime, setDevTime] = useState<string>('');
  const [nfcDisabled, setNfcDisabled] = useState<boolean>(false);

  // Load dev overrides from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDevWeekday(window.localStorage?.getItem('dev_weekday_override') || '');
      setDevTime(window.localStorage?.getItem('dev_time_override') || '');
      setNfcDisabled(window.localStorage?.getItem('dev_nfc_disabled') === 'true');
    }
  }, []);

  // Handle dev weekday change
  const handleDevWeekdayChange = (value: string) => {
    const actualValue = value === 'none' ? '' : value;
    setDevWeekday(actualValue);
    if (typeof window !== 'undefined') {
      if (actualValue) {
        window.localStorage?.setItem('dev_weekday_override', actualValue);
      } else {
        window.localStorage?.removeItem('dev_weekday_override');
      }
    }
    setForceUpdate(prev => prev + 1);
  };

  // Handle dev time change
  const handleDevTimeChange = (value: string) => {
    setDevTime(value);
    if (typeof window !== 'undefined') {
      if (value) {
        window.localStorage?.setItem('dev_time_override', value);
      } else {
        window.localStorage?.removeItem('dev_time_override');
      }
    }
    setForceUpdate(prev => prev + 1);
  };

  // Handle NFC toggle
  const handleNfcToggle = (disabled: boolean) => {
    setNfcDisabled(disabled);
    if (typeof window !== 'undefined') {
      if (disabled) {
        window.localStorage?.setItem('dev_nfc_disabled', 'true');
      } else {
        window.localStorage?.removeItem('dev_nfc_disabled');
      }
    }
  };

  // Reset check-ins for today
  const handleResetCheckIns = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const logsToDelete = await db.checkInLogs
        .filter(log => {
          const logDate = new Date(log.date);
          logDate.setHours(0, 0, 0, 0);
          return logDate.getTime() === today.getTime();
        })
        .toArray();

      for (const log of logsToDelete) {
        if (log.id) await db.checkInLogs.delete(log.id);
      }

      const absencesToDelete = await db.absences
        .filter(absence => {
          const absDate = new Date(absence.date);
          absDate.setHours(0, 0, 0, 0);
          return absDate.getTime() === today.getTime();
        })
        .toArray();

      for (const absence of absencesToDelete) {
        if (absence.id) await db.absences.delete(absence.id);
      }

      setForceUpdate(prev => prev + 1);

      toast({
        title: "Innsjekking nullstilt",
        description: `${logsToDelete.length} innsjekking-logger og ${absencesToDelete.length} fravær ble slettet.`,
      });
    } catch (error) {
      console.error('Reset check-ins error:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke nullstille innsjekking.",
        variant: "destructive",
      });
    }
  };
  
  const { activeSession, startManualCheckIn, stopManualCheckIn } = useCheckInTimer();

  // Check if NFC is enabled in settings
  const nfcEnabled = settings?.nfcEnabled ?? false;

  // Handle NFC card detection during check-in
  const handleNFCCardDetected = useCallback(async (card: { uid: string; cardId: string; length: number; reader: string; timestamp: string }) => {
    console.log('🔵 NFC Card detected during check-in:', card);
    
    if (!activeSession) {
      console.log('⚠️ No active check-in session, ignoring card');
      return;
    }

    console.log('✅ Active session found, processing check-in tap');
    console.log('   Session:', {
      bellTimeId: activeSession.bellTime.id,
      bellTimeType: activeSession.bellTime.type,
      bellTimeTime: activeSession.bellTime.time,
      isManual: activeSession.isManual
    });

    try {
      const result = await handleCheckInTap(card.uid, activeSession);
      
      console.log('📋 Check-in tap result:', result);

      if (result.success) {
        toast({
          title: "✅ Innsjekket",
          description: `${result.studentName} sjekket inn${result.pointsAwarded ? ` (+${result.pointsAwarded} poeng)` : ''}`,
        });
        // Force re-render to update UI
        setForceUpdate(prev => prev + 1);
      } else {
        toast({
          title: "⚠️ Feil",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error processing NFC check-in:', error);
      toast({
        title: "❌ Feil",
        description: "Kunne ikke behandle NFC-kortet",
        variant: "destructive",
      });
    }
  }, [activeSession, toast]);

  // WebSocket NFC setup for real-time card detection (only if enabled)
  const nfcWebSocket = useNFCWebSocket({
    enabled: nfcEnabled,
    autoConnect: nfcEnabled,
    autoMonitor: true, // Auto-start monitoring when connected
    onCardDetected: handleNFCCardDetected,
    onError: (error, message) => {
      console.error('❌ NFC WebSocket error:', error, message);
      toast({
        title: "NFC-feil",
        description: message || 'Feil ved kortlesing',
        variant: "destructive",
      });
    }
  });

  // Debug log when NFC status changes
  useEffect(() => {
    console.log('🔍 Innsjekking NFC Status Update:');
    console.log('   nfcEnabled:', nfcEnabled);
    console.log('   WebSocket status:', nfcWebSocket.status);
    console.log('   Readers connected:', nfcWebSocket.readersConnected);
    console.log('   Active session:', activeSession ? 'Yes' : 'No');
  }, [nfcEnabled, nfcWebSocket.status, nfcWebSocket.readersConnected, activeSession]);

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

  // Get all check-in logs (live updates)
  const allCheckInLogs = useLiveQuery(() => db.checkInLogs.toArray());

  // Filter today's check-ins
  const todayCheckIns = useMemo(() => {
    if (!allCheckInLogs || !activeSession) return [];
    
    const today = new Date();
    const todayAtNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
    const todayString = todayAtNoon.toISOString().split('T')[0];
    
    return allCheckInLogs.filter(log => {
      const logDateString = new Date(log.date).toISOString().split('T')[0];
      const dateMatch = logDateString === todayString;
      const bellMatch = log.bellTimeId === activeSession.bellTime.id;
      return dateMatch && bellMatch;
    });
  }, [allCheckInLogs, activeSession]);

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
    if (!activeSession) {
      toast({
        title: "Ingen aktiv innsjekking",
        description: "Start en innsjekking først",
        variant: "destructive",
      });
      return;
    }
    
    if (!student.id) {
      return;
    }
    
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
    const isDisabled = !activeSession || isCheckedIn || isAbsent;
    
    return (
      <div className="relative w-full aspect-[7/5]">
        <Button
          variant={isCheckedIn ? "default" : "outline"}
          disabled={isDisabled}
          onClick={() => {
            console.log('[StudentButton] Button clicked for', student.name, 'disabled:', isDisabled);
            handleStudentClick(student);
          }}
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
    <div>
      <PageHeader 
        title="Innsjekking" 
        settingsUrl="/settings#checkin"
      />
      <div className="space-y-6">

      {/* Dev Tools */}
      {isDevMode && (
        <div className="p-4 rounded-lg border-2 bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700">
          <h3 className="font-semibold text-sm text-orange-800 dark:text-orange-300 mb-3">🔧 Dev Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Simuler ukedag</label>
              <Select value={devWeekday || 'none'} onValueChange={handleDevWeekdayChange}>
                <SelectTrigger className="bg-white dark:bg-gray-950">
                  <SelectValue placeholder="Faktisk dag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Faktisk dag</SelectItem>
                  <SelectItem value="mandag">Mandag</SelectItem>
                  <SelectItem value="tirsdag">Tirsdag</SelectItem>
                  <SelectItem value="onsdag">Onsdag</SelectItem>
                  <SelectItem value="torsdag">Torsdag</SelectItem>
                  <SelectItem value="fredag">Fredag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Simuler klokkeslett</label>
              <input
                type="time"
                value={devTime}
                onChange={(e) => handleDevTimeChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-950 dark:border-gray-700"
                placeholder="Faktisk tid"
              />
              {devTime && (
                <button
                  onClick={() => handleDevTimeChange('')}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 mt-1"
                >
                  Nullstill til faktisk tid
                </button>
              )}
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleResetCheckIns}
                variant="outline"
                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-950"
              >
                🔄 Nullstill innsjekking
              </Button>
            </div>
          </div>

          {/* NFC Toggle */}
          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
            <div className="flex items-center space-x-2">
              <Switch
                id="nfc-toggle"
                checked={nfcDisabled}
                onCheckedChange={handleNfcToggle}
              />
              <Label htmlFor="nfc-toggle" className="text-xs text-gray-700 dark:text-gray-300">
                Deaktiver NFC-polling (reduserer konsoll-spam)
              </Label>
            </div>
          </div>

          {/* Dev info display */}
          {(devWeekday || devTime) && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              ⚠️ Du simulerer: {devWeekday && `${devWeekday.charAt(0).toUpperCase() + devWeekday.slice(1)}`} {devTime && `kl. ${devTime}`}
            </p>
          )}

          {/* Debug info */}
          {activeSession && settings?.checkInSettings && (
            <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800 text-xs space-y-1">
              <p className="font-semibold text-orange-800 dark:text-orange-300">Debug Info:</p>
              <p className="text-gray-700 dark:text-gray-300">Type: {activeSession.bellTime.type} | Minutter: {activeSession.minutesElapsed} | Poeng: {activeSession.pointsPercent}%</p>
              {activeSession.bellTime.type === 'morgen' ? (
                <p className="text-gray-700 dark:text-gray-300">Innstillinger: 100%≤{settings.checkInSettings.morning.percent100Minutes}min, 50%≤{settings.checkInSettings.morning.percent50Minutes}min, 10%≤{settings.checkInSettings.morning.percent10Minutes}min, Stopp{'>'}{settings.checkInSettings.morning.absenceMinutes}min</p>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">Innstillinger: 100%≤{settings.checkInSettings.regular.percent100Minutes}min, Stopp{'>'}{settings.checkInSettings.regular.stopMinutes}min</p>
              )}
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
