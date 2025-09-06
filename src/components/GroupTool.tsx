
"use client";

import { useState, useMemo } from "react";
import type { Student, StationAssignmentLog, Workstation, AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Shuffle, Users, CheckSquare, GripVertical, Bot, Info, Library } from "lucide-react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay, closestCorners, useSensor, PointerSensor, TouchSensor } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";


interface GroupToolProps {
  students: Student[];
  appSettings: AppSettings;
  stationAssignmentLogs?: StationAssignmentLog[];
}

type GroupingStrategy = "numberOfGroups" | "studentsPerGroup";

type GroupWithId = {
    id: string;
    students: Student[];
};

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const DraggableGroup = ({ group, groupNumber }: { group: GroupWithId; groupNumber: number }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: group.id,
    data: { group },
  });
  
  return (
    <Card ref={setNodeRef} {...listeners} {...attributes} className={cn("touch-none cursor-grab", isDragging && "opacity-50")}>
      <CardHeader className="flex flex-row items-center justify-between p-2">
        <CardTitle className="text-sm font-medium">Gruppe {groupNumber}</CardTitle>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-2 pt-0 text-xs">
          {group.students.map(s => s.name).join(', ')}
      </CardContent>
    </Card>
  );
};

const DroppableStation = ({ station, children, isOver, hint, assignments }: { station: Workstation, children: React.ReactNode, isOver: boolean, hint: { text: string, isBest: boolean } | null, assignments: GroupWithId[] }) => {
    const { setNodeRef } = useDroppable({ id: station.id });
    const isFull = station.capacity && assignments.length >= station.capacity;

    return (
        <Card ref={setNodeRef} className={cn("transition-colors", isOver && "bg-primary/10", hint?.isBest && "bg-green-100 dark:bg-green-900/20", isFull && "bg-muted/50")}>
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                    {station.name}
                     {station.capacity && (
                        <span className="text-xs font-normal text-muted-foreground">
                            {assignments.length} / {station.capacity}
                        </span>
                     )}
                </CardTitle>
                 <CardDescription className="flex items-center justify-between text-xs">
                     {hint && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className={cn("font-normal px-2 py-0.5 rounded-full", hint.isBest ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200" : "bg-secondary")}>
                                    {hint.text}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Antall elever i gruppen som har vært her før.</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                 </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {children}
            </CardContent>
        </Card>
    );
};


export default function GroupTool({ students, appSettings, stationAssignmentLogs = [] }: GroupToolProps) {
  const [strategy, setStrategy] = useState<GroupingStrategy>("numberOfGroups");
  const [groupValue, setGroupValue] = useState<number>(4);
  
  const [unassignedGroups, setUnassignedGroups] = useState<GroupWithId[]>([]);
  const [stationAssignments, setStationAssignments] = useState<Record<string, GroupWithId[]>>({});
  const [activeDragGroup, setActiveDragGroup] = useState<GroupWithId | null>(null);

  const { toast } = useToast();
  const workstations = appSettings.workstations || [];

  const studentHistory = useMemo(() => {
    const history: Record<string, Record<string, number>> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogs = (stationAssignmentLogs || []).filter(log => new Date(log.date) > thirtyDaysAgo);

    recentLogs.forEach(log => {
        if (!history[log.studentId]) history[log.studentId] = {};
        history[log.studentId][log.stationId] = (history[log.studentId][log.stationId] || 0) + 1;
    });
    return history;
  }, [stationAssignmentLogs]);

  const calculateCost = (group: GroupWithId, stationId: string): number => {
    if (!group) return 0;
    return group.students.reduce((totalCost, student) => {
        return totalCost + (studentHistory[student.id!]?.[stationId] || 0);
    }, 0);
  };
  
  const stationHints = useMemo(() => {
    if (!activeDragGroup) return {};

    const costs = workstations.map(station => ({
      stationId: station.id,
      cost: calculateCost(activeDragGroup, station.id),
    }));

    const minCost = Math.min(...costs.map(c => c.cost));
    
    const hints: Record<string, { text: string; isBest: boolean }> = {};
    costs.forEach(({ stationId, cost }) => {
      hints[stationId] = {
        text: `${cost}/${activeDragGroup.students.length} har vært her`,
        isBest: cost === minCost,
      };
    });
    return hints;

  }, [activeDragGroup, workstations, studentHistory]);


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
    
    const groupsWithIds: GroupWithId[] = groups.map(g => ({ id: uuidv4(), students: g }));
    setUnassignedGroups(groupsWithIds);

    const initialAssignments: Record<string, GroupWithId[]> = {};
    workstations.forEach(ws => { initialAssignments[ws.id] = [] });
    setStationAssignments(initialAssignments);
  };

  const handleAutoAssign = () => {
    if (unassignedGroups.length === 0 || workstations.length === 0) return;
    
    const newAssignments: Record<string, GroupWithId[]> = {};
    workstations.forEach(ws => { newAssignments[ws.id] = [] });
    let groupsToAssign = [...unassignedGroups];
    
    while (groupsToAssign.length > 0) {
        const group = groupsToAssign.shift()!;
        
        let bestStationId = workstations[0].id;
        let minCost = Infinity;
        let minCount = Infinity;

        // Find the station with the lowest cost, preferring stations with fewer groups
        workstations.forEach(station => {
            const cost = calculateCost(group, station.id);
            const count = newAssignments[station.id].length;
            const capacity = station.capacity;

            // Skip station if it's full
            if (capacity && count >= capacity) {
                return;
            }
            
            if (count < minCount || (count === minCount && cost < minCost)) {
                minCost = cost;
                minCount = count;
                bestStationId = station.id;
            }
        });
        
        newAssignments[bestStationId].push(group);
    }
    
    setStationAssignments(newAssignments);
    setUnassignedGroups([]);
    toast({ title: "Grupper fordelt!", description: "Gruppene er automatisk fordelt på stasjonene." });
  };


  const handleLogSession = async () => {
    const logs: Omit<StationAssignmentLog, 'id'>[] = [];
    const date = new Date();
    
    Object.entries(stationAssignments).forEach(([stationId, groups]) => {
        groups.forEach(group => {
            group.students.forEach(student => {
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
  
  const findGroupAndContainer = (groupId: string): [GroupWithId, string] | [null, null] => {
      const unassignedGroup = unassignedGroups.find(g => g.id === groupId);
      if (unassignedGroup) {
          return [unassignedGroup, 'unassigned'];
      }
      for (const stationId in stationAssignments) {
          const groupInStation = stationAssignments[stationId].find(g => g.id === groupId);
          if (groupInStation) {
              return [groupInStation, stationId];
          }
      }
      return [null, null];
  }

 const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragGroup(null);

    if (!over) {
        return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const [activeGroup, sourceContainerId] = findGroupAndContainer(activeId);
    if (!activeGroup || !sourceContainerId) return;

    // Find the container for what's being dragged over.
    // It can be a group or a container. We need the container ID.
    const [overGroup, overContainerId] = findGroupAndContainer(overId);
    const destinationContainerId = overContainerId || overId;

    if (sourceContainerId === destinationContainerId) {
        return; // Dropped in the same container
    }

    // Check capacity before moving
    const destStation = workstations.find(ws => ws.id === destinationContainerId);
    if (destStation?.capacity && (stationAssignments[destinationContainerId]?.length || 0) >= destStation.capacity) {
        toast({ title: "Stasjonen er full", description: `"${destStation.name}" har ikke plass til flere grupper.`, variant: "destructive" });
        return;
    }

    const newUnassigned = [...unassignedGroups];
    const newAssignments = JSON.parse(JSON.stringify(stationAssignments));

    // Remove from source
    if (sourceContainerId === 'unassigned') {
        const index = newUnassigned.findIndex(g => g.id === activeId);
        if (index > -1) newUnassigned.splice(index, 1);
    } else {
        const index = newAssignments[sourceContainerId].findIndex((g: GroupWithId) => g.id === activeId);
        if (index > -1) newAssignments[sourceContainerId].splice(index, 1);
    }

    // Add to destination
    if (destinationContainerId === 'unassigned') {
        newUnassigned.push(activeGroup);
    } else if (workstations.some(ws => ws.id === destinationContainerId)) {
        if (!newAssignments[destinationContainerId]) {
            newAssignments[destinationContainerId] = [];
        }
        newAssignments[destinationContainerId].push(activeGroup);
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
                        <CardDescription>Dra gruppene til stasjonene, eller bruk automatisk fordeling.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleAutoAssign} disabled={unassignedGroups.length === 0 || workstations.length === 0}>
                            <Bot className="mr-2" /> Fordel Stasjoner
                        </Button>
                        <Button onClick={handleLogSession}>
                            <CheckSquare className="mr-2"/> Loggfør økt
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            <DroppableStation station={{id: 'unassigned', name: 'Ufordelte Grupper'}} isOver={false} hint={null} assignments={unassignedGroups}>
                                {unassignedGroups.map((group, index) => (
                                   <DraggableGroup key={group.id} group={group} groupNumber={index + 1} />
                                ))}
                            </DroppableStation>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-2">
                            {workstations.map(station => (
                                <DroppableStation key={station.id} station={station} isOver={false} hint={stationHints[station.id] || null} assignments={stationAssignments[station.id] || []}>
                                    {(stationAssignments[station.id] || []).map((group, index) => (
                                        <DraggableGroup key={group.id} group={group} groupNumber={index + 1} />
                                    ))}
                                </DroppableStation>
                            ))}
                        </div>
                      </div>
                </CardContent>
            </Card>
            <DragOverlay>
                {activeDragGroup ? <DraggableGroup group={activeDragGroup} groupNumber={1} /> : null}
            </DragOverlay>
        </DndContext>
      )}

    </div>
  );
}
