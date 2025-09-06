
"use client";

import { useState } from "react";
import type { Student, StationAssignmentLog, Workstation } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Shuffle, Users, CheckSquare, GripVertical } from "lucide-react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay, closestCorners } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

interface GroupToolProps {
  students: Student[];
  appSettings: { workstations?: Workstation[] };
  stationAssignmentLogs?: StationAssignmentLog[];
}

type GroupingStrategy = "numberOfGroups" | "studentsPerGroup";

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const DraggableGroup = ({ group, id }: { group: Student[]; id: string }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `group-${id}`,
    data: { group },
  });
  
  return (
    <Card ref={setNodeRef} {...listeners} {...attributes} className={cn("touch-none cursor-grab", isDragging && "opacity-50")}>
      <CardHeader className="flex flex-row items-center justify-between p-2">
        <CardTitle className="text-sm font-medium">Gruppe {id}</CardTitle>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-2 pt-0 text-xs">
          {group.map(s => s.name).join(', ')}
      </CardContent>
    </Card>
  );
};

const DroppableStation = ({ station, children }: { station: Workstation, children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: `station-${station.id}` });
    return (
        <Card ref={setNodeRef} className={cn("h-full", isOver && "bg-primary/10")}>
            <CardHeader>
                <CardTitle>{station.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {children}
            </CardContent>
        </Card>
    );
};


export default function GroupTool({ students, appSettings, stationAssignmentLogs }: GroupToolProps) {
  const [strategy, setStrategy] = useState<GroupingStrategy>("numberOfGroups");
  const [groupValue, setGroupValue] = useState<number>(4);
  
  const [unassignedGroups, setUnassignedGroups] = useState<Student[][]>([]);
  const [stationAssignments, setStationAssignments] = useState<Record<string, Student[][]>>({});
  const [activeDragGroup, setActiveDragGroup] = useState<Student[] | null>(null);

  const { toast } = useToast();
  const workstations = appSettings.workstations || [];

  const handleGenerateGroups = () => {
    if (groupValue <= 0 || students.length === 0) {
      setUnassignedGroups([]);
      return;
    }

    const shuffledStudents = shuffleArray(students);
    const groups: Student[][] = [];

    if (strategy === "numberOfGroups") {
      const numGroups = Math.min(groupValue, shuffledStudents.length);
      for (let i = 0; i < numGroups; i++) {
        groups.push([]);
      }
      shuffledStudents.forEach((student, index) => {
        groups[index % numGroups].push(student);
      });
    } else { // studentsPerGroup
      let remainingStudents = [...shuffledStudents];
      const numStudentsPerGroup = groupValue;
      while(remainingStudents.length > 0) {
        groups.push(remainingStudents.splice(0, numStudentsPerGroup));
      }
    }
    setUnassignedGroups(groups);
    const initialAssignments: Record<string, Student[][]> = {};
    workstations.forEach(ws => { initialAssignments[ws.id] = [] });
    setStationAssignments(initialAssignments);
  };

  const handleLogSession = async () => {
    const logs: Omit<StationAssignmentLog, 'id'>[] = [];
    const date = new Date();
    
    Object.entries(stationAssignments).forEach(([stationId, groups]) => {
        groups.forEach(group => {
            group.forEach(student => {
                logs.push({ studentId: student.id!, stationId, date });
            });
        });
    });

    if (logs.length === 0) {
        toast({ title: "Ingen grupper fordelt", description: "Dra grupper til stasjoner for å loggføre.", variant: "destructive" });
        return;
    }
    
    try {
        await db.stationAssignmentLogs.bulkAdd(logs as StationAssignmentLog[]);
        toast({ title: "Økt loggført!", description: "Gruppefordelingen er lagret i historikken."});
        setUnassignedGroups([]);
        setStationAssignments({});
    } catch (error) {
        console.error(error);
        toast({ title: "Feil", description: "Kunne ikke loggføre økten.", variant: "destructive" });
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragGroup(null);
    if (!over) return;
    
    const activeId = active.id.toString();
    const overId = over.id.toString();
    const group = active.data.current?.group;

    if (!group) return;

    const newUnassigned = [...unassignedGroups];
    const newAssignments = { ...stationAssignments };

    // Find and remove the group from its source
    let sourceFound = false;
    for (const stationId in newAssignments) {
        const index = newAssignments[stationId].findIndex(g => JSON.stringify(g) === JSON.stringify(group));
        if (index > -1) {
            newAssignments[stationId].splice(index, 1);
            sourceFound = true;
            break;
        }
    }
    if (!sourceFound) {
        const index = newUnassigned.findIndex(g => JSON.stringify(g) === JSON.stringify(group));
        if (index > -1) {
            newUnassigned.splice(index, 1);
        }
    }

    // Add the group to its destination
    if (overId.startsWith('station-')) {
        const stationId = overId.substring('station-'.length);
        if (!newAssignments[stationId]) {
            newAssignments[stationId] = [];
        }
        newAssignments[stationId].push(group);
    } else { // Dropped on unassigned area
        newUnassigned.push(group);
    }
    
    setUnassignedGroups(newUnassigned);
    setStationAssignments(newAssignments);
  };

  const handleDragStart = (event: any) => {
      setActiveDragGroup(event.active.data.current.group);
  };

  const showAssignmentView = unassignedGroups.length > 0 || Object.values(stationAssignments).some(v => v.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gruppegenerator</CardTitle>
          <CardDescription>
            Lag tilfeldige grupper og fordel dem på arbeidsstasjoner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={strategy} onValueChange={(value) => setStrategy(value as GroupingStrategy)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="numberOfGroups" id="r1" />
              <Label htmlFor="r1">Antall grupper</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="studentsPerGroup" id="r2" />
              <Label htmlFor="r2">Elever per gruppe</Label>
            </div>
          </RadioGroup>
          <div>
            <Label htmlFor="group-value">
              {strategy === "numberOfGroups" ? "Hvor mange grupper?" : "Hvor mange elever per gruppe?"}
            </Label>
            <Input
              id="group-value"
              type="number"
              min="1"
              value={groupValue}
              onChange={(e) => setGroupValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <Button onClick={handleGenerateGroups} className="w-full">
            <Shuffle className="mr-2" />
            Generer Grupper
          </Button>
        </CardContent>
      </Card>
      
      {showAssignmentView && (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} collisionDetection={closestCorners}>
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Fordel Grupper</CardTitle>
                        <CardDescription>Dra gruppene til de ulike arbeidsstasjonene.</CardDescription>
                    </div>
                    <Button onClick={handleLogSession}>
                        <CheckSquare className="mr-2"/> Loggfør økt
                    </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <DroppableStation station={{id: 'unassigned', name: 'Ufordelte Grupper'}}>
                        {unassignedGroups.map((group, index) => (
                           <DraggableGroup key={index} group={group} id={`${index + 1}`} />
                        ))}
                    </DroppableStation>
                    {workstations.map(station => (
                        <DroppableStation key={station.id} station={station}>
                            {(stationAssignments[station.id] || []).map((group, index) => (
                                <DraggableGroup key={index} group={group} id={`${index + 1}`} />
                            ))}
                        </DroppableStation>
                    ))}
                </CardContent>
            </Card>
            <DragOverlay>
                {activeDragGroup ? <DraggableGroup group={activeDragGroup} id="overlay" /> : null}
            </DragOverlay>
        </DndContext>
      )}

    </div>
  );
}
