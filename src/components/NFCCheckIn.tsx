"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Scan,
  StopCircle,
  CheckCircle2,
  Clock,
  Users,
  UserX,
  AlertCircle,
  Info
} from "lucide-react";
import {
  startRegistrationSession,
  endRegistrationSession,
  getActiveSession,
  getRegistrationStats,
  getRegisteredStudentsToday,
  handleCardTap,
  type CheckInResult
} from "@/lib/nfcCheckInService";
import { useNFCWebSocket } from "@/hooks/useNFCWebSocket";
import { format } from "date-fns";

interface NFCCheckInProps {
  showOnlyButton?: boolean;  // Only show the start button
  showOnlyPanel?: boolean;   // Only show the active/completed panel
}

export default function NFCCheckIn({ showOnlyButton, showOnlyPanel }: NFCCheckInProps = {}) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCheckInResult, setLastCheckInResult] = useState<CheckInResult | null>(null);

  // Ref to track if we're actively waiting for registration cards
  const isWaitingForCardRef = React.useRef(false);

  // Live query for active session
  const activeSession = useLiveQuery(async () => {
    const session = await getActiveSession();
    return session;
  }, []);

  // Live query for stats
  const stats = useLiveQuery(async () => {
    return await getRegistrationStats();
  }, []);

  // Live query for registered students
  const registeredStudents = useLiveQuery(async () => {
    return await getRegisteredStudentsToday();
  }, []);

  // Set up WebSocket NFC for real-time card detection
  const nfcWebSocket = useNFCWebSocket({
    enabled: true,
    autoConnect: true,
    onCardDetected: async (card) => {
      if (!activeSession || isProcessing || !isWaitingForCardRef.current) return;

      console.log('✅ iPad registration card detected:', card.uid);
      setIsProcessing(true);
      isWaitingForCardRef.current = false; // Temporarily disable while processing
      setLastCheckInResult(null);

      const result = await handleCardTap(card.uid);
      setLastCheckInResult(result);

      if (result.success) {
        toast({
          title: "✅ Registrert!",
          description: `${result.studentName} har sjekket inn (+${result.points} poeng)`,
        });
      } else {
        toast({
          title: "Feil",
          description: result.message,
          variant: "destructive",
        });
      }

      setIsProcessing(false);
      isWaitingForCardRef.current = true; // Re-enable card detection
    },
    onError: (error, message) => {
      if (isWaitingForCardRef.current) {
        console.error('❌ WebSocket error during iPad registration:', error, message);
        // Don't show error toast for minor connection issues
      }
    }
  });

  // Start/stop monitoring based on active session
  React.useEffect(() => {
    if (activeSession) {
      // Start monitoring for registration session
      console.log('🎯 Starting NFC monitoring for iPad registration');
      isWaitingForCardRef.current = true;
      nfcWebSocket.startMonitoring();
    } else {
      // Stop monitoring when no active session
      console.log('⏸️ Stopping NFC monitoring');
      isWaitingForCardRef.current = false;
      nfcWebSocket.stopMonitoring();
    }

    return () => {
      isWaitingForCardRef.current = false;
      nfcWebSocket.stopMonitoring();
    };
  }, [activeSession]);

  const handleStartRegistration = async () => {
    setIsProcessing(true);
    const result = await startRegistrationSession();

    if (result.success) {
      toast({
        title: "NFC-registrering startet",
        description: "Elever kan nå tappe kort for å sjekke inn.",
      });
    } else {
      toast({
        title: "Feil",
        description: result.message,
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  const handleEndRegistration = async () => {
    setIsProcessing(true);
    const result = await endRegistrationSession();

    if (result.success) {
      // Show appropriate message based on results
      const registered = result.registered || 0;
      const notCharged = result.notCharged || 0;

      let description = '';
      if (registered > 0 && notCharged > 0) {
        description = `${registered} elever fikk poeng. ${notCharged} markert som "Ikke ladet".`;
      } else if (registered > 0) {
        description = `${registered} elever fikk poeng.`;
      } else if (notCharged > 0) {
        description = `${notCharged} elever markert som "Ikke ladet".`;
      } else {
        description = 'Ingen elever ble registrert.';
      }

      toast({
        title: "Registrering avsluttet",
        description,
      });
    } else {
      toast({
        title: "Feil",
        description: result.message,
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  // Show "not active" state
  if (!activeSession) {
    // If showing only panel, return null when not active
    if (showOnlyPanel) return null;

    // Otherwise show the button
    return (
      <Button
        onClick={handleStartRegistration}
        disabled={isProcessing}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
      >
        <Scan className="w-4 h-4" />
        Start NFC-registrering
      </Button>
    );
  }

  // Show "active" state
  if (activeSession && !activeSession.isCompleted) {
    // If showing only button, return null when active
    if (showOnlyButton) return null;

    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="bg-green-50 dark:bg-green-950">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Scan className="w-5 h-5 animate-pulse" />
            NFC-registrering aktiv
          </CardTitle>
          <CardDescription>
            Elever kan nå tappe kort for å sjekke inn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="default" className="text-base px-4 py-2">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {stats?.registered || 0} av {stats?.totalStudents || 0} registrert
            </Badge>
            {stats && stats.notRegistered > 0 && (
              <Badge variant="outline" className="text-base px-4 py-2">
                <Clock className="w-4 h-4 mr-2" />
                {stats.notRegistered} venter
              </Badge>
            )}
            {stats && stats.absent > 0 && (
              <Badge variant="secondary" className="text-base px-4 py-2">
                <UserX className="w-4 h-4 mr-2" />
                {stats.absent} fraværende
              </Badge>
            )}
          </div>

          {/* Last check-in feedback */}
          {lastCheckInResult && lastCheckInResult.success && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                <strong>{lastCheckInResult.studentName}</strong> registrert!
                {lastCheckInResult.points && ` (+${lastCheckInResult.points} poeng)`}
              </AlertDescription>
            </Alert>
          )}

          {/* Registered students list */}
          {registeredStudents && registeredStudents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Registrerte elever ({registeredStudents.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                {registeredStudents.map((student) => (
                  <div
                    key={student.studentId}
                    className="flex items-center justify-between p-2 rounded-md bg-secondary/50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{student.studentName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(student.registeredAt), 'HH:mm:ss')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* End button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleEndRegistration}
              disabled={isProcessing}
              variant="destructive"
              className="flex-1"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Avslutt registrering
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Når du avslutter vil alle gjenstående elever (som ikke er fraværende)
            bli markert som "Ikke ladet".
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show "completed" state
  // If showing only button, return null when completed
  if (showOnlyButton) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          Registrering fullført
        </CardTitle>
        <CardDescription>
          NFC-registrering for i dag er avsluttet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Oppsummering:</strong>
            <ul className="mt-2 space-y-1">
              <li>✅ Registrert: {stats?.registered || 0} elever</li>
              {stats && stats.notRegistered > 0 && (
                <li>⚠️ Ikke registrert: {stats.notRegistered} elever</li>
              )}
              {stats && stats.absent > 0 && (
                <li>👤 Fraværende: {stats.absent} elever</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>

        <p className="text-sm text-muted-foreground">
          Du kan nå justere statusene manuelt i klassekartet ovenfor om nødvendig.
        </p>
      </CardContent>
    </Card>
  );
}
