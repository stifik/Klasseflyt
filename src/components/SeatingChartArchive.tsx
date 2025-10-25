"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Eye, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SeatingChartRecord, SeatingLayout } from "@/lib/types";

interface SeatingChartArchiveProps {
  onLoadChart: (chart: any) => void;
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('nb-NO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const ChartPreview = ({ 
  chart, 
  rows, 
  cols 
}: { 
  chart: any[][], 
  rows: number, 
  cols: number 
}) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <div 
        className="grid gap-0.5 border rounded-lg p-2"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          aspectRatio: `${cols}/${rows}`
        }}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const student = chart[r]?.[c]?.[0];
            return (
              <div
                key={`${r}-${c}`}
                className={cn(
                  "flex items-center justify-center text-[8px] rounded border",
                  student 
                    ? "bg-secondary text-secondary-foreground" 
                    : "bg-muted border-dashed"
                )}
                style={{ minHeight: '16px' }}
              >
                {student && (
                  <span className="truncate px-0.5">
                    {student.split(' ')[0]}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default function SeatingChartArchive({ onLoadChart }: SeatingChartArchiveProps) {
  const { toast } = useToast();
  const [selectedChart, setSelectedChart] = useState<SeatingChartRecord | null>(null);

  const seatingChartHistory = useLiveQuery(async () => {
    return await db.seatingChartHistory
      .orderBy('createdAt')
      .reverse()
      .toArray();
  }, []);

  const layouts = useLiveQuery(() => db.seatingLayouts.toArray(), []);

  const handleLoadChart = (record: SeatingChartRecord) => {
    try {
      const chart = JSON.parse(record.chartJson);
      onLoadChart(chart);
      toast({
        title: "Klassekart lastet",
        description: `Lastet klassekart fra ${formatDate(record.createdAt)}`
      });
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke laste klassekart",
        variant: "destructive"
      });
    }
  };

  const handleDeleteChart = async (recordId: number) => {
    try {
      await db.seatingChartHistory.delete(recordId);
      toast({
        title: "Slettet",
        description: "Klassekart er slettet fra arkivet"
      });
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke slette klassekart",
        variant: "destructive"
      });
    }
  };

  if (!seatingChartHistory || seatingChartHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Klassekart-arkiv
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Ingen klassekart i arkivet ennå.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Klassekart-arkiv ({seatingChartHistory.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {seatingChartHistory.map((record) => {
              const chart = JSON.parse(record.chartJson);
              const studentCount = chart.flat().filter((cell: any) => cell && cell[0]).length;
              
              return (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {formatDate(record.createdAt)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {record.rows}×{record.cols}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {studentCount} elever
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            Klassekart fra {formatDate(record.createdAt)}
                          </DialogTitle>
                        </DialogHeader>
                        <ChartPreview
                          chart={chart}
                          rows={record.rows ?? chart.length}
                          cols={record.cols ?? (chart[0]?.length ?? 0)}
                        />
                        <div className="flex justify-center gap-2 pt-4">
                          <Button 
                            onClick={() => handleLoadChart(record)}
                            className="flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Last dette kartet
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleLoadChart(record)}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteChart(record.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}