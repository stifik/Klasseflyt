/**
 * Check-In Component
 * Handles NFC card taps and manual check-in during check-in sessions
 */

"use client";

import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNFCWebSocket } from "@/hooks/useNFCWebSocket";
import { handleCheckInTap } from "@/lib/checkInHandler";
import type { ActiveCheckInSession } from "@/hooks/useCheckInTimer";
import type { Student } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Scan, CheckCircle2, AlertCircle, Hand, StopCircle } from "lucide-react";
import { soundEffects } from "@/lib/soundEffects";
import { cn } from "@/lib/utils";

interface CheckInNFCProps {
  activeSession: ActiveCheckInSession | null;
  checkInCount: number;
  totalStudents: number;
  students: Student[];
  checkedInStudentIds: Set<number>;
  onStartManual: (type: 'morgen' | 'ordinær', points?: number) => void;
  onStopManual: () => void;
}

export default function CheckInNFC({
  activeSession,
  checkInCount,
  totalStudents,
  students,
  checkedInStudentIds,
  onStartManual,
  onStopManual
}: CheckInNFCProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<{ studentName: string; points: number; percent: number } | null>(null);

  // Ref to track if we're actively waiting for check-in cards
  const isWaitingForCardRef = React.useRef(false);

  // Ref to always have the latest activeSession value
  const activeSessionRef = React.useRef(activeSession);

  // Update ref whenever activeSession changes
  React.useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Check if NFC is disabled in dev mode
  const nfcDisabled = typeof window !== 'undefined' && window.localStorage?.getItem('dev_nfc_disabled') === 'true';

  // Set up WebSocket NFC for real-time card detection
  const nfcWebSocket = useNFCWebSocket({
    enabled: !nfcDisabled,
    autoConnect: true,
    onCardDetected: async (card) => {
      // Use ref to get the latest activeSession value
      const currentSession = activeSessionRef.current;

      if (!currentSession || isProcessing || !isWaitingForCardRef.current) return;

      console.log('✅ Check-in card detected:', card.uid);
      console.log('[CheckInNFC] Active session:', {
        bellTimeId: currentSession.bellTime.id,
        type: currentSession.bellTime.type,
        time: currentSession.bellTime.time
      });
      setIsProcessing(true);
      isWaitingForCardRef.current = false; // Temporarily disable while processing

      const result = await handleCheckInTap(card.uid, currentSession);

      if (result.success) {
        setLastCheckIn({
          studentName: result.studentName!,
          points: result.pointsAwarded!,
          percent: result.pointsPercent!,
        });

        // Play sound
        soundEffects.play(result.soundType);

        toast({
          title: "✅ Sjekket inn!",
          description: result.message,
        });

        // Clear last check-in after 3 seconds
        setTimeout(() => setLastCheckIn(null), 3000);
      } else {
        // Play sound
        soundEffects.play(result.soundType);

        toast({
          title: "❌ Feil",
          description: result.message,
          variant: "destructive",
        });
      }

      setIsProcessing(false);
      isWaitingForCardRef.current = true; // Re-enable card detection
    },
    onError: (error, message) => {
      if (isWaitingForCardRef.current) {
        console.error('❌ WebSocket error during check-in:', error, message);
        // Don't show error toast for minor connection issues during check-in
      }
    }
  });

  // Start/stop monitoring based on active session
  React.useEffect(() => {
    if (activeSession && !activeSession.isManual && !activeSession.shouldStop && !nfcDisabled) {
      // Start monitoring for check-in session
      console.log('🎯 Starting NFC monitoring for check-in session', { bellTimeId: activeSession.bellTime.id });
      isWaitingForCardRef.current = true;
      nfcWebSocket.startMonitoring();
    } else {
      // Stop monitoring when session ends or is manual
      console.log('⏸️ Stopping NFC monitoring', { activeSessionId: activeSession?.bellTime?.id ?? null });
      isWaitingForCardRef.current = false;
      nfcWebSocket.stopMonitoring();
    }

    return () => {
      isWaitingForCardRef.current = false;
      nfcWebSocket.stopMonitoring();
    };
  }, [activeSession, nfcDisabled]);

  // Render different content based on session state
  const renderContent = () => {
    if (!activeSession) {
      return (
        <>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vent på neste ringetid eller start manuell innsjekking ved å klikke på knappene over.
            </AlertDescription>
          </Alert>
        </>
      );
    }

    if (activeSession.shouldStop) {
      return (
        <>
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              {checkInCount} av {totalStudents} elever sjekket inn
            </AlertDescription>
          </Alert>
        </>
      );
    }

    // Active session - show NFC mode and stats
    return (
      <>
        <Alert className={nfcDisabled ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}>
          <Scan className={cn("h-4 w-4", nfcDisabled ? "text-yellow-600" : "text-green-600")} />
          <AlertDescription className={nfcDisabled ? "text-yellow-800" : "text-green-800"}>
            {activeSession.isManual
              ? "Manuell innsjekking aktiv. Klikk på elevene i klassekartet over for å sjekke dem inn."
              : nfcDisabled
              ? "⚠️ NFC-polling er deaktivert i dev-modus. Klikk på elever i klassekartet for å sjekke dem inn."
              : "NFC-leser klar. Elever kan nå tappe kort for å sjekke inn."
            }
          </AlertDescription>
        </Alert>

        {lastCheckIn && (
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 font-medium">
              {lastCheckIn.studentName}: +{lastCheckIn.points} poeng ({lastCheckIn.percent}%)
            </AlertDescription>
          </Alert>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        )}

        {/* Manual stop button - only for manually triggered sessions */}
        {activeSession.isManual && (
          <Button
            onClick={() => {
              onStopManual();
              toast({
                title: "Innsjekking avsluttet",
                description: "Manuell innsjekking er stoppet",
              });
            }}
            variant="outline"
            className="w-full border-red-500 text-red-600 hover:bg-red-50"
          >
            <StopCircle className="w-4 h-4 mr-2" />
            Avslutt manuell innsjekking
          </Button>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Sjekket inn</p>
            <p className="text-2xl font-bold text-gray-900">{checkInCount} / {totalStudents}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tid siden ringetid</p>
            <p className="text-2xl font-bold text-gray-900">{activeSession.minutesElapsed} min</p>
          </div>
        </div>
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {!activeSession ? (
            <AlertCircle className="w-5 h-5 text-gray-400" />
          ) : activeSession.shouldStop ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : activeSession.isManual ? (
            <Hand className="w-5 h-5 text-blue-600" />
          ) : (
            <Scan className="w-5 h-5 animate-pulse text-green-600" />
          )}
          {!activeSession ? 'Innsjekking' : activeSession.shouldStop ? 'Innsjekking avsluttet' : 'Innsjekking aktiv'}
        </CardTitle>
        <CardDescription>
          {activeSession && !activeSession.shouldStop ? (
            `${activeSession.bellTime.type === 'morgen' ? 'Morgeninnsjekking' : 'Innsjekking'} • ${activeSession.pointsPercent}% poeng${activeSession.isManual ? ' • Manuell modus' : ' • NFC-modus'}`
          ) : activeSession?.shouldStop ? (
            'Tiden er ute for denne innsjekk-økten'
          ) : (
            'Ingen aktiv innsjekking-økt'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
