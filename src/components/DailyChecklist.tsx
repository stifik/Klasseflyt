

"use client";

import { useState, useMemo, useEffect } from "react";
import type { Student, DailyCheck, SeatingChartData, SeatingLayout, Absence } from "@/lib/types";
import type { PositiveAction } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, BatteryWarning, TabletSmartphone, UserX, Info, Bell, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { givePoints } from "@/lib/rewardService";
import { useLiveQuery } from "dexie-react-hooks";
import NFCCheckIn from "./NFCCheckIn";
import { useCheckInTimer } from "@/hooks/useCheckInTimer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckInNFC from "./CheckInNFC";
import { handleManualCheckIn } from "@/lib/checkInHandler";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type IpadStatus = "OK" | "NotCharged" | "NotBrought";

interface DailyChecklistProps {
  students: Student[];
  seatingChart: SeatingChartData | null;
  activeLayout: SeatingLayout | null;
  absences: Absence[];
  positiveActions: PositiveAction[];
}

export default function DailyChecklist({ students, seatingChart, activeLayout, absences, positiveActions }: DailyChecklistProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [isFlipped, setIsFlipped] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // Add force update trigger
  const [mode, setMode] = useState<'ipad' | 'checkin'>('ipad');
  const { toast } = useToast();

  // Check for active check-in session
  const { activeSession: activeCheckIn, startManualCheckIn, stopManualCheckIn } = useCheckInTimer();

  // Check if dev mode is enabled
  const isDevMode = typeof window !== 'undefined' && window.localStorage?.getItem('nfc_dev_mode') === 'true';

  // Get settings for dev display
  const settings = useLiveQuery(() => db.settings.get('userSettings'));

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
      // Delete today's check-in logs
      const logsToDelete = await db.checkInLogs
        .filter(log => {
          const logDate = new Date(log.date);
          logDate.setHours(0, 0, 0, 0);
          return logDate.getTime() === today.getTime();
        })
        .toArray();

      // Delete each log
      for (const log of logsToDelete) {
        if (log.id) await db.checkInLogs.delete(log.id);
      }

      // Delete today's absences (that were auto-registered from check-in)
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

      // Force refresh
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
  
  // Get all data and filter in useMemo to ensure proper reactivity
  // useLiveQuery auto-updates when DB changes, no need for forceUpdate dependency
  const allChecks = useLiveQuery(() => db.dailyChecks.toArray());
  const allAbsences = useLiveQuery(() => db.absences.toArray());
  const allCheckInLogs = useLiveQuery(() => db.checkInLogs.toArray());
  
  // Get date string for filtering
  const dateString = useMemo(() => date.toISOString().split("T")[0], [date]);
  
  // Filter data for today using useMemo with proper dependencies
  const todaysChecks = useMemo(() => {
    if (!allChecks) return [];
    return allChecks.filter(c => new Date(c.date).toISOString().split("T")[0] === dateString);
  }, [allChecks, dateString]);
  
  const todaysAbsences = useMemo(() => {
    if (!allAbsences) return [];
    return allAbsences.filter(a => new Date(a.date).toISOString().split("T")[0] === dateString);
  }, [allAbsences, dateString]);

  const todaysCheckInLogs = useMemo(() => {
    if (!allCheckInLogs || !activeCheckIn) return [];
    
    // Use noon-based date to match the storage format
    const selectedDate = new Date(date);
    const selectedDateAtNoon = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0, 0, 0);
    const selectedDateString = selectedDateAtNoon.toISOString().split('T')[0];
    
    const filtered = allCheckInLogs.filter(log => {
      const logDateString = new Date(log.date).toISOString().split('T')[0];
      const dateMatch = logDateString === selectedDateString;
      const bellMatch = log.bellTimeId === activeCheckIn.bellTime.id;
      return dateMatch && bellMatch;
    });
    return filtered;
  }, [allCheckInLogs, date, activeCheckIn]);

  // Debug logging to trace which session the UI thinks is active and which students are marked as checked-in
  useEffect(() => {
    try {
      const activeId = activeCheckIn?.bellTime?.id ?? null;
      console.debug('[DailyChecklist] activeCheckIn id:', activeId, 'todaysCheckInLogs count:', todaysCheckInLogs.length, 'date:', dateString);
      console.debug('[DailyChecklist] todaysCheckInLogs:', todaysCheckInLogs.map(l => ({ studentId: l.studentId, bellTimeId: l.bellTimeId, id: (l as any).id })));
    } catch (err) {
      // ignore
    }
  }, [todaysCheckInLogs, activeCheckIn, dateString]);

  // Memoize these functions with proper dependencies
  const getAbsenceForDate = useMemo(() => {
    return (studentId: number) => {
      return todaysAbsences.find(a => a.studentId === studentId);
    };
  }, [todaysAbsences]);

  const getCheckForDate = useMemo(() => {
    return (studentId: number) => {
      return todaysChecks.find(c => c.studentId === studentId);
    };
  }, [todaysChecks]);

  const getStatus = useMemo(() => {
    return (studentId: number): IpadStatus => {
      const check = getCheckForDate(studentId);
      if (!check) return "OK";
      if (!check.ipadBrought) return "NotBrought";
      if (!check.ipadCharged) return "NotCharged";
      return "OK";
    };
  }, [getCheckForDate]);

  const hasCheckedIn = useMemo(() => {
    return (studentId: number) => {
      return todaysCheckInLogs.some(log => log.studentId === studentId);
    };
  }, [todaysCheckInLogs]);

  const checkedInStudentIds = useMemo(() => {
    return new Set(todaysCheckInLogs.map(log => log.studentId));
  }, [todaysCheckInLogs]);
  
  const handleStatusChange = async (studentId: number) => {
    const currentStatus = getStatus(studentId);
    const studentName = students.find(s => s.id === studentId)?.name || 'Eleven';
    const existingCheck = getCheckForDate(studentId);

    try {
        switch (currentStatus) {
            case "OK":
                await db.dailyChecks.add({ studentId, date, ipadCharged: false, ipadBrought: true });
                break;
            case "NotCharged":
                 if (existingCheck) {
                   await db.dailyChecks.update(existingCheck.id!, { ipadBrought: false });
                 }
                break;
            case "NotBrought":
                if (existingCheck) {
                  await db.dailyChecks.delete(existingCheck.id!);
                }
                break;
        }
        
        // Force a refresh of the data
        setForceUpdate(prev => prev + 1);
        
    } catch (error) {
        console.error(error);
        toast({title: "Feil", description: `Kunne ikke lagre endring for ${studentName}.`, variant: "destructive"});
    }
  };

  const handleAbsenceToggle = async (studentId: number) => {
    const existingAbsence = getAbsenceForDate(studentId);
    try {
      if (existingAbsence) {
        await db.absences.delete(existingAbsence.id!);
      } else {
        await db.absences.add({ studentId, date });
      }
      
      // Force a refresh of the data
      setForceUpdate(prev => prev + 1);
      
    } catch (error) {
      console.error(error);
      toast({title: "Feil", description: "Kunne ikke oppdatere fravær.", variant: "destructive"});
    }
  };
  
  const statusConfig: Record<IpadStatus, { variant: "default" | "destructive" | "outline", icon?: React.ReactNode, label: string }> = {
    OK: { variant: "default", label: "OK" },
    NotCharged: { variant: "outline", icon: <BatteryWarning className="mr-2" />, label: "Ikke ladet" },
    NotBrought: { variant: "destructive", icon: <TabletSmartphone className="mr-2" />, label: "Ikke medbrakt" },
  };

  const StudentButton = ({ student }: { student: Student }) => {
  // Guard against undefined id
  if (!student.id) return null;

  const status = getStatus(student.id);
  const config = statusConfig[status];
  const isAbsent = !!getAbsenceForDate(student.id);
  const checkedIn = hasCheckedIn(student.id);
  const [showGivePoints, setShowGivePoints] = useState(false);

  // Show absent button in both modes
  if (isAbsent) {
    return (
       <Button
        variant="secondary"
        onClick={() => handleAbsenceToggle(student.id!)}
        className="justify-center h-auto py-2 flex-col w-full aspect-[7/5] text-muted-foreground"
      >
        <span className="font-semibold text-xs">{student.name}</span>
         <div className="flex items-center text-xs">
           <UserX className="mr-2" />
           <span>Fravær</span>
        </div>
      </Button>
    );
  }

  // Check-in mode
  if (mode === 'checkin') {
    const handleCheckInClick = async () => {
      // Allow manual check-in if session is active and student hasn't checked in yet
      if (!activeCheckIn || checkedIn) return;

      const result = await handleManualCheckIn(student.id!, activeCheckIn);

      if (result.success) {
        toast({
          title: "✅ Sjekket inn!",
          description: result.message,
        });
        // useLiveQuery will auto-update
      } else {
        toast({
          title: "❌ Feil",
          description: result.message,
          variant: "destructive",
        });
      }
    };

    return (
      <div className="relative w-full aspect-[7/5]">
        <Button
          key={student.id}
          variant={checkedIn ? "default" : "outline"}
          disabled={!activeCheckIn || checkedIn}
          onClick={handleCheckInClick}
          className={cn("justify-center h-auto py-2 flex-col w-full h-full", {
            "bg-green-600 hover:bg-green-700 text-white": checkedIn,
            "opacity-50": !activeCheckIn,
            "cursor-pointer hover:bg-blue-50": activeCheckIn && !checkedIn,
          })}
        >
          <span className="font-semibold text-xs">{student.name}</span>
          <div className="flex items-center text-xs opacity-80">
            {checkedIn ? <span>✓ Sjekket inn</span> : <span>{activeCheckIn?.isManual ? 'Klikk for å sjekke inn' : 'Klikk eller scan NFC'}</span>}
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
          <UserX className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          <span className="sr-only">Meld fravær</span>
        </Button>
      </div>
    );
  }

  // iPad mode (original)
  return (
    <div className="relative w-full aspect-[7/5]">
      <Button
        key={student.id}
        variant={config.variant}
        onClick={() => handleStatusChange(student.id!)}
        className={cn("justify-center h-auto py-2 flex-col w-full h-full", {
           "bg-green-600 hover:bg-green-700 text-white": status === "OK",
           "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500": status === "NotCharged",
        })}
      >
        <span className="font-semibold text-xs">{student.name}</span>
        <div className="flex items-center text-xs opacity-80">
           {config.icon}
           <span>{config.label}</span>
        </div>
      </Button>
      {/* Gi poeng for iPad ladet og klar */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute bottom-0 right-0 w-6 h-6"
        title="Gi poeng for iPad ladet og klar"
        onClick={async () => {
          const ipadAction = positiveActions.find(a => a.actionKey === 'IPAD_CHARGED');
          if (ipadAction) {
            const success = await givePoints(student.id!, ipadAction.points, ipadAction.name);
            if (success) {
              setShowGivePoints(true);
              setTimeout(() => setShowGivePoints(false), 1200);
            }
          }
        }}
      >
        <span className="text-green-600 font-bold text-lg">+</span>
        <span className="sr-only">Gi poeng for iPad ladet og klar</span>
      </Button>
      {showGivePoints && (
        <div className="absolute bottom-7 right-0 bg-green-100 text-green-800 px-2 py-1 rounded text-xs shadow">
          +{positiveActions.find(a => a.actionKey === 'IPAD_CHARGED')?.points || 5} poeng!
        </div>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-0 right-0 w-6 h-6"
        onClick={() => handleAbsenceToggle(student.id!)}
      >
        <UserX className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        <span className="sr-only">Meld fravær</span>
      </Button>
    </div>
  );
  };

  const EmptyDesk = () => (
    <div className="w-full aspect-[7/5]" />
  );
  
  const displayedChart = isFlipped 
    ? seatingChart?.map(row => [...row].reverse()).reverse() 
    : seatingChart;

  // Bulk reward handler
  // Dev mode: Reset today's data (dailyChecks, absences, NFC session)
  const handleResetToday = async () => {
    const todayString = date.toISOString().split('T')[0];

    try {
      // Delete today's checks
      const checksToDelete = await db.dailyChecks
        .filter(c => new Date(c.date).toISOString().split('T')[0] === todayString)
        .toArray();

      for (const check of checksToDelete) {
        if (check.id) await db.dailyChecks.delete(check.id);
      }

      // Delete today's absences
      const absencesToDelete = await db.absences
        .filter(a => new Date(a.date).toISOString().split('T')[0] === todayString)
        .toArray();

      for (const absence of absencesToDelete) {
        if (absence.id) await db.absences.delete(absence.id);
      }

      // Delete NFC session
      await db.nfcRegistrationSessions.delete(todayString);

      // Force refresh
      setForceUpdate(prev => prev + 1);

      toast({
        title: "Nullstilt",
        description: "Dagens data er tilbakestilt som om det var en ny dag.",
      });
    } catch (error) {
      console.error('Reset error:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke nullstille dagens data.",
        variant: "destructive",
      });
    }
  };

  const handleBulkReward = async () => {
    const ipadAction = positiveActions.find(a => a.actionKey === 'IPAD_CHARGED');

    if (!ipadAction) {
      toast({
        title: "Feil",
        description: "Konfigurasjon for 'iPad ladet' ble ikke funnet i innstillingene.",
        variant: "destructive",
      });
      return;
    }

    const qualifiedStudents = students.filter(student => {
      if (!student.id) return false;
      const isAbsent = todaysAbsences.some(a => a.studentId === student.id);
      if (isAbsent) return false;
      return getStatus(student.id) === 'OK';
    });

    if (qualifiedStudents.length === 0) {
      toast({
        title: "Ingen kvalifiserte elever",
        description: "Ingen elever var markert med 'OK' status. Ingen poeng ble gitt.",
        variant: "destructive",
      });
      return;
    }

    try {
      let successCount = 0;
      for (const student of qualifiedStudents) {
        const success = await givePoints(student.id!, ipadAction.points, ipadAction.name);
        if (success) successCount++;
      }
      
      toast({
        title: "Bulk-belønning fullført!",
        description: `${successCount} elever har mottatt ${ipadAction.points} poeng hver for ${ipadAction.name}.`,
      });
    } catch (error) {
      toast({
        title: "Feil",
        description: "Det oppstod en feil under bulk-belønningen.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'ipad' | 'checkin')}>
              <TabsList>
                <TabsTrigger value="ipad" className="flex items-center gap-2">
                  <TabletSmartphone className="w-4 h-4" />
                  iPad-sjekk
                </TabsTrigger>
                <TabsTrigger value="checkin" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Innsjekking
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              {/* Manual check-in buttons - only show in check-in mode */}
              {mode === 'checkin' && (
                <>
                  <Button
                    onClick={() => {
                      console.log('[DAILY-CHECK] Start morgen button clicked, activeCheckIn:', activeCheckIn);
                      startManualCheckIn('morgen', 10);
                    }}
                    disabled={!!activeCheckIn}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Start morgen-innsjekk
                  </Button>
                  <Button
                    onClick={() => startManualCheckIn('ordinær', 10)}
                    disabled={!!activeCheckIn}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Start ordinær innsjekk
                  </Button>
                </>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-[280px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: nb }) : <span>Velg en dato</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar locale={nb} mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Check-in Status Banner */}
          {mode === 'checkin' && activeCheckIn && activeCheckIn.bellTime && (
            <div className={cn(
              "p-4 rounded-lg border-2",
              activeCheckIn.shouldStop ? "bg-gray-100 border-gray-300" : "bg-green-50 border-green-300"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-sm">
                      {activeCheckIn.bellTime.type === 'morgen' ? 'Morgeninnsjekking' : 'Innsjekking'} aktiv
                    </h3>
                    <p className="text-xs text-gray-600">
                      {activeCheckIn.minutesElapsed} minutter siden ringetid • {activeCheckIn.pointsPercent}% poeng
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {todaysCheckInLogs.length}/{students.filter(s => !getAbsenceForDate(s.id!)).length}
                  </div>
                  <div className="text-xs text-gray-600">sjekket inn</div>
                </div>
              </div>
            </div>
          )}

          {mode === 'checkin' && !activeCheckIn && (
            <div className="p-4 rounded-lg border-2 bg-gray-50 border-gray-200">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="font-semibold text-sm text-gray-600">Ingen aktiv innsjekking</h3>
                  <p className="text-xs text-gray-500">
                    Vent på neste ringetid eller gå til innstillinger for å konfigurere ringetider
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dev Tools - only in check-in mode */}
          {mode === 'checkin' && isDevMode && (
            <div className="p-4 rounded-lg border-2 bg-orange-50 border-orange-300">
              <h3 className="font-semibold text-sm text-orange-800 mb-3">🔧 Dev Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Simuler ukedag</label>
                  <Select value={devWeekday || 'none'} onValueChange={handleDevWeekdayChange}>
                    <SelectTrigger className="bg-white">
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
                  <label className="text-xs text-gray-600 block mb-1">Simuler klokkeslett</label>
                  <input
                    type="time"
                    value={devTime}
                    onChange={(e) => handleDevTimeChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-white"
                    placeholder="Faktisk tid"
                  />
                  {devTime && (
                    <button
                      onClick={() => handleDevTimeChange('')}
                      className="text-xs text-orange-600 hover:text-orange-700 mt-1"
                    >
                      Nullstill til faktisk tid
                    </button>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleResetCheckIns}
                    variant="outline"
                    className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    🔄 Nullstill innsjekking
                  </Button>
                </div>
              </div>

              {/* NFC Toggle */}
              <div className="mt-3 pt-3 border-t border-orange-200">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="nfc-toggle"
                    checked={nfcDisabled}
                    onCheckedChange={handleNfcToggle}
                  />
                  <Label htmlFor="nfc-toggle" className="text-xs text-gray-700">
                    Deaktiver NFC-polling (reduserer konsoll-spam)
                  </Label>
                </div>
              </div>

              {(devWeekday || devTime) && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Du simulerer: {devWeekday && `${devWeekday.charAt(0).toUpperCase() + devWeekday.slice(1)}`} {devTime && `kl. ${devTime}`}
                </p>
              )}

              {/* Debug info */}
              {activeCheckIn && settings?.checkInSettings && (
                <div className="mt-3 pt-3 border-t border-orange-200 text-xs space-y-1">
                  <p className="font-semibold text-orange-800">Debug Info:</p>
                  <p>Type: {activeCheckIn.bellTime.type} | Minutter: {activeCheckIn.minutesElapsed} | Poeng: {activeCheckIn.pointsPercent}%</p>
                  {activeCheckIn.bellTime.type === 'morgen' ? (
                    <p>Innstillinger: 100%≤{settings.checkInSettings.morning.percent100Minutes}min, 50%≤{settings.checkInSettings.morning.percent50Minutes}min, 10%≤{settings.checkInSettings.morning.percent10Minutes}min, Stopp{'>'}{settings.checkInSettings.morning.absenceMinutes}min</p>
                  ) : (
                    <p>Innstillinger: 100%≤{settings.checkInSettings.regular.percent100Minutes}min, Stopp{'>'}{settings.checkInSettings.regular.stopMinutes}min</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mode Description */}
          <div>
            <CardTitle>{mode === 'ipad' ? 'iPad-sjekk & Fravær' : 'Innsjekking'}</CardTitle>
            <CardDescription>
              {mode === 'ipad' 
                ? 'Registrer status for iPad og fravær. Klikk på ikonet øverst til høyre på en elev for å melde fravær.'
                : 'Elever sjekker inn med NFC-kort. Grønne knapper = sjekket inn. Grå = venter på innsjekking.'
              }
            </CardDescription>
            {seatingChart && (
              <div className="flex items-center space-x-2 mt-4">
                <Switch id="flip-view-daily" checked={isFlipped} onCheckedChange={setIsFlipped} />
                <Label htmlFor="flip-view-daily">Speilvendt visning (lærerperspektiv)</Label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {seatingChart && activeLayout ? (
            <div className="space-y-2">
                {Array.from({ length: activeLayout.rows }).map((_, r) => {
                    const rowIndex = isFlipped ? activeLayout.rows - 1 - r : r;
                    return (
                         <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${activeLayout.cols}, minmax(0, 1fr))` }}>
                            {Array.from({ length: activeLayout.cols }).map((_, c) => {
                                const colIndex = isFlipped ? activeLayout.cols - 1 - c : c;

                                if (!activeLayout.layout[rowIndex]?.[colIndex]) {
                                    return <EmptyDesk key={`empty-${rowIndex}-${colIndex}`} />;
                                }

                                const studentName = seatingChart[rowIndex]?.[colIndex]?.[0];
                                const student = studentName ? students.find(s => s.name === studentName) : null;

                                return student && student.id ? <StudentButton key={student.id} student={student} /> : <EmptyDesk key={`desk-${rowIndex}-${colIndex}`} />;
                            })}
                        </div>
                    );
                })}
            </div>
        ) : !seatingChart ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {students.filter(s => s.id).map((student) => <StudentButton key={student.id} student={student} />)}
          </div>
        ) : (
             <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p>Klassekartet er tomt. Gå til "Klasseverktøy &gt; Klassekart" for å generere et.</p>
            </div>
        )}
      </CardContent>
      
      {/* Bulk reward and NFC section - only in iPad mode */}
      {mode === 'ipad' && (
      <div className="px-6 pb-6">
        <div className="border-t pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Registrering & Belønning</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gi poeng automatisk via NFC eller manuelt til alle med OK status
                </p>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">NFC-registrering:</h4>
                    <ol className="list-decimal list-inside text-sm space-y-1">
                      <li>Trykk "Start NFC-registrering"</li>
                      <li>Elevene tapper kort når de kommer</li>
                      <li>De får automatisk poeng for ladet iPad</li>
                      <li>Trykk "Avslutt registrering" når alle er kommet</li>
                      <li>Gjenstående elever settes som "Ikke ladet"</li>
                      <li>Juster manuelt for fraværende eller glemt iPad</li>
                    </ol>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2 flex-wrap">
              <NFCCheckIn showOnlyButton />
              <Button
                onClick={handleBulkReward}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <span className="text-lg">⚡</span>
                Registrer og gi poeng til resten
              </Button>
              {isDevMode && (
                <Button
                  onClick={handleResetToday}
                  variant="outline"
                  className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                >
                  <span className="text-lg">🔄</span>
                  Reset (Dev)
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </Card>

    {/* NFC Status Panel - shows when registration is active or completed - only in iPad mode */}
    {mode === 'ipad' && (
    <div className="mt-6">
      <NFCCheckIn showOnlyPanel />
    </div>
    )}

    {/* Check-in NFC Panel - only in check-in mode */}
    {mode === 'checkin' && (
    <div className="mt-6">
      <CheckInNFC 
        activeSession={activeCheckIn} 
        checkInCount={todaysCheckInLogs.length}
        totalStudents={students.filter(s => s.id && !getAbsenceForDate(s.id)).length}
        students={students}
        checkedInStudentIds={checkedInStudentIds}
        onStartManual={startManualCheckIn}
        onStopManual={stopManualCheckIn}
      />
    </div>
    )}
  </>
  );
}
