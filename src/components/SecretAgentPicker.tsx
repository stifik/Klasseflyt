"use client";

import { useState, useMemo, useEffect } from "react";
import type { Student, Absence } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { givePoints, syncAgentStatusWithApi } from "@/lib/rewardService";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

interface SecretAgentPickerProps {
  students: Student[];
  absences?: Absence[];
}

export default function SecretAgentPicker({ students, absences = [] }: SecretAgentPickerProps) {
  const [missionInput, setMissionInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Hent dagens agent fra database
  const todayKey = new Date().toISOString().split('T')[0];
  const secretAgent = useLiveQuery(async () => {
    const agent = await db.secretAgent.get(todayKey);
    return agent || null;
  }, [todayKey]);

  // Hent positive actions fra database
  const allActions = useLiveQuery(() => db.actions.toArray(), []) ?? [];
  const agentAction = allActions.find(a => a.actionKey === 'SECRET_AGENT_PASSED');

  const todaysAbsentStudentIds = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return new Set(absences.filter(a => new Date(a.date).toISOString().split('T')[0] === today).map(a => a.studentId));
  }, [absences]);

  const availableStudents = useMemo(() => {
    return students.filter(s => !todaysAbsentStudentIds.has(s.id!));
  }, [students, todaysAbsentStudentIds]);

  const handleDrawAgent = async () => {
    if (availableStudents.length === 0) {
      toast({
        title: "Ingen elever tilgjengelig",
        description: "Alle elever er fraværende i dag",
        variant: "destructive"
      });
      return;
    }

    // Velg tilfeldig elev
    const randomIndex = Math.floor(Math.random() * availableStudents.length);
    const selectedStudent = availableStudents[randomIndex];

    const agentData = {
      id: todayKey,
      studentId: selectedStudent.id!,
      studentName: selectedStudent.name,
      mission: missionInput || 'Fullføre spesialoppdrag',
      date: new Date(),
      status: 'pending' as const
    };

    // Lagre i database
    await db.secretAgent.put(agentData);

    // Send 'pending' status til API
    syncAgentStatusWithApi('pending', undefined, agentData.mission);

    toast({
      title: "🕵️ Agent trukket!",
      description: `${selectedStudent.name} er valgt som dagens hemmelige agent`,
    });

    setMissionInput(''); // Nullstill input
  };

  const handleApproveAgent = async () => {
    if (!secretAgent) return;

    setIsProcessing(true);

    try {
      // Først, send 'analyzing' status
      await syncAgentStatusWithApi('analyzing', undefined, secretAgent.mission);
      
      // Vent 2 sekunder for dramatisk effekt
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Gi poeng til agenten
      const points = agentAction?.points || 50;
      const result = await givePoints(
        secretAgent.studentId, 
        points, 
        `🕵️ Hemmelig Agent: ${secretAgent.mission}`
      );

      if (result.success) {
        // Oppdater status i database
        await db.secretAgent.update(todayKey, { status: 'passed' });

        // Send 'passed' status til API med agent-navn
        await syncAgentStatusWithApi('passed', secretAgent.studentName, secretAgent.mission);

        toast({
          title: "✅ MISSION ACCOMPLISHED!",
          description: `${secretAgent.studentName} har fullført oppdraget og fått ${points} poeng!`,
        });

        // Nullstill etter 3 sekunder
        setTimeout(async () => {
          await db.secretAgent.delete(todayKey);
          setMissionInput('');
        }, 3000);
      } else {
        toast({
          title: "Feil",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error approving agent:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke godkjenne oppdrag",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAgent = async () => {
    if (!secretAgent) return;

    setIsProcessing(true);

    try {
      // Oppdater status i database
      await db.secretAgent.update(todayKey, { status: 'failed' });

      // Send 'failed' status til API
      await syncAgentStatusWithApi('failed', undefined, secretAgent.mission);

      toast({
        title: "❌ MISSION FAILED",
        description: `${secretAgent.studentName} fullførte ikke oppdraget`,
        variant: "destructive"
      });

      // Nullstill etter 2 sekunder
      setTimeout(async () => {
        await db.secretAgent.delete(todayKey);
        setMissionInput('');
      }, 2000);
    } catch (error) {
      console.error('Error rejecting agent:', error);
      toast({
        title: "Feil",
        description: "Kunne ikke avvise oppdrag",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAgent = async () => {
    await db.secretAgent.delete(todayKey);
    setMissionInput('');
    // Send 'pending' status til API for å resette display
    syncAgentStatusWithApi('pending');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🕵️ Hemmelig Agent
        </CardTitle>
        <CardDescription>
          Trekk en hemmelig agent som får et spesialoppdrag. Godkjenn eller avvis oppdraget på slutten av dagen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!secretAgent ? (
          // Trekk ny agent
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mission">Dagens oppdrag</Label>
              <Textarea
                id="mission"
                placeholder="Beskriv oppdraget (f.eks. 'Hjelpe 3 medelever uten å avsløre seg selv')"
                value={missionInput}
                onChange={(e) => setMissionInput(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleDrawAgent} 
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
              disabled={availableStudents.length === 0}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Trekk Dagens Hemmelige Agent
            </Button>

            {availableStudents.length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                Ingen elever tilgjengelig for trekk
              </p>
            )}
          </div>
        ) : (
          // Vis trukket agent og handlingsknapper
          <div className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                    DAGENS HEMMELIGE AGENT
                  </p>
                  <h3 className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {secretAgent.studentName}
                  </h3>
                </div>
                <Badge 
                  variant={
                    secretAgent.status === 'passed' ? 'default' : 
                    secretAgent.status === 'failed' ? 'destructive' : 
                    'secondary'
                  }
                  className="text-xs"
                >
                  {secretAgent.status === 'pending' && '⏳ Venter'}
                  {secretAgent.status === 'passed' && '✅ Godkjent'}
                  {secretAgent.status === 'failed' && '❌ Avvist'}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  OPPDRAG:
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  {secretAgent.mission}
                </p>
              </div>

              {agentAction && (
                <div className="bg-white dark:bg-gray-800 rounded-md p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Belønning ved godkjent oppdrag: <strong>{agentAction.points} poeng</strong>
                  </p>
                </div>
              )}
            </div>

            {secretAgent.status === 'pending' && (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleRejectAgent}
                  variant="destructive"
                  size="lg"
                  disabled={isProcessing}
                  className="h-16"
                >
                  <X className="w-5 h-5 mr-2" />
                  Avvis Oppdrag
                </Button>
                <Button
                  onClick={handleApproveAgent}
                  variant="default"
                  size="lg"
                  disabled={isProcessing}
                  className="h-16 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Godkjenn Oppdrag
                </Button>
              </div>
            )}

            {(secretAgent.status === 'passed' || secretAgent.status === 'failed') && (
              <Button
                onClick={handleResetAgent}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Trekk Ny Agent
              </Button>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Hvordan fungerer det?</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Trekk en hemmelig agent på morgenen</li>
            <li>• Gi agenten et spesialoppdrag (skal være hemmelig for klassen)</li>
            <li>• På slutten av dagen: Godkjenn eller avvis oppdraget</li>
            <li>• Vis resultatet på storskjermen for dramatisk avsløring!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
