"use client";

import { useState, useMemo, useEffect } from "react";
import type { Student, Absence } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Check, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { givePoints, syncAgentStatusWithApi } from "@/lib/rewardService";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { getWeekNumber } from "@/lib/utils";

interface SecretAgentPickerProps {
  students: Student[];
  absences?: Absence[];
}

export default function SecretAgentPicker({ students, absences = [] }: SecretAgentPickerProps) {
  const [missionInput, setMissionInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [withReplacement, setWithReplacement] = useState(true);
  const { toast } = useToast();

  // Hent dagens agent fra database
  const todayKey = new Date().toISOString().split('T')[0];
  const secretAgent = useLiveQuery(async () => {
    const agent = await db.secretAgent.get(todayKey);
    return agent || null;
  }, [todayKey]);

  // Hent agent historikk
  const agentHistory = useLiveQuery(async () => {
    const history = await db.secretAgentHistory.toArray();
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []) ?? [];

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

    let candidateStudents = availableStudents;

    // Hvis uten tilbakelegging, ekskluder tidligere agenter fra denne uken
    if (!withReplacement) {
      const weekNumber = getWeekNumber(new Date());
      const thisWeekAgents = agentHistory.filter(agent => {
        const agentWeek = getWeekNumber(new Date(agent.date));
        return agentWeek === weekNumber;
      });
      const usedStudentIds = new Set(thisWeekAgents.map(a => a.studentId));
      candidateStudents = availableStudents.filter(s => !usedStudentIds.has(s.id!));

      if (candidateStudents.length === 0) {
        toast({
          title: "Alle elever har allerede vært agenter denne uken",
          description: "Skru på 'med tilbakelegging' for å tillate gjentakelse",
          variant: "default"
        });
        return;
      }
    }

    // Velg tilfeldig elev
    const randomIndex = Math.floor(Math.random() * candidateStudents.length);
    const selectedStudent = candidateStudents[randomIndex];

    // Bruk current timestamp for å markere nylig trukket agent
    const now = new Date();
    
    const agentData = {
      id: todayKey,
      studentId: selectedStudent.id!,
      studentName: selectedStudent.name,
      mission: missionInput || 'Fullføre spesialoppdrag',
      date: now,
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
      // Først, oppdater status til 'analyzing' i database
      await db.secretAgent.update(todayKey, { status: 'analyzing' });
      
      // Send også til API (valgfritt, for ekstern skjerm)
      await syncAgentStatusWithApi('analyzing', undefined, secretAgent.mission);
      
      // Vent 2 sekunder for dramatisk effekt
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Hent konfigurerte poeng fra db med fallback
      let actionPoints = agentAction?.points || 50;
      let actionName = agentAction?.name || '🕵️ Hemmelig Agent - Oppdrag fullført';
      
      if (!agentAction) {
        // Fallback to default if not in db
        const { positiveActions } = await import('@/lib/positiveActions');
        const fallback = positiveActions.find(a => a.actionKey === 'SECRET_AGENT_PASSED');
        actionPoints = fallback?.points || 50;
        actionName = fallback?.name || '🕵️ Hemmelig Agent - Oppdrag fullført';
      }

      // Gi poeng til agenten
      const result = await givePoints(
        secretAgent.studentId, 
        actionPoints, 
        `🕵️ Hemmelig Agent: ${secretAgent.mission}`
      );

      if (result.success) {
        // Oppdater status til 'passed' i database
        await db.secretAgent.update(todayKey, { status: 'passed' });

        // Send 'passed' status til API UTEN agent-navn (personvern!)
        await syncAgentStatusWithApi('passed', undefined, secretAgent.mission);

        // Lagre i historikk
        await db.secretAgentHistory.add({
          studentId: secretAgent.studentId,
          studentName: secretAgent.studentName,
          mission: secretAgent.mission,
          date: new Date(),
          status: 'passed'
        });

        toast({
          title: "✅ MISSION ACCOMPLISHED!",
          description: `${secretAgent.studentName} har fullført oppdraget og fått ${actionPoints} poeng!`,
        });

        // IKKE slett agenten - la den bli værende til bruker trekker ny
        // Avsløringen forblir synlig på storskjermen
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
      // Først, oppdater status til 'analyzing' i database
      await db.secretAgent.update(todayKey, { status: 'analyzing' });
      
      // Send også til API (for ekstern skjerm)
      await syncAgentStatusWithApi('analyzing', undefined, secretAgent.mission);
      
      // Vent 2 sekunder for dramatisk effekt (samme som godkjenning)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Oppdater status til 'failed' i database
      await db.secretAgent.update(todayKey, { status: 'failed' });

      // Send 'failed' status til API
      await syncAgentStatusWithApi('failed', undefined, secretAgent.mission);

      // Lagre i historikk
      await db.secretAgentHistory.add({
        studentId: secretAgent.studentId,
        studentName: secretAgent.studentName,
        mission: secretAgent.mission,
        date: new Date(),
        status: 'failed'
      });

      toast({
        title: "❌ MISSION FAILED",
        description: `${secretAgent.studentName} fullførte ikke oppdraget`,
        variant: "destructive"
      });

      // IKKE slett agenten - la den bli værende til bruker trekker ny
      // Avsløringen forblir synlig på storskjermen
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

            {/* Toggle for med/uten tilbakelegging */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div>
                <Label className="font-medium">Med tilbakelegging</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {withReplacement 
                    ? "Samme elev kan bli agent flere ganger i samme uke" 
                    : "Samme elev kan bare være agent en gang per uke"}
                </p>
              </div>
              <Switch
                checked={withReplacement}
                onCheckedChange={setWithReplacement}
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

            {/* Historikk over tidligere agenter */}
            {agentHistory.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">📋 Tidligere agenter</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {agentHistory.slice(0, 10).map((agent, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-gray-700 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{agent.studentName}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{agent.mission}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {new Date(agent.date).toLocaleDateString('no-NO')}
                        </span>
                        <Badge variant={agent.status === 'passed' ? 'default' : 'destructive'}>
                          {agent.status === 'passed' ? '✅ Godkjent' : '❌ Avvist'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

            {secretAgent.status === 'analyzing' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                <div className="animate-pulse text-2xl mb-2">🔍</div>
                <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                  Analyserer oppdrag... Vent litt
                </p>
              </div>
            )}

            {(secretAgent.status === 'passed' || secretAgent.status === 'failed') && (
              <div className="space-y-4">
                <div className={`rounded-lg p-6 text-center ${
                  secretAgent.status === 'passed' 
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300' 
                    : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300'
                }`}>
                  <div className="text-6xl mb-4">
                    {secretAgent.status === 'passed' ? '✅' : '❌'}
                  </div>
                  <p className={`text-2xl font-bold ${
                    secretAgent.status === 'passed' 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {secretAgent.status === 'passed' ? 'Oppdrag godkjent!' : 'Oppdrag avvist'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Avsløringen er synlig på storskjermen
                  </p>
                </div>
                <Button
                  onClick={handleResetAgent}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Trekk Ny Agent
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Hvordan fungerer det?</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Trekk en hemmelig agent på morgenen (bare du vet hvem det er)</li>
            <li>• Gi agenten et spesialoppdrag - hold det hemmelig for klassen</li>
            <li>• Åpne avsløringssiden i egen fane og dra til storskjerm</li>
            <li>• <strong>Viktig:</strong> Agenten selv vet ikke at de er valgt!</li>
            <li>• Dette gjør at alle må gjøre oppdraget, siden alle tror de kan være agenten</li>
            <li>• På slutten av dagen: Godkjenn eller avvis oppdraget her</li>
            <li>• Avsløringen vises automatisk på storskjermen!</li>
          </ul>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/agent-reveal', '_blank')}
              className="w-full"
            >
              🎬 Åpne Avsløringsskjerm
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
