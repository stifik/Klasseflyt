
"use client";

import { useState, useMemo, FC } from "react";
import type { Student, PickerGroup, PickerLog } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, History, Plus, Trash2, Users, Edit, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


interface StudentPickerProps {
  students: Student[];
}

const EditGroupDialog: FC<{
    group?: PickerGroup;
    students: Student[];
    onSave: (group: Omit<PickerGroup, 'id' | 'createdAt'> & { id?: string }) => void;
    trigger: React.ReactNode;
}> = ({ group, students, onSave, trigger }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState(group?.name || "");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(group?.studentIds || []);
    
    const allStudentIds = useMemo(() => students.map(s => s.id!), [students]);
    const areAllSelected = useMemo(() => selectedStudentIds.length === allStudentIds.length, [selectedStudentIds, allStudentIds]);

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({ id: group?.id, name: name.trim(), studentIds: selectedStudentIds });
        setIsOpen(false);
        if (!group) { // Reset for new group
            setName("");
            setSelectedStudentIds([]);
        }
    };
    
    const handleToggleSelectAll = () => {
        if (areAllSelected) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(allStudentIds);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{group ? "Rediger" : "Ny"} trekkgruppe</DialogTitle>
                    <DialogDescription>
                        Gi gruppen et navn og velg hvilke elever som skal være med.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Input placeholder="Navn på gruppen (f.eks. Ordenselever)" value={name} onChange={(e) => setName(e.target.value)} />
                     <div className="flex items-center justify-between">
                        <Label>Velg elever</Label>
                        <Button variant="link" onClick={handleToggleSelectAll}>
                            {areAllSelected ? "Fjern alle" : "Velg alle"}
                        </Button>
                    </div>
                    <ScrollArea className="h-48 border rounded-md p-2">
                        {students.map(student => (
                            <div key={student.id} className="flex items-center space-x-2 p-1">
                                <Checkbox
                                    id={`student-${student.id}`}
                                    checked={selectedStudentIds.includes(student.id!)}
                                    onCheckedChange={(checked) => {
                                        setSelectedStudentIds(prev =>
                                            checked ? [...prev, student.id!] : prev.filter(id => id !== student.id)
                                        );
                                    }}
                                />
                                <Label htmlFor={`student-${student.id}`} className="font-normal">{student.name}</Label>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Avbryt</Button></DialogClose>
                    <Button onClick={handleSave} disabled={!name.trim() || selectedStudentIds.length === 0}>Lagre</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function StudentPicker({ students }: StudentPickerProps) {
    const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
    const [isPicking, setIsPicking] = useState(false);
    const [pickedStudent, setPickedStudent] = useState<Student | null>(null);
    const { toast } = useToast();

    const pickerGroups = useLiveQuery(() => db.pickerGroups.toArray(), []);
    const pickerLogs = useLiveQuery(() => db.pickerLogs.toArray(), []);
    
    const studentMap = useMemo(() => new Map(students.map(s => [s.id!, s])), [students]);

    const availableStudents = useMemo(() => {
        if (!pickerGroups) return [];
        if (selectedGroupId === 'all') return students;
        
        const group = pickerGroups.find(g => g.id === selectedGroupId);
        if (!group) return [];
        
        return group.studentIds.map(id => studentMap.get(id)).filter(Boolean) as Student[];
    }, [selectedGroupId, pickerGroups, students, studentMap]);

    const historyForGroup = useMemo(() => {
        if (!pickerLogs) return [];
        return pickerLogs
            .filter(log => log.groupId === selectedGroupId)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [selectedGroupId, pickerLogs]);
    
    const studentLastPicked = useMemo(() => {
        const lastPickedMap = new Map<string, Date>();
        historyForGroup.forEach(log => {
            if (!lastPickedMap.has(log.studentId)) {
                lastPickedMap.set(log.studentId, log.date);
            }
        });
        return lastPickedMap;
    }, [historyForGroup]);

    const handlePickStudent = async () => {
        if (availableStudents.length === 0 || isPicking) return;
        
        setIsPicking(true);
        setPickedStudent(null);
        
        // Simple fairness: give students who haven't been picked, or were picked longest ago, a higher chance
        const weightedList = availableStudents.flatMap(student => {
            const lastPicked = studentLastPicked.get(student.id!);
            const daysSincePicked = lastPicked ? (new Date().getTime() - lastPicked.getTime()) / (1000 * 3600 * 24) : 1000;
            const weight = Math.max(1, Math.floor(Math.pow(daysSincePicked, 2))); // Square the days to give strong preference to those not picked recently
            return Array(weight).fill(student);
        });
        
        const pick = () => {
             const randomIndex = Math.floor(Math.random() * weightedList.length);
             setPickedStudent(weightedList[randomIndex]);
        };
        
        // Animation
        const interval = 100;
        const duration = 2000;
        let elapsed = 0;
        const animationInterval = setInterval(() => {
            pick();
            elapsed += interval;
            if (elapsed >= duration) {
                clearInterval(animationInterval);
                setIsPicking(false);
                
                const finalPick = weightedList[Math.floor(Math.random() * weightedList.length)];
                setPickedStudent(finalPick);
                
                if (selectedGroupId !== 'all') {
                    db.pickerLogs.add({
                        groupId: selectedGroupId,
                        studentId: finalPick.id!,
                        date: new Date(),
                    });
                }
            }
        }, interval);
    };
    
    const handleSaveGroup = async (groupData: Omit<PickerGroup, 'id' | 'createdAt'> & { id?: string }) => {
        try {
            if (groupData.id) {
                await db.pickerGroups.update(groupData.id, { name: groupData.name, studentIds: groupData.studentIds });
                toast({ title: "Gruppe oppdatert" });
            } else {
                const newGroup: PickerGroup = {
                    ...groupData,
                    id: uuidv4(),
                    createdAt: new Date(),
                };
                await db.pickerGroups.add(newGroup);
                toast({ title: "Gruppe lagret" });
            }
        } catch (error) {
            toast({ title: "Feil", description: "Kunne ikke lagre gruppen", variant: "destructive" });
        }
    };
    
    const handleDeleteGroup = async (groupId: string) => {
        try {
            await db.transaction('rw', db.pickerGroups, db.pickerLogs, async () => {
                await db.pickerGroups.delete(groupId);
                const logsToDelete = await db.pickerLogs.where({ groupId }).primaryKeys();
                await db.pickerLogs.bulkDelete(logsToDelete);
            });
            setSelectedGroupId('all'); // Reset selection
            toast({ title: "Gruppe slettet", variant: "destructive" });
        } catch (e) {
            toast({ title: "Feil", description: "Kunne ikke slette gruppen.", variant: "destructive" });
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
                <Card className="min-h-[400px]">
                    <CardHeader>
                        <CardTitle>Elev-trekker</CardTitle>
                        <CardDescription>Trekk en tilfeldig elev fra hele klassen eller en egendefinert gruppe.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center space-y-6 pt-10">
                        <div className={cn(
                            "flex items-center justify-center w-48 h-24 text-center border-2 rounded-lg transition-all duration-300",
                            isPicking && "border-dashed animate-pulse",
                            pickedStudent && "border-primary bg-primary/10 scale-110",
                            !pickedStudent && "border-border"
                        )}>
                            <p className="text-2xl font-bold text-primary">{pickedStudent?.name || "?"}</p>
                        </div>
                        <Button onClick={handlePickStudent} disabled={isPicking || availableStudents.length === 0} size="lg">
                            <Sparkles className="mr-2" />
                            {isPicking ? 'Trekker...' : 'Trekk elev'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Grupper & Historikk</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Velg gruppe..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Hele klassen ({students.length})
                                    </div>
                                </SelectItem>
                                {pickerGroups?.map(g => (
                                    <SelectItem key={g.id} value={g.id!}>
                                         <div className="flex items-center gap-2">
                                            {g.name} ({g.studentIds.length})
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        <div className="space-y-2">
                            <EditGroupDialog 
                                students={students} 
                                onSave={handleSaveGroup}
                                trigger={
                                    <Button variant="outline" className="w-full">
                                        <Plus className="mr-2" /> Ny gruppe
                                    </Button>
                                }
                            />
                            {selectedGroupId !== 'all' && pickerGroups?.find(g => g.id === selectedGroupId) && (
                               <div className="flex gap-2">
                                 <EditGroupDialog
                                    group={pickerGroups.find(g => g.id === selectedGroupId)}
                                    students={students}
                                    onSave={handleSaveGroup}
                                    trigger={
                                        <Button variant="outline" className="w-full">
                                            <Edit className="mr-2" /> Rediger
                                        </Button>
                                    }
                                 />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon"><Trash2 /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Slette gruppe?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Er du sikker? Dette vil slette gruppen og all tilhørende trekkhistorikk.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteGroup(selectedGroupId)}>Slett</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                               </div>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                                <History className="w-4 h-4 text-muted-foreground" />
                                Nylig trukket
                            </h4>
                            <ScrollArea className="h-32">
                                <ul className="text-sm text-muted-foreground space-y-1 pr-2">
                                    {historyForGroup.length > 0 ? historyForGroup.slice(0, 10).map(log => (
                                        <li key={log.id} className="flex justify-between text-xs">
                                            <span>{studentMap.get(log.studentId)?.name || 'Ukjent'}</span>
                                            <span>{formatDistanceToNow(log.date, { addSuffix: true, locale: nb })}</span>
                                        </li>
                                    )) : (
                                        <p className="text-xs text-center pt-4">Ingen historikk for denne gruppen.</p>
                                    )}
                                </ul>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
