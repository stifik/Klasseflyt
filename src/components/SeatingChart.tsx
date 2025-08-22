
"use client";

import { useState } from "react";
import type { Student } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateSeatingChart } from "@/ai/flows/generate-seating-chart";
import { cn } from "@/lib/utils";

type SeatingChartData = (string[] | null)[][];
type AvoidPair = [string, string];

interface SeatingChartProps {
  students: Student[];
}

export default function SeatingChart({ students }: SeatingChartProps) {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(5);
  const [groupSize, setGroupSize] = useState(2);
  const [avoidPairs, setAvoidPairs] = useState<AvoidPair[]>([]);
  const [seatingChart, setSeatingChart] = useState<SeatingChartData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleAvoidPairChange = (student1Id: string, student2Id: string) => {
    const newPair: AvoidPair = [student1Id, student2Id].sort() as AvoidPair;
    const existingPairIndex = avoidPairs.findIndex(
      (p) => p[0] === newPair[0] && p[1] === newPair[1]
    );

    if (existingPairIndex > -1) {
      setAvoidPairs(avoidPairs.filter((_, index) => index !== existingPairIndex));
    } else {
      setAvoidPairs([...avoidPairs, newPair]);
    }
  };
  
  const handleGenerateClick = async () => {
    setIsGenerating(true);
    setSeatingChart(null);
    try {
      const studentNames = students.map(s => s.name);
      const avoidPairNames = avoidPairs.map(([s1, s2]) => [
          students.find(st => st.id === s1)?.name || '',
          students.find(st => st.id === s2)?.name || ''
      ]);

      const result = await generateSeatingChart({
        studentNames,
        rows,
        cols,
        groupSize,
        avoidPairs: avoidPairNames as [string, string][],
      });
      
      // Ensure the output is a 2D array
      const chart = result.seatingChart || [];
      const validatedChart: SeatingChartData = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => chart[r]?.[c] || null)
      );
      setSeatingChart(validatedChart);

    } catch (error) {
        console.error(error);
        toast({
            title: "Feil ved generering",
            description: "Kunne ikke generere klassekart. Prøv igjen.",
            variant: "destructive",
        });
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Innstillinger for klassekart</CardTitle>
            <CardDescription>Definer oppsett og begrensninger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rows">Rader</Label>
                <Input id="rows" type="number" value={rows} onChange={(e) => setRows(Math.max(1, Number(e.target.value)))} min="1" />
              </div>
              <div>
                <Label htmlFor="cols">Kolonner</Label>
                <Input id="cols" type="number" value={cols} onChange={(e) => setCols(Math.max(1, Number(e.target.value)))} min="1" />
              </div>
            </div>
            <div>
              <Label htmlFor="groupSize">Gruppestørrelse</Label>
              <Select value={String(groupSize)} onValueChange={(v) => setGroupSize(Number(v))}>
                <SelectTrigger id="groupSize">
                  <SelectValue placeholder="Velg gruppestørrelse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 og 1</SelectItem>
                  <SelectItem value="2">2 og 2</SelectItem>
                  <SelectItem value="3">3 og 3</SelectItem>
                  <SelectItem value="4">4 og 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <Button onClick={handleGenerateClick} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Users className="mr-2" />}
              Generer nytt klassekart
            </Button>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Unngå par</CardTitle>
                <CardDescription>Velg elever som ikke skal sitte sammen.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-48">
                    <div className="space-y-2">
                        {students.map((s1, i) => (
                            <div key={s1.id}>
                                {students.slice(i + 1).map((s2) => {
                                    const pair: AvoidPair = [s1.id, s2.id].sort() as AvoidPair;
                                    const isChecked = avoidPairs.some(p => p[0] === pair[0] && p[1] === pair[1]);
                                    return (
                                        <div key={`${s1.id}-${s2.id}`} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`avoid-${s1.id}-${s2.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => handleAvoidPairChange(s1.id, s2.id)}
                                            />
                                            <label htmlFor={`avoid-${s1.id}-${s2.id}`} className="text-sm">
                                                {s1.name} & {s2.name}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card className="min-h-[600px]">
          <CardHeader>
            <CardTitle>Generert Klassekart</CardTitle>
             <CardDescription>Resultatet av genereringen vil vises her.</CardDescription>
          </CardHeader>
          <CardContent>
             {isGenerating && (
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
            )}
            {seatingChart && (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {seatingChart.flat().map((desk, index) => (
                        <Card key={index} className="flex flex-col items-center justify-center p-2 text-center aspect-square bg-secondary">
                           {desk ? (
                               <div className={cn("flex w-full h-full items-center justify-around", groupSize > 1 ? "flex-row" : "flex-col")}>
                                {desk.map(studentName => (
                                    <p key={studentName} className="text-sm font-medium">{studentName}</p>
                                ))}
                               </div>
                           ) : (
                                <p className="text-sm text-muted-foreground">-</p>
                           )}
                        </Card>
                    ))}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
