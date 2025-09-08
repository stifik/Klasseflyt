
"use client";

import { useState, useMemo, FC, useRef, useEffect } from "react";
import type { Student, PickerGroup, PickerLog, SeatingChartData, SeatingLayout, AppSettings, PickerSettings, PickerColor } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, History, Plus, Trash2, Users, Edit, RefreshCw, Volume2, VolumeX, Palette, Settings } from "lucide-react";
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
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface StudentPickerProps {
  students: Student[];
  seatingChart: SeatingChartData | null;
  activeLayout: SeatingLayout | null | undefined;
  appSettings: AppSettings;
  onAppSettingsChange: (newSettings: AppSettings) => void;
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


const defaultPickerSettings: PickerSettings = {
    animationDuration: 2.5,
    soundEnabled: true,
    animationColor: 'default',
};

const colorConfig: Record<PickerColor, { class: string, style?: React.CSSProperties }> = {
    default: { class: 'bg-primary/20 border-primary' },
    blue: { class: 'bg-blue-500/20 border-blue-500' },
    green: { class: 'bg-green-500/20 border-green-500' },
    yellow: { class: 'bg-yellow-500/20 border-yellow-500' },
    red: { class: 'bg-red-500/20 border-red-500' },
    rainbow: { class: '' }
};

export default function StudentPicker({ students, seatingChart, activeLayout, appSettings, onAppSettingsChange }: StudentPickerProps) {
    const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
    const [withReplacement, setWithReplacement] = useState(false);
    const [isPicking, setIsPicking] = useState(isPicking = false);
    const [pickedStudent, setPickedStudent] = useState<Student | null>(null);
    const [sessionPickedStudentIds, setSessionPickedStudentIds] = useState<Set<string>>(new Set());
    const [currentAnimationStyle, setCurrentAnimationStyle] = useState<React.CSSProperties>({});
    const { toast } = useToast();

    const audioCtxRef = useRef<AudioContext | null>(null);

    const pickerSettings = useMemo(() => ({
        ...defaultPickerSettings,
        ...(appSettings.pickerSettings || {})
    }), [appSettings.pickerSettings]);

    const handlePickerSettingChange = (update: Partial<PickerSettings>) => {
        const newSettings = { ...pickerSettings, ...update };
        onAppSettingsChange({ ...appSettings, pickerSettings: newSettings });
    };

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
        if (selectedGroupId === 'all') {
             return Array.from(sessionPickedStudentIds).map((id, index) => ({
                id: index,
                groupId: 'all',
                studentId: id,
                date: new Date() 
            }));
        }
        return pickerLogs
            .filter(log => log.groupId === selectedGroupId)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [selectedGroupId, pickerLogs, sessionPickedStudentIds]);
    
    const studentLastPicked = useMemo(() => {
        const lastPickedMap = new Map<string, Date>();
        historyForGroup.forEach(log => {
            if (!lastPickedMap.has(log.studentId)) {
                lastPickedMap.set(log.studentId, log.date);
            }
        });
        return lastPickedMap;
    }, [historyForGroup]);
    
    const studentsToPickFrom = useMemo(() => {
        if (withReplacement) {
            return availableStudents;
        }

        const pickedStudentIds = new Set(historyForGroup.map(log => log.studentId));
        return availableStudents.filter(student => !pickedStudentIds.has(student.id!));
    }, [withReplacement, availableStudents, historyForGroup]);

    const alreadyPickedIds = useMemo(() => {
        if (withReplacement) return new Set<string>();
        return new Set(historyForGroup.map(log => log.studentId));
    }, [withReplacement, historyForGroup]);


    const playSound = (type: 'tick' | 'ding') => {
        if (!pickerSettings.soundEnabled || !audioCtxRef.current) return;
        const audioCtx = audioCtxRef.current;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        if (type === 'tick') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
        } else { // 'ding'
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime); // C6
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
        }
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + (type === 'tick' ? 0.1 : 0.5));
    };

    const handlePickStudent = async () => {
        if (studentsToPickFrom.length === 0 || isPicking) {
            if (studentsToPickFrom.length === 0 && !isPicking) {
                toast({ title: "Ingen elever å trekke", description: "Alle elever i gruppen er trukket. Nullstill historikken for å starte på nytt.", variant: "destructive" });
            }
            return;
        }

        // Initialize AudioContext on user gesture
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        setIsPicking(true);
        setPickedStudent(null);

        let weightedList = studentsToPickFrom;
        if (withReplacement) {
            weightedList = studentsToPickFrom.flatMap(student => {
                const lastPicked = studentLastPicked.get(student.id!);
                const daysSincePicked = lastPicked ? (new Date().getTime() - lastPicked.getTime()) / (1000 * 3600 * 24) : 1000;
                const weight = Math.max(1, Math.floor(Math.pow(daysSincePicked, 2)));
                return Array(weight).fill(student);
            });
        }

        const rainbowColors = [
            'hsl(0, 70%, 60%)', 'hsl(30, 70%, 60%)', 'hsl(60, 70%, 60%)', 
            'hsl(120, 70%, 60%)', 'hsl(200, 70%, 60%)', 'hsl(270, 70%, 60%)'
        ];
        let colorIndex = 0;

        const pickRandomStudent = () => {
            const randomIndex = Math.floor(Math.random() * weightedList.length);
            const student = weightedList[randomIndex];
            setPickedStudent(student);

            if (pickerSettings.animationColor === 'rainbow') {
                const color = rainbowColors[colorIndex % rainbowColors.length];
                setCurrentAnimationStyle({ backgroundColor: `${color}33`, borderColor: color });
                colorIndex++;
            }
        };
        
        const finalPick = weightedList[Math.floor(Math.random() * weightedList.length)];
        
        const totalDuration = pickerSettings.animationDuration * 1000;
        const initialInterval = 50;
        const finalInterval = 500;
        let currentTime = 0;
        let currentInterval = initialInterval;

        const runAnimation = () => {
            pickRandomStudent();
            playSound('tick');
            currentTime += currentInterval;

            const progress = currentTime / totalDuration;
            currentInterval = initialInterval + (finalInterval - initialInterval) * progress;
            
            if (currentTime < totalDuration) {
                setTimeout(runAnimation, currentInterval);
            } else {
                setIsPicking(false);
                setPickedStudent(finalPick);
                setCurrentAnimationStyle({});
                playSound('ding');
                
                if (selectedGroupId === 'all') {
                    setSessionPickedStudentIds(prev => new Set(prev).add(finalPick.id!));
                } else {
                     db.pickerLogs.add({
                        groupId: selectedGroupId,
                        studentId: finalPick.id!,
                        date: new Date(),
                    });
                }
            }
        };

        runAnimation();
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

    const handleResetHistory = async () => {
        if (selectedGroupId === 'all') {
            setSessionPickedStudentIds(new Set());
            setPickedStudent(null);
            toast({ title: "Historikk nullstilt", description: "Du kan nå starte en ny trekning for hele klassen."});
            return;
        };
        try {
            const logsToDelete = await db.pickerLogs.where({ groupId: selectedGroupId }).primaryKeys();
            await db.pickerLogs.bulkDelete(logsToDelete);
            setPickedStudent(null);
            toast({ title: "Historikk nullstilt", description: "Du kan nå starte en ny trekning for denne gruppen."});
        } catch (e) {
            toast({ title: "Feil", description: "Kunne ikke nullstille historikken.", variant: "destructive" });
        }
    };
    
    const Desk = ({ studentName, isPicked, isPicking, isOutOfPlay }: { studentName: string | null; isPicked: boolean, isPicking: boolean, isOutOfPlay: boolean }) => {
        const animationStyle = colorConfig[pickerSettings.animationColor];
        const isRainbowPicking = isPicking && pickerSettings.animationColor === 'rainbow';
        
        return (
            <div
                className={cn(
                    "relative flex items-center justify-center border rounded-lg transition-all duration-300 w-full h-16",
                    isPicked && !isRainbowPicking ? `${animationStyle.class} shadow-lg scale-105` : "bg-secondary",
                    isPicking && !isRainbowPicking && "bg-muted",
                    isPicked && isRainbowPicking && 'shadow-lg scale-105',
                    isOutOfPlay && 'opacity-40'
                )}
                 style={(isPicked && isRainbowPicking) ? currentAnimationStyle : {}}
            >
                {studentName && <p className="text-xs font-medium text-center">{studentName}</p>}
            </div>
        );
    };

    return (
        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
                <Card className="min-h-[400px]">
                    <CardHeader>
                        <CardTitle>Elev-trekker</CardTitle>
                        <CardDescription>Trekk en tilfeldig elev ved hjelp av klassekartet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {seatingChart && activeLayout ? (
                             <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${activeLayout.cols}, 1fr)` }}>
                                {Array.from({ length: activeLayout.rows }).map((_, r) =>
                                    Array.from({ length: activeLayout.cols }).map((_, c) => {
                                        if (!activeLayout.layout[r]?.[c]) {
                                            return <div key={`${r}-${c}`} />;
                                        }
                                        const studentName = seatingChart[r]?.[c]?.[0] || null;
                                        const student = studentName ? students.find(s => s.name === studentName) : null;
                                        const isPicked = student?.name === pickedStudent?.name;
                                        const isPickingStudent = isPicking && student?.name === pickedStudent?.name;
                                        const isOutOfPlay = student ? alreadyPickedIds.has(student.id!) && !isPicked : false;

                                        return (
                                            <Desk
                                                key={`${r}-${c}`}
                                                studentName={studentName}
                                                isPicked={isPicked}
                                                isPicking={isPickingStudent}
                                                isOutOfPlay={isOutOfPlay}
                                            />
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-48 text-muted-foreground">
                                <p>Generer et klassekart under "Klasseverktøy {'>'} Klassekart" for å bruke denne visningen.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Kontrollpanel</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={handlePickStudent} disabled={isPicking || studentsToPickFrom.length === 0} size="lg" className="w-full">
                            <Sparkles className="mr-2" />
                            {isPicking ? 'Trekker...' : 'Trekk elev'}
                        </Button>
                         <p className="text-xs text-center text-muted-foreground">
                            {studentsToPickFrom.length} av {availableStudents.length} elever igjen å trekke.
                        </p>
                        
                        <div className="space-y-2 pt-4 border-t">
                            <Label>Velg gruppe</Label>
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
                            <EditGroupDialog 
                                students={students} 
                                onSave={handleSaveGroup}
                                trigger={
                                    <Button variant="outline" className="w-full">
                                        <Plus className="mr-2" /> Ny gruppe
                                    </Button>
                                }
                            />
                        </div>
                        
                        <div className="space-y-2 pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                    <History className="w-4 h-4 text-muted-foreground" />
                                    Nylig trukket
                                </h4>
                                <Button variant="ghost" size="sm" onClick={handleResetHistory}>
                                    <RefreshCw className="mr-2 h-3 w-3" /> Nullstill
                                </Button>
                            </div>
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

                        <Accordion type="single" collapsible className="w-full pt-4 border-t">
                            <AccordionItem value="settings" className="border-b-0">
                                <AccordionTrigger>
                                     <h4 className="font-medium text-sm flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-muted-foreground" />
                                        Innstillinger for trekking
                                    </h4>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handlePickerSettingChange({ soundEnabled: !pickerSettings.soundEnabled })}>
                                                {pickerSettings.soundEnabled ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
                                                <span className="sr-only">{pickerSettings.soundEnabled ? 'Slå av lyd' : 'Slå på lyd'}</span>
                                            </Button>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Palette className="w-4 h-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-2">
                                                    <div className="flex gap-2">
                                                        {Object.entries(colorConfig).map(([key, value]) => (
                                                            <button 
                                                                key={key} 
                                                                className={cn("w-6 h-6 rounded-full border-2", value.class, key === 'rainbow' ? 'animate-rainbow-border' : '', key === pickerSettings.animationColor ? 'ring-2 ring-ring ring-offset-2' : '')}
                                                                onClick={() => handlePickerSettingChange({ animationColor: key as PickerColor })}
                                                            />
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                         <div className="flex items-center space-x-2">
                                            <Label htmlFor="replacement-mode" className="font-normal text-xs">Med tilbakelegging</Label>
                                            <Switch id="replacement-mode" checked={withReplacement} onCheckedChange={setWithReplacement} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="duration-slider" className="text-xs">Varighet ({pickerSettings.animationDuration.toFixed(1)}s)</Label>
                                        <Slider
                                            id="duration-slider"
                                            min={1}
                                            max={10}
                                            step={0.5}
                                            value={[pickerSettings.animationDuration]}
                                            onValueChange={(value) => handlePickerSettingChange({ animationDuration: value[0] })}
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    