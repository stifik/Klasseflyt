

"use client";

import { useState, useMemo } from "react";
import type { Student, StationAssignmentLog, Workstation, AppSettings, GroupSet, GroupInSet, Absence } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Shuffle, Users, CheckSquare, GripVertical, Bot, Info, Library, Save, FolderOpen, Trash2, LayoutGrid, Columns } from "lucide-react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay, closestCorners } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface GroupToolProps {
  students: Student[];
  appSettings: AppSettings;
  stationAssignmentLogs?: StationAssignmentLog[];
  groupSets?: GroupSet[];
  absences?: Absence[];
}

type GroupingStrategy = "numberOfGroups" | "studentsPerGroup";
type ViewMode = 'groups' | 'stations';

type GroupWithId = {
    id: string;
    studentIds: string[];
    groupNumber: number; // Permanent group number
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

const DraggableGroup = ({ group, studentMap }: { group: GroupWithId; studentMap: Map<string, string> }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: group.id,
    data: { group },
  });

  return (
    <Card ref={setNodeRef} {...listeners} {...attributes} className={cn("touch-none cursor-grab", isDragging && "opacity-50")}>
      <CardHeader className="flex flex-row items-center justify-between p-2">
        <CardTitle className="text-sm font-medium">Gruppe {group.groupNumber}</CardTitle>
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-2 pt-0 text-xs">
          <ul className="space-y-1">
              {group.studentIds.map(id => (
                  <li key={id}>{studentMap.get(id) || 'Ukjent'}</li>
              ))}
          </ul>
      </CardContent>
    </Card>
  );
};

const DroppableStation = ({ station, children, isOver, hint, assignments, studentMap }: { station: Workstation, children: React.ReactNode, isOver: boolean, hint: { text: string, isBest: boolean } | null, assignments: GroupWithId[], studentMap: Map<string, string> }) => {
    const { setNodeRef } = useDroppable({ id: station.id });
    const studentCount = assignments.reduce((sum, group) => sum + group.studentIds.length, 0);
    const isFull = station.capacity && studentCount >= station.capacity;

    return (
        <Card ref={setNodeRef} className={cn("transition-colors h-full", isOver && "bg-primary/10", hint?.isBest && "bg-green-100 dark:bg-green-900/20", isFull && "bg-muted/50")}>
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                    {station.name}
                     {station.capacity && (
                        <span className="text-xs font-normal text-muted-foreground">
                            {studentCount} / {station.capacity}
                        </span>
                     )}
                </CardTitle>
                 <CardDescription className="flex items-center justify-between text-xs min-h-[16px]">
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


export default function GroupTool({ students, appSettings, stationAssignmentLogs = [], groupSets = [], absences = [] }: GroupToolProps) {
  const [strategy, setStrategy] = useState<GroupingStrategy>("numberOfGroups");
  const [groupValue, setGroupValue] = useState<number>(4);
  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  
  const [activeGroupSet, setActiveGroupSet] = useState<GroupSet | null>(null);
  const [unassignedGroups, setUnassignedGroups] = useState<GroupWithId[]>([]);
  const [stationAssignments, setStationAssignments] = useState<Record<string, GroupWithId[]>>({});
  const [activeDragGroup, setActiveDragGroup] = useState<GroupWithId | null>(null);

  const { toast } = useToast();
  const workstations = appSettings.workstations || [];
  const studentMap = useMemo(() => new Map(students.map(s => [s.id!, s.name])), [students]);
  const studentIdMap = useMemo(() => new Map(students.map(s => [s.name, s.id!])), [students]);

  const todaysAbsentStudentIds = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return new Set(absences.filter(a => new Date(a.date).toISOString().split('T')[0] === today).map(a => a.studentId));
  }, [absences]);
  
  const presentStudents = useMemo(() => {
    return students.filter(s => !todaysAbsentStudentIds.has(s.id!));
  }, [students, todaysAbsentStudentIds]);

  const individualStudentHistory = useMemo(() => {
    const history: Record<string, Record<string, number>> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogs = stationAssignmentLogs.filter(log => new Date(log.date) > thirtyDaysAgo);

    recentLogs.forEach(log => {
        if (!history[log.studentId]) history[log.studentId] = {};
        history[log.studentId][log.stationId] = (history[log.studentId][log.stationId] || 0) + 1;
    });
    return history;
  }, [stationAssignmentLogs]);

  const groupHistory = useMemo(() => {
    const history: Record<string, Record<string, number>> = {};
    if (!activeGroupSet) return history;
    
    const relevantLogs = stationAssignmentLogs.filter(log => log.groupSetId === activeGroupSet.id && log.groupId);
    
    relevantLogs.forEach(log => {
        if (!history[log.groupId!]) history[log.groupId!] = {};
        history[log.groupId!][log.stationId] = (history[log.groupId!][log.stationId] || 0) + 1;
    });
    return history;
  }, [stationAssignmentLogs, activeGroupSet]);


  const calculateCost = (group: GroupWithId, stationId: string): number => {
    if (!group) return 0;
    // If we are in a project (activeGroupSet), use group history
    if (activeGroupSet) {
        return groupHistory[group.id]?.[stationId] || 0;
    }
    // Otherwise, use individual history
    return group.studentIds.reduce((totalCost, studentId) => {
        return totalCost + (individualStudentHistory[studentId]?.[stationId] || 0);
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
      let text = '';
      if(activeGroupSet) {
         text = `Gruppen har vært her ${cost} gang(er)`;
      } else {
         text = `${cost}/${activeDragGroup.studentIds.length} har vært her`;
      }
      hints[stationId] = { text, isBest: cost === minCost };
    });
    return hints;

  }, [activeDragGroup, workstations, individualStudentHistory, groupHistory, activeGroupSet]);


  const handleGenerateGroups = () => {
    if (groupValue <= 0 || presentStudents.length === 0) {
      setUnassignedGroups([]);
      return;
    }

    const shuffledStudents = shuffleArray(presentStudents);
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
    
    const groupsWithIds: GroupWithId[] = groups.map((g, index) => ({ id: uuidv4(), studentIds: g.map(s => s.id!), groupNumber: index + 1 }));
    setUnassignedGroups(groupsWithIds);
    setActiveGroupSet(null); // Clear active project group
    setViewMode('groups'); // Always default to group view on new generation

    const initialAssignments: Record<string, GroupWithId[]> = {};
    workstations.forEach(ws => { initialAssignments[ws.id] = [] });
    setStationAssignments(initialAssignments);
  };
  
  const handleLoadGroupSet = (groupSet: GroupSet) => {
      setActiveGroupSet(groupSet);
      // Ensure loaded groups have a groupNumber for consistency
      const groupsWithNumbers: GroupWithId[] = groupSet.groups.map((g, index) => ({
          ...g,
          groupNumber: index + 1
      }));
      setUnassignedGroups(groupsWithNumbers);
      setViewMode('groups');
      
      const initialAssignments: Record<string, GroupWithId[]> = {};
      workstations.forEach(ws => { initialAssignments[ws.id] = [] });
      setStationAssignments(initialAssignments);
      toast({ title: `Lastet inn gruppesett: ${groupSet.name}`});
  };

  const handleAutoAssign = () => {
    if (unassignedGroups.length === 0 || workstations.length === 0) return;
    
    const newAssignments: Record<string, GroupWithId[]> = {};
    workstations.forEach(ws => { newAssignments[ws.id] = [] });
    let groupsToAssign = [...unassignedGroups];
    
    while (groupsToAssign.length > 0) {
        // Find the best group-station pair
        let bestPair: { group: GroupWithId, stationId: string, cost: number, groupIndex: number } | null = null;
        
        for (let i = 0; i < groupsToAssign.length; i++) {
            const group = groupsToAssign[i];
            for (const station of workstations) {
                 const currentStudentCount = (newAssignments[station.id] || []).reduce((sum, g) => sum + g.studentIds.length, 0);
                 const canFit = !station.capacity || (currentStudentCount + group.studentIds.length <= station.capacity);

                 if (canFit) {
                     const cost = calculateCost(group, station.id);
                     if (!bestPair || cost < bestPair.cost) {
                         bestPair = { group, stationId: station.id, cost, groupIndex: i };
                     }
                 }
            }
        }
        
        if (bestPair) {
            newAssignments[bestPair.stationId].push(bestPair.group);
            groupsToAssign.splice(bestPair.groupIndex, 1);
        } else {
             // If no group can be placed, break the loop
             toast({ title: "En eller flere grupper fikk ikke plass", description: "Enkelte grupper var for store for de gjenværende stasjonene.", variant: "destructive" });
             break;
        }
    }
    
    setStationAssignments(newAssignments);
    setUnassignedGroups(groupsToAssign);
    setViewMode('stations');
    toast({ title: "Grupper fordelt!", description: "Gruppene er automatisk fordelt på stasjonene." });
  };


  const handleLogSession = async () => {
    const logs: Omit<StationAssignmentLog, 'id'>[] = [];
    const date = new Date();
    
    // Log from stations if in station mode
    Object.entries(stationAssignments).forEach(([stationId, groups]) => {
        groups.forEach(group => {
            group.studentIds.forEach(studentId => {
                logs.push({ 
                    studentId: studentId, 
                    stationId, 
                    date,
                    groupSetId: activeGroupSet?.id,
                    groupId: activeGroupSet ? group.id : undefined,
                });
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
        setActiveGroupSet(null);
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

    if (!over || viewMode !== 'stations') {
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
    if (destStation?.capacity) {
        const studentCountInDest = (stationAssignments[destinationContainerId] || []).reduce((sum, group) => sum + group.studentIds.length, 0);
        if (studentCountInDest + activeGroup.studentIds.length > destStation.capacity) {
            toast({ title: "Stasjonen er full", description: `"${destStation.name}" har ikke plass til denne gruppen.`, variant: "destructive" });
            return;
        }
    }

    setStationAssignments(currentAssignments => {
        const newAssignments = JSON.parse(JSON.stringify(currentAssignments));
        
        // Remove from source
        let groupToMove: GroupWithId | null = null;
        if (sourceContainerId === 'unassigned') {
            const index = unassignedGroups.findIndex(g => g.id === activeId);
            if (index > -1) {
                groupToMove = unassignedGroups[index];
                setUnassignedGroups(prev => prev.filter(g => g.id !== activeId));
            }
        } else {
             const index = newAssignments[sourceContainerId]?.findIndex((g: GroupWithId) => g.id === activeId);
             if (index > -1) {
                groupToMove = newAssignments[sourceContainerId][index];
                newAssignments[sourceContainerId].splice(index, 1);
            }
        }

        if (!groupToMove) return currentAssignments;

        // Add to destination
        if (destinationContainerId === 'unassigned') {
            setUnassignedGroups(prev => [...prev, groupToMove!]);
        } else if (workstations.some(ws => ws.id === destinationContainerId)) {
            if (!newAssignments[destinationContainerId]) {
                newAssignments[destinationContainerId] = [];
            }
            newAssignments[destinationContainerId].push(groupToMove);
        } else {
            // Something went wrong, put it back
            if (sourceContainerId === 'unassigned') {
                setUnassignedGroups(prev => [...prev, groupToMove!]);
            } else {
                 newAssignments[sourceContainerId].push(groupToMove);
            }
        }
        return newAssignments;
    });
};


  const handleDragStart = (event: any) => {
      setActiveDragGroup(event.active.data.current.group);
  };

  const handleSaveGroupSet = async (name: string) => {
    if (!name.trim()) {
        toast({ title: "Navn mangler", description: "Gi gruppesettet et navn.", variant: "destructive" });
        return;
    }

    const allGroups = [...unassignedGroups, ...Object.values(stationAssignments).flat()];
    if (allGroups.length === 0) {
        toast({ title: "Ingen grupper", description: "Generer grupper før du lagrer.", variant: "destructive" });
        return;
    }

    const newGroupSet: Omit<GroupSet, 'id'> = {
        name: name.trim(),
        createdAt: new Date(),
        groups: allGroups.map(g => ({ id: g.id, studentIds: g.studentIds })),
    };
    try {
        const newId = await db.groupSets.add(newGroupSet as GroupSet);
        toast({ title: "Grupper lagret", description: `"${name.trim()}" er lagret.`});
        const savedGroupSet = { ...newGroupSet, id: newId as string, groups: allGroups.map((g,i) => ({...g, groupNumber: i+1})) };
        setActiveGroupSet(savedGroupSet);
    } catch(e) {
        toast({ title: "Feil", description: "Kunne ikke lagre gruppesett.", variant: "destructive" });
    }
  };
  
  const handleDeleteGroupSet = async (id: string) => {
      try {
          await db.groupSets.delete(id);
          if (activeGroupSet?.id === id) {
              setActiveGroupSet(null);
              setUnassignedGroups([]);
          }
          toast({ title: "Gruppesett slettet", variant: "destructive"});
      } catch (e) {
          toast({ title: "Feil", description: "Kunne ikke slette gruppesett.", variant: "destructive" });
      }
  };


  const showAssignmentView = unassignedGroups.length > 0 || Object.values(stationAssignments).some(v => v.length > 0);
  const totalGeneratedGroups = unassignedGroups.length + Object.values(stationAssignments).flat().length;


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gruppegenerator</CardTitle>
          <CardDescription>
            Lag tilfeldige grupper, last inn lagrede grupper for prosjekter, og fordel dem på arbeidsstasjoner. Fraværende elever for dagen blir automatisk ekskludert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-4 p-4 border rounded-lg">
                    <Label>Lag nye, tilfeldige grupper</Label>
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
                        Generer Nye Grupper
                    </Button>
                </div>
                 <div className="space-y-2 p-4 border rounded-lg flex flex-col">
                    <Label>Eller last inn et lagret gruppesett</Label>
                    <ScrollArea className="flex-grow">
                        <div className="space-y-2">
                            {groupSets.map(gs => (
                                <div key={gs.id} className="flex justify-between items-center p-2 rounded-md bg-secondary">
                                    <div>
                                        <p className="font-medium text-sm">{gs.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {gs.groups.length} grupper, laget {formatDistanceToNow(gs.createdAt, { addSuffix: true, locale: nb })}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                         <Button size="sm" variant="outline" onClick={() => handleLoadGroupSet(gs)}>
                                            <FolderOpen className="mr-2" /> Last inn
                                         </Button>
                                         <AlertDialog>
                                             <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="ghost">
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Slette gruppesett?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Er du sikker på at du vil slette "{gs.name}"? Dette kan ikke angres.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteGroupSet(gs.id!)}>Slett</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                         </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                 </div>
            </div>
        </CardContent>
      </Card>
      
      {showAssignmentView && (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} collisionDetection={closestCorners}>
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>{activeGroupSet ? `Fordel grupper for: ${activeGroupSet.name}` : "Fordel Grupper"}</CardTitle>
                        <CardDescription>
                            {viewMode === 'groups' ? 'Oversikt over genererte grupper.' : 'Dra gruppene til stasjonene, eller bruk automatisk fordeling.'}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {!activeGroupSet && totalGeneratedGroups > 0 && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline"><Save className="mr-2" /> Lagre grupper</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Lagre gruppesett</DialogTitle>
                                        <DialogDescription>Gi dette settet med grupper et navn for senere bruk (f.eks. "Naturfagsprosjekt").</DialogDescription>
                                    </DialogHeader>
                                    <Input id="group-set-name" placeholder="Navn på gruppesett..."/>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Avbryt</Button>
                                        </DialogClose>
                                        <DialogClose asChild>
                                            <Button onClick={() => handleSaveGroupSet((document.getElementById('group-set-name') as HTMLInputElement).value)}>Lagre</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                         <Button variant="outline" onClick={() => setViewMode(viewMode === 'groups' ? 'stations' : 'groups')}>
                            {viewMode === 'groups' ? <><Columns className="mr-2" /> Vis stasjoner</> : <><LayoutGrid className="mr-2" /> Vis kun grupper</>}
                         </Button>
                        
                        {viewMode === 'stations' && (
                            <>
                                <Button variant="outline" onClick={handleAutoAssign} disabled={unassignedGroups.length === 0 || workstations.length === 0}>
                                    <Bot className="mr-2" /> Auto-fordel
                                </Button>
                                <Button onClick={handleLogSession}>
                                    <CheckSquare className="mr-2"/> Loggfør økt
                                </Button>
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {viewMode === 'groups' ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {unassignedGroups.map((group) => (
                                <DraggableGroup key={group.id} group={group} studentMap={studentMap} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-1">
                                <DroppableStation station={{id: 'unassigned', name: `Ufordelte Grupper (${unassignedGroups.length})`}} isOver={false} hint={null} assignments={unassignedGroups} studentMap={studentMap}>
                                    {unassignedGroups.map((group) => (
                                    <DraggableGroup key={group.id} group={group} studentMap={studentMap} />
                                    ))}
                                </DroppableStation>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-2">
                                {workstations.map(station => (
                                    <DroppableStation key={station.id} station={station} isOver={false} hint={stationHints[station.id] || null} assignments={stationAssignments[station.id] || []} studentMap={studentMap}>
                                        {(stationAssignments[station.id] || []).map((group) => (
                                            <DraggableGroup key={group.id} group={group} studentMap={studentMap} />
                                        ))}
                                    </DroppableStation>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <DragOverlay>
                {activeDragGroup ? <DraggableGroup group={activeDragGroup} studentMap={studentMap} /> : null}
            </DragOverlay>
        </DndContext>
      )}

    </div>
  );
}
