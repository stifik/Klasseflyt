/**
 * Check-In NFC Component
 * Handles NFC card taps during check-in sessions
 */

"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNFCPolling } from "@/hooks/useNFCPolling";
import { handleCheckInTap } from "@/lib/checkInHandler";
import type { ActiveCheckInSession } from "@/hooks/useCheckInTimer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scan, CheckCircle2, AlertCircle } from "lucide-react";

interface CheckInNFCProps {
  activeSession: ActiveCheckInSession | null;
  checkInCount: number;
  totalStudents: number;
}

export default function CheckInNFC({ activeSession, checkInCount, totalStudents }: CheckInNFCProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<{ studentName: string; points: number; percent: number } | null>(null);

  // Play sound
  const playSound = (soundFile: string) => {
    try {
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (err) {
      console.log('Audio not supported:', err);
    }
  };

  // Set up NFC polling when session is active
  useNFCPolling({
    enabled: !!activeSession && !activeSession.shouldStop,
    onCardDetected: async (card) => {
      if (!activeSession || isProcessing) return;

      setIsProcessing(true);

      const result = await handleCheckInTap(card.uid, activeSession);

      if (result.success) {
        setLastCheckIn({
          studentName: result.studentName!,
          points: result.pointsAwarded!,
          percent: result.pointsPercent!,
        });

        // Play success sound
        if (result.soundFile) playSound(result.soundFile);

        toast({
          title: "✅ Sjekket inn!",
          description: result.message,
        });

        // Clear last check-in after 3 seconds
        setTimeout(() => setLastCheckIn(null), 3000);
      } else {
        // Play error sound
        if (result.soundFile) playSound(result.soundFile);

        toast({
          title: "❌ Feil",
          description: result.message,
          variant: "destructive",
        });
      }

      setIsProcessing(false);
    },
  });

  if (!activeSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NFC Innsjekking</CardTitle>
          <CardDescription>Ingen aktiv innsjekking-økt</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vent på neste ringetid eller gå til innstillinger for å konfigurere ringetider.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (activeSession.shouldStop) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Innsjekking avsluttet</CardTitle>
          <CardDescription>Tiden er ute for denne innsjekk-økten</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              {checkInCount} av {totalStudents} elever sjekket inn
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5 animate-pulse text-green-600" />
          Innsjekking aktiv
        </CardTitle>
        <CardDescription>
          {activeSession.bellTime.type === 'morgen' ? 'Morgeninnsjekking' : 'Innsjekking'} • {activeSession.pointsPercent}% poeng
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-green-50 border-green-200">
          <Scan className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            NFC-leser klar. Elever kan nå tappe kort for å sjekke inn.
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

        {isProcessing && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
