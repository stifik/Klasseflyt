

"use client";

import { useState, useMemo, useEffect, FC, KeyboardEvent, useRef } from "react";
import type { Student, StationAssignmentLog, Workstation, AppSettings, GroupSet, GroupInSet, Absence, GroupingRules, AvoidPair } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Shuffle, Users, CheckSquare, GripVertical, Bot, Info, Library, Save, FolderOpen, Trash2, LayoutGrid, Columns, Plus, Edit, Settings, ChevronsUpDown, Check, UserPlus } from "lucide-react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
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
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Settings as SettingsComponent } from "@/components/Settings";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";


interface GroupToolProps {
  students: Student[];
  appSettings: AppSettings;
  stationAssignmentLogs?: StationAssignmentLog[];
  groupSets?: GroupSet[];
  absences?: Absence[];
  onAppSettingsChange: (settings: AppSettings) => void;
}

type CreationMode = "manual" | "random";
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


const DraggableStudentItem = ({ studentId, studentName }: { studentId: string, studentName: string }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `student-${studentId}`,
        data: { type: 'student', studentId, studentName },
    });

    return (
        <li
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "p-1.5 bg-background border rounded-md text-xs touch-none cursor-grab",
                isDragging && "opacity-50"
            )}
        >
            {studentName}
        </li>
    );
};

const DroppableGroupCard = ({ group, studentMap, onEdit, onDelete, children }: { group: GroupWithId, studentMap: Map<string, string>, onEdit: () => void, onDelete: () => void, children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `group-${group.id}`,
        data: { type: 'group', groupId: group.id },
    });
    
    return (
        <Card ref={setNodeRef} className={cn("touch-none", isOver && "bg-primary/10")}>
            <CardHeader className="flex flex-row items-center justify-between p-2">
                <CardTitle className="text-sm font-medium">Gruppe {group.groupNumber}</CardTitle>
                 <div className="flex">
                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onEdit}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
            </CardHeader>
            <CardContent className="p-2 pt-0 text-xs">
                <ul className="space-y-1 min-h-[20px]">
                    {children}
                </ul>
            </CardContent>
        </Card>
    );
};


const DraggableGroup = ({ group, studentMap }: { group: GroupWithId; studentMap: Map<string, string> }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: group.id,
    data: { type: 'group', group },
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
    const { setNodeRef } = useDroppable({ id: station.id, data: { type: 'station' } });
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

const EditGroupDialog: FC<{
    group?: { id: string, studentIds: string[], groupNumber: number };
    students: Student[];
    onSave: (group: { id: string, studentIds: string[], groupNumber: number }) => void;
    trigger: React.ReactNode;
}> = ({ group, students, onSave, trigger }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    
    useEffect(() => {
        if (isOpen) {
            setSelectedStudentIds(group?.studentIds || []);
            setSearch("");
        }
    }, [isOpen, group]);

    const handleSave = () => {
        onSave({ id: group?.id || uuidv4(), studentIds: selectedStudentIds, groupNumber: group?.groupNumber || 0 });
        setIsOpen(false);
    };

    const studentMap = useMemo(() => new Map(students.map(s => [s.id!, s.name])), [students]);
    
    const filteredStudents = useMemo(() => {
        return students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    }, [students, search]);
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{group ? `Rediger Gruppe ${group.groupNumber}` : "Ny Gruppe"}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tilgjengelige elever</Label>
                        <Input placeholder="Søk..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        <ScrollArea className="h-64 border rounded-md p-2">
                            {filteredStudents.map(s => {
                                if (selectedStudentIds.includes(s.id!)) return null;
                                return (
                                    <div key={s.id} className="flex items-center justify-between p-1">
                                        <span className="text-sm">{s.name}</span>
                                        <Button size="sm" variant="outline" onClick={() => setSelectedStudentIds(prev => [...prev, s.id!])}>Legg til</Button>
                                    </div>
                                )
                            })}
                        </ScrollArea>
                    </div>
                     <div className="space-y-2">
                        <Label>Valgte elever ({selectedStudentIds.length})</Label>
                         <ScrollArea className="h-[290px] border rounded-md p-2">
                            {selectedStudentIds.map(id => (
                                <div key={id} className="flex items-center justify-between p-1">
                                    <span className="text-sm">{studentMap.get(id)}</span>
                                    <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setSelectedStudentIds(prev => prev.filter(sid => sid !== id))}>
                                        <Trash2 className="w-4 h-4 text-destructive"/>
                                    </Button>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Avbryt</Button></DialogClose>
                    <Button onClick={handleSave}>Lagre</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function GroupTool({ students, appSettings, stationAssignmentLogs = [], groupSets = [], absences = [], onAppSettingsChange }: GroupToolProps) {
  const [creationMode, setCreationMode] = useState<CreationMode>("random");
  const [groupValue, setGroupValue] = useState<number>(4);
  
  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  
  const [activeGroupSet, setActiveGroupSet] = useState<GroupSet | null>(null);
  const [unassignedGroups, setUnassignedGroups] = useState<GroupWithId[]>([]);
  const [stationAssignments, setStationAssignments] = useState<Record<string, GroupWithId[]>>({});
  const [activeDragItem, setActiveDragItem] = useState<any | null>(null);
  
  const [editingGroup, setEditingGroup] = useState<GroupWithId | null>(null);


  const { toast } = useToast();
  const workstations = appSettings.workstations || [];
  const studentMap = useMemo(() => new Map(students.map(s => [s.id!, s.name])), [students]);

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
    if (activeDragItem?.type !== 'group') return {};
    const activeDragGroup = activeDragItem.group;
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

  }, [activeDragItem, workstations, individualStudentHistory, groupHistory, activeGroupSet]);


 const handleGenerateGroups = () => {
    const rules = appSettings.groupingRules || { keepTogether: [], keepApart: [] };
    const { keepTogether, keepApart } = rules;

    if (groupValue <= 0 || presentStudents.length === 0) {
        setUnassignedGroups([]);
        return;
    }

    let studentsToGroup = [...presentStudents];
    const initialGroups: Student[][] = [];

    // 1. Handle "Keep Together" groups first
    keepTogether.forEach(groupNames => {
        const groupStudents = groupNames
            .map(name => students.find(s => s.name === name))
            .filter((s): s is Student => !!s && !todaysAbsentStudentIds.has(s.id!));
        
        if (groupStudents.length > 0) {
            initialGroups.push(groupStudents);
            // Remove these students from the pool
            const groupStudentIds = new Set(groupStudents.map(s => s.id));
            studentsToGroup = studentsToGroup.filter(s => !groupStudentIds.has(s.id));
        }
    });

    const shuffledStudents = shuffleArray(studentsToGroup);

    // If there are more pre-defined groups than requested groups, show an error.
    if (initialGroups.length > groupValue) {
        toast({
            title: "For mange 'Hold sammen'-grupper",
            description: `Du har ${initialGroups.length} 'Hold sammen'-grupper, men ba bare om ${groupValue} totalt.`,
            variant: "destructive"
        });
        return;
    }

    // Prepare remaining group slots
    const remainingGroupSlots = groupValue - initialGroups.length;
    for (let i = 0; i < remainingGroupSlots; i++) {
        initialGroups.push([]);
    }

    // 2. Distribute remaining students
    shuffledStudents.forEach(student => {
        let placed = false;
        // Try placing in the smallest available group that doesn't violate "keep apart" rules
        const sortedGroups = initialGroups
            .map((g, i) => ({ group: g, index: i }))
            .sort((a, b) => a.group.length - b.group.length);

        for (const { group, index } of sortedGroups) {
             const studentNamesInGroup = group.map(s => s.name);
             const studentName = student.name;
             const isConflict = keepApart.some(pair => 
                (pair.includes(studentName) && (studentNamesInGroup.some(nameInGroup => pair.includes(nameInGroup))))
             );

            if (!isConflict) {
                initialGroups[index].push(student);
                placed = true;
                break;
            }
        }
        // If student couldn't be placed (due to conflicts), just add to the smallest group
        if (!placed) {
            const smallestGroupIndex = initialGroups.reduce((minIndex, currentGroup, currentIndex, arr) => 
                currentGroup.length < arr[minIndex].length ? currentIndex : minIndex, 0);
            initialGroups[smallestGroupIndex].push(student);
        }
    });

    const finalGroups = initialGroups.filter(g => g.length > 0);
    const groupsWithIds: GroupWithId[] = finalGroups.map((g, index) => ({ id: uuidv4(), studentIds: g.map(s => s.id!), groupNumber: index + 1 }));
    setUnassignedGroups(groupsWithIds);
    setActiveGroupSet(null);
    setViewMode('groups');

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
    setActiveDragItem(null);
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // --- Logic for dragging STUDENTS between groups ---
    if (activeType === 'student' && overType === 'group') {
        const studentId = active.data.current?.studentId;
        const targetGroupId = over.data.current?.groupId;
        
        // Find which group the student currently belongs to
        let sourceGroupId: string | null = null;
        for (const group of unassignedGroups) {
            if (group.studentIds.includes(studentId)) {
                sourceGroupId = group.id;
                break;
            }
        }
        
        if (sourceGroupId && sourceGroupId !== targetGroupId) {
            setUnassignedGroups(prevGroups => {
                const newGroups = JSON.parse(JSON.stringify(prevGroups));
                const sourceGroup = newGroups.find((g: GroupWithId) => g.id === sourceGroupId)!;
                const targetGroup = newGroups.find((g: GroupWithId) => g.id === targetGroupId)!;

                // Remove from source
                sourceGroup.studentIds = sourceGroup.studentIds.filter((id: string) => id !== studentId);
                // Add to target if not already there
                if (!targetGroup.studentIds.includes(studentId)) {
                    targetGroup.studentIds.push(studentId);
                }
                
                return newGroups.filter((g: GroupWithId) => g.studentIds.length > 0);
            });
        }
        return;
    }

    // --- Logic for dragging GROUPS between stations ---
    if (activeType === 'group' && viewMode === 'stations') {
        const activeId = active.id.toString();
        const overId = over.id.toString();
        const [activeGroup, sourceContainerId] = findGroupAndContainer(activeId);
        
        if (!activeGroup || !sourceContainerId) return;

        const overIsStation = over.data.current?.type === 'station';
        const destinationContainerId = overIsStation ? over.id.toString() : 'unassigned';
        
        if (sourceContainerId === destinationContainerId) return; // Dropped in the same container

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

            if (destinationContainerId === 'unassigned') {
                setUnassignedGroups(prev => [...prev, groupToMove!]);
            } else if (workstations.some(ws => ws.id === destinationContainerId)) {
                if (!newAssignments[destinationContainerId]) newAssignments[destinationContainerId] = [];
                newAssignments[destinationContainerId].push(groupToMove);
            }
            return newAssignments;
        });
    }
};


  const handleDragStart = (event: any) => {
      setActiveDragItem(event.active.data.current);
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
  
  const handleManualGroupSave = (group: { id: string, studentIds: string[], groupNumber: number }) => {
    const existingIndex = unassignedGroups.findIndex(g => g.id === group.id);
    if (existingIndex > -1) {
        // Update existing group
        setUnassignedGroups(prev => prev.map(g => g.id === group.id ? { ...g, studentIds: group.studentIds } : g));
    } else {
        // Add new group
        const newGroupNumber = unassignedGroups.length > 0 ? Math.max(...unassignedGroups.map(g => g.groupNumber)) + 1 : 1;
        const newGroup: GroupWithId = { ...group, groupNumber: newGroupNumber };
        setUnassignedGroups(prev => [...prev, newGroup]);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );


  const showAssignmentView = unassignedGroups.length > 0 || Object.values(stationAssignments).some(v => v.length > 0);
  const totalGeneratedGroups = unassignedGroups.length + Object.values(stationAssignments).flat().length;
  
  const studentsPerGroupText = useMemo(() => {
    if (presentStudents.length === 0 || groupValue <= 0 || isNaN(groupValue)) return "";
    let text = "";
    const numGroups = Math.min(groupValue, presentStudents.length);
    if (numGroups === 0) return "";
    
    const minPerGroup = Math.floor(presentStudents.length / numGroups);
    const remainder = presentStudents.length % numGroups;
    
    if (remainder === 0) {
        text = `${minPerGroup} elever per gruppe.`;
    } else {
        text = `De fleste gruppene vil ha ${minPerGroup} eller ${minPerGroup + 1} elever.`;
    }
    return text;
  }, [presentStudents, groupValue]);


  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Gruppegenerator</CardTitle>
                  <CardDescription>
                    Lag tilfeldige grupper, juster dem manuelt, og fordel dem på arbeidsstasjoner. Fraværende elever for dagen blir automatisk ekskludert.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={creationMode} onValueChange={(v) => setCreationMode(v as CreationMode)} className="space-y-2">
                        <Label htmlFor="r1" className={cn(
                            "block p-4 border rounded-lg cursor-pointer bg-secondary/50 hover:bg-secondary", 
                            creationMode === 'random' && 'ring-2 ring-primary bg-secondary'
                        )}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="random" id="r1" />
                                <span className="text-base font-semibold">Grupper elever tilfeldig</span>
                            </div>
                            {creationMode === 'random' && (
                                <div className="mt-4 space-y-3 pl-6">
                                    <div>
                                        <Label htmlFor="group-value" className="mb-1 block">Hvor mange grupper?</Label>
                                        <Input
                                            id="group-value"
                                            type="number"
                                            value={groupValue}
                                            onChange={(e) => setGroupValue(parseInt(e.target.value, 10))}
                                            min="1"
                                            max={presentStudents.length || 1}
                                        />
                                        {studentsPerGroupText && <p className="text-xs text-muted-foreground mt-1">{studentsPerGroupText}</p>}
                                    </div>
                                    <Button onClick={handleGenerateGroups} className="w-full">
                                        <Shuffle className="mr-2" />
                                        Generer Nye Grupper
                                    </Button>
                                     <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="rules">
                                            <AccordionTrigger>
                                                <div className="flex items-center gap-2 text-sm font-medium">
                                                    <Settings className="w-4 h-4" /> Regler for generering
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2">
                                                 <GroupingRulesManager students={students} appSettings={appSettings} onAppSettingsChange={onAppSettingsChange} />
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            )}
                        </Label>
                         <Label htmlFor="r2" className={cn(
                            "block p-4 border rounded-lg cursor-pointer bg-secondary/50 hover:bg-secondary", 
                            creationMode === 'manual' && 'ring-2 ring-primary bg-secondary'
                         )}>
                             <div className="flex items-center space-x-2">
                                <RadioGroupItem value="manual" id="r2" />
                                <span className="text-base font-semibold">Grupper elever manuelt</span>
                            </div>
                             {creationMode === 'manual' && (
                                <div className="mt-4 space-y-3 pl-6">
                                    <p className="text-sm text-muted-foreground">Lag grupper ved å velge elever selv.</p>
                                    <EditGroupDialog
                                        students={unassignedGroups.length > 0 ? presentStudents.filter(s => !unassignedGroups.flatMap(g => g.studentIds).includes(s.id!)) : presentStudents}
                                        onSave={handleManualGroupSave}
                                        trigger={<Button className="w-full"><Plus className="mr-2" /> Lag ny gruppe</Button>}
                                    />
                                </div>
                            )}
                        </Label>
                    </RadioGroup>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Lagrede Gruppesett</CardTitle>
                    <CardDescription>Last inn faste grupper for prosjekter eller stasjonsarbeid.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-64">
                        <div className="space-y-2 pr-2">
                            {groupSets.map(gs => (
                                <div key={gs.id} className="flex justify-between items-center p-2 rounded-md bg-secondary">
                                    <div>
                                        <p className="font-medium text-sm">{gs.name}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="sm" variant="outline" onClick={() => handleLoadGroupSet(gs)}>
                                            <FolderOpen className="mr-2" /> Last inn
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      
      {showAssignmentView && (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors} collisionDetection={closestCorners}>
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>{activeGroupSet ? `Fordel grupper for: ${activeGroupSet.name}` : "Fordel Grupper"}</CardTitle>
                        <CardDescription>
                            {viewMode === 'groups' ? 'Dra elever for å bytte gruppe, eller bytt til stasjonsvisning.' : 'Dra gruppene til stasjonene, eller bruk automatisk fordeling.'}
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
                                <DroppableGroupCard
                                    key={group.id}
                                    group={group}
                                    studentMap={studentMap}
                                    onEdit={() => setEditingGroup(group)}
                                    onDelete={() => setUnassignedGroups(prev => prev.filter(g => g.id !== group.id))}
                                >
                                    {group.studentIds.map(studentId => {
                                        const studentName = studentMap.get(studentId);
                                        return studentName ? <DraggableStudentItem key={studentId} studentId={studentId} studentName={studentName} /> : null;
                                    })}
                                </DroppableGroupCard>
                            ))}
                             {editingGroup && (
                                <EditGroupDialog
                                    group={editingGroup}
                                    students={presentStudents.filter(s => 
                                        !unassignedGroups.flatMap(g => g.studentIds).includes(s.id!) || 
                                        editingGroup.studentIds.includes(s.id!)
                                    )}
                                    onSave={handleManualGroupSave}
                                    trigger={<div/>}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-1">
                                <DroppableStation station={{id: 'unassigned', name: `Ufordelte Grupper (${unassignedGroups.length})`}} isOver={false} hint={null} assignments={unassignedGroups} studentMap={studentMap}>
                                    <div className="space-y-2">
                                        {unassignedGroups.map((group) => (
                                            <DraggableGroup key={group.id} group={group} studentMap={studentMap} />
                                        ))}
                                    </div>
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
                {activeDragItem ? (
                    activeDragItem.type === 'group' ? 
                        <DraggableGroup group={activeDragItem.group} studentMap={studentMap} /> :
                    activeDragItem.type === 'student' ?
                        <div className="p-1.5 bg-background border rounded-md text-xs shadow-lg">{activeDragItem.studentName}</div> : 
                    null
                ) : null}
            </DragOverlay>
        </DndContext>
      )}

    </div>
  );
}

const GroupingRulesManager: FC<{students: Student[], appSettings: AppSettings, onAppSettingsChange: (settings: AppSettings) => void}> = ({ students, appSettings, onAppSettingsChange }) => {
    const [keepTogetherSelection, setKeepTogetherSelection] = useState<string[]>([]);
    const [keepApartStudent1, setKeepApartStudent1] = useState("");
    const [keepApartStudent2, setKeepApartStudent2] = useState("");
    const [search, setSearch] = useState("");
    
    const rules = appSettings.groupingRules || { keepTogether: [], keepApart: [] };
    const studentMap = useMemo(() => new Map(students.map(s => [s.id!, s.name])), [students]);
    
    const handleRuleChange = (newRules: Partial<GroupingRules>) => {
        onAppSettingsChange({
            ...appSettings,
            groupingRules: {
                ...(rules || { keepTogether: [], keepApart: [] }),
                ...newRules
            }
        });
    }

    const handleAddKeepTogether = () => {
        if (keepTogetherSelection.length > 1) {
            const newGroup = keepTogetherSelection.map(id => studentMap.get(id)!);
            handleRuleChange({ keepTogether: [...rules.keepTogether, newGroup] });
            setKeepTogetherSelection([]);
        }
    };

    const handleRemoveKeepTogether = (index: number) => {
        const newKeepTogether = [...rules.keepTogether];
        newKeepTogether.splice(index, 1);
        handleRuleChange({ keepTogether: newKeepTogether });
    };

    const handleAddKeepApart = () => {
        if (keepApartStudent1 && keepApartStudent2 && keepApartStudent1 !== keepApartStudent2) {
            const student1Name = studentMap.get(keepApartStudent1)!;
            const student2Name = studentMap.get(keepApartStudent2)!;
            const newPair: AvoidPair = [student1Name, student2Name].sort() as AvoidPair;
            if (!rules.keepApart.some(p => p[0] === newPair[0] && p[1] === newPair[1])) {
                handleRuleChange({ keepApart: [...rules.keepApart, newPair] });
            }
            setKeepApartStudent1("");
            setKeepApartStudent2("");
        }
    };

    const handleRemoveKeepApart = (pairToRemove: AvoidPair) => {
        const newKeepApart = rules.keepApart.filter(p => p[0] !== pairToRemove[0] || p[1] !== pairToRemove[1]);
        handleRuleChange({ keepApart: newKeepApart });
    };

    const availableStudentsForTogether = students.filter(s => !rules.keepTogether.flat().includes(s.name) && !keepTogetherSelection.includes(s.id!));
    const filteredAvailableStudents = availableStudentsForTogether.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4 text-sm">
            <div>
                <Label>Hold elever sammen</Label>
                <div className="p-2 border rounded-md mt-1 space-y-2">
                    <div className="p-2 border rounded-md">
                        <div className="flex flex-wrap gap-1 text-xs mb-2 min-h-[20px]">
                            {keepTogetherSelection.map(id => (
                                <div key={id} className="flex items-center gap-1 bg-muted p-1 rounded">
                                    {studentMap.get(id)}
                                    <button onClick={() => setKeepTogetherSelection(prev => prev.filter(sId => sId !== id))}>
                                        <Trash2 className="w-3 h-3 text-destructive" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleAddKeepTogether} size="sm" className="w-full" disabled={keepTogetherSelection.length < 2}>
                            <Plus className="mr-2" /> Lag gruppe
                        </Button>
                    </div>

                    <div>
                        <Input 
                            placeholder="Søk for å legge til elev..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <ScrollArea className="h-32 mt-2">
                            <div className="space-y-1 pr-2">
                            {filteredAvailableStudents.map(s => (
                                <div key={s.id} className="flex items-center justify-between text-xs p-1">
                                    <span>{s.name}</span>
                                    <Button size="sm" variant="ghost" onClick={() => setKeepTogetherSelection(prev => [...prev, s.id!])}>
                                        Legg til
                                    </Button>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                 {rules.keepTogether.length > 0 && (
                    <div className="space-y-2 mt-2">
                        {rules.keepTogether.map((group, index) => (
                            <div key={index} className="flex items-center justify-between p-2 text-xs rounded-md bg-secondary">
                                <span>{group.join(', ')}</span>
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveKeepTogether(index)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div>
                <Label>Hold elever adskilt</Label>
                <div className="flex gap-2 mt-1">
                    <Select value={keepApartStudent1} onValueChange={setKeepApartStudent1}>
                        <SelectTrigger><SelectValue placeholder="Elev 1" /></SelectTrigger>
                        <SelectContent>{students.filter(s => s.id !== keepApartStudent2).map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={keepApartStudent2} onValueChange={setKeepApartStudent2}>
                        <SelectTrigger><SelectValue placeholder="Elev 2" /></SelectTrigger>
                        <SelectContent>{students.filter(s => s.id !== keepApartStudent1).map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={handleAddKeepApart} size="icon"><Plus /></Button>
                </div>
                 {rules.keepApart.length > 0 && (
                    <div className="space-y-2 mt-2">
                        {rules.keepApart.map((pair, index) => (
                            <div key={index} className="flex items-center justify-between p-2 text-xs rounded-md bg-secondary">
                                <span>{pair.join(' og ')}</span>
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveKeepApart(pair)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
