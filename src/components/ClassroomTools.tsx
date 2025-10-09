
"use client";

import { FC, useEffect, useState, useMemo } from "react";
import type { Student, SeatingChartRecord, SeatingLayout, AppSettings, PlacementRule, AvoidPair, SeatingChartData as SeatingChartDataType, StationAssignmentLog, GroupSet, Absence } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GroupTool from "./GroupTool";
import StudentPicker from "./StudentPicker";
import NewSeatingChart from "./NewSeatingChart";
import SeatingChartArchive from "./SeatingChartArchive";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2, Shuffle, Plus, X, Trash2, Save, Lock, Unlock } from "lucide-react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';


const SeatingChartTabContent: FC<{
    students: Student[];
    appSettings: AppSettings;
    onAppSettingsChange: (settings: AppSettings) => void;
    onSeatingChartChange: (chart: SeatingChartDataType | null, source: 'generation' | 'drag' | 'load') => void;
    history: SeatingChartRecord[];
}> = ({ students, appSettings, onAppSettingsChange, onSeatingChartChange, history }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedStudent1, setSelectedStudent1] = useState<string>("");
    const [selectedStudent2, setSelectedStudent2] = useState<string>("");
    const [selectedStudentForRule, setSelectedStudentForRule] = useState<string>("");
    const [selectedPlacement, setSelectedPlacement] = useState<'front' | 'back'>('front');
    const { toast } = useToast();

    const layouts = useLiveQuery(() => db.seatingLayouts.toArray());
    const activeLayout = useLiveQuery(() => {
        if (appSettings.selectedSeatingLayoutId) {
            return db.seatingLayouts.get(appSettings.selectedSeatingLayoutId);
        }
        return undefined;
    }, [appSettings.selectedSeatingLayoutId]);

    const avoidPairs = appSettings.seatingChartRules?.avoidPairs || [];
    const placementRules = appSettings.seatingChartRules?.placementRules || [];

    const lastChart = history[0] ? JSON.parse(history[0].chartJson) : null;

    const handleRuleChange = (newRules: Partial<AppSettings['seatingChartRules']>) => {
        onAppSettingsChange({
            ...appSettings,
            seatingChartRules: {
                ...(appSettings.seatingChartRules || { avoidPairs: [], placementRules: [], avoidSameNeighbors: true }),
                ...newRules
            }
        });
    }

    const handleAddAvoidPair = () => {
        if (selectedStudent1 && selectedStudent2 && selectedStudent1 !== selectedStudent2) {
            const newPair: AvoidPair = [selectedStudent1, selectedStudent2].sort() as AvoidPair;
            if (!avoidPairs.some(p => p[0] === newPair[0] && p[1] === newPair[1])) {
                handleRuleChange({ avoidPairs: [...avoidPairs, newPair] });
            }
            setSelectedStudent1("");
            setSelectedStudent2("");
        }
    };

    const handleRemoveAvoidPair = (pairToRemove: AvoidPair) => {
        const newAvoidPairs = avoidPairs.filter(p => p[0] !== pairToRemove[0] || p[1] !== pairToRemove[1]);
        handleRuleChange({ avoidPairs: newAvoidPairs });
    };

    const handleAddPlacementRule = () => {
        if (selectedStudentForRule) {
            const newRules = placementRules.filter(r => r.studentName !== selectedStudentForRule);
            handleRuleChange({ placementRules: [...newRules, { studentName: selectedStudentForRule, placement: selectedPlacement }] });
            setSelectedStudentForRule("");
        }
    };

    const handleRemovePlacementRule = (studentNameToRemove: string) => {
        const newPlacementRules = placementRules.filter(r => r.studentName !== studentNameToRemove);
        handleRuleChange({ placementRules: newPlacementRules });
    };

    const getNeighbors = (r: number, c: number, chart: SeatingChartDataType): string[] => {
        const neighbors: string[] = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < chart.length && nc >= 0 && nc < chart[0].length && chart[nr][nc]?.[0]) {
                neighbors.push(chart[nr][nc]![0]);
            }
        }
        return neighbors;
    };

    const generateChartWithLogic = (): SeatingChartDataType => {
        if (!activeLayout) return [];

        let attempts = 0;
        const maxAttempts = 50;
        const avoidSameNeighbors = appSettings.seatingChartRules?.avoidSameNeighbors ?? true;
        const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
        const lockedDesks = activeLayout.lockedDesks || [];
        const newChart: SeatingChartDataType = Array(activeLayout.rows).fill(null).map(() => Array(activeLayout.cols).fill(null).map(() => []));

        while (attempts < maxAttempts) {
            let isValid = true;
            for (let r = 0; r < activeLayout.rows; r++) {
                for (let c = 0; c < activeLayout.cols; c++) {
                    newChart[r][c] = [];
                }
            }

            const lockedStudentNames = new Set<string>();
            lockedDesks.forEach(lock => {
                const [r, c] = lock.deskId.split('-').map(Number);
                if (activeLayout.layout[r]?.[c]) {
                    newChart[r][c] = [lock.studentName];
                    lockedStudentNames.add(lock.studentName);
                }
            });

            const remainingStudents = students.map(s => s.name).filter(name => !lockedStudentNames.has(name));
            const frontStudentNames = new Set(placementRules.filter(r => r.placement === 'front').map(r => r.studentName));
            const backStudentNames = new Set(placementRules.filter(r => r.placement === 'back').map(r => r.studentName));

            let frontStudents = shuffle(remainingStudents.filter(name => frontStudentNames.has(name)));
            let backStudents = shuffle(remainingStudents.filter(name => backStudentNames.has(name)));
            let otherStudents = shuffle(remainingStudents.filter(name => !frontStudentNames.has(name) && !backStudentNames.has(name)));

            let firstDeskRow = -1, lastDeskRow = -1;
            for (let r = 0; r < activeLayout.rows; r++) {
                if (activeLayout.layout[r].some(isDesk => isDesk)) {
                    if (firstDeskRow === -1) firstDeskRow = r;
                    lastDeskRow = r;
                }
            }

            const frontDesks: { r: number, c: number }[] = [], backDesks: { r: number, c: number }[] = [], middleDesks: { r: number, c: number }[] = [];
            if (firstDeskRow !== -1 && lastDeskRow !== -1) {
                for (let r = 0; r < activeLayout.rows; r++) {
                    for (let c = 0; c < activeLayout.cols; c++) {
                        if (activeLayout.layout[r][c] && newChart[r][c]?.length === 0) {
                            if (r === firstDeskRow) frontDesks.push({ r, c });
                            else if (r === lastDeskRow) backDesks.push({ r, c });
                            else middleDesks.push({ r, c });
                        }
                    }
                }
            }

            let shuffledFrontDesks = shuffle(frontDesks);
            let shuffledBackDesks = shuffle(backDesks);
            let shuffledMiddleDesks = shuffle(middleDesks);

            frontStudents.forEach(student => {
                const desk = shuffledFrontDesks.pop() || shuffledMiddleDesks.pop() || shuffledBackDesks.pop();
                if (desk) newChart[desk.r][desk.c] = [student];
                else otherStudents.push(student);
            });
            backStudents.forEach(student => {
                const desk = shuffledBackDesks.pop() || shuffledMiddleDesks.pop() || shuffledFrontDesks.pop();
                if (desk) newChart[desk.r][desk.c] = [student];
                else otherStudents.push(student);
            });

            let availableDesks = shuffle([...shuffledFrontDesks, ...shuffledMiddleDesks, ...shuffledBackDesks]);
            shuffle(otherStudents).forEach(student => {
                const desk = availableDesks.pop();
                if (desk) newChart[desk.r][desk.c] = [student];
            });

            for (let r = 0; r < activeLayout.rows; r++) {
                for (let c = 0; c < activeLayout.cols; c++) {
                    const student = newChart[r][c]?.[0];
                    if (!student) continue;

                    const neighbors = getNeighbors(r, c, newChart);

                    if (avoidSameNeighbors && lastChart) {
                        // Find where this student was in the last chart
                        let lastStudentPosition: { r: number, c: number } | null = null;
                        for (let lr = 0; lr < lastChart.length; lr++) {
                            for (let lc = 0; lc < lastChart[lr].length; lc++) {
                                if (lastChart[lr][lc]?.[0] === student) {
                                    lastStudentPosition = { r: lr, c: lc };
                                    break;
                                }
                            }
                            if (lastStudentPosition) break;
                        }
                        
                        // If we found where the student was, check if any current neighbors were neighbors before
                        if (lastStudentPosition) {
                            const lastNeighbors = getNeighbors(lastStudentPosition.r, lastStudentPosition.c, lastChart);
                            for (const currentNeighbor of neighbors) {
                                if (lastNeighbors.includes(currentNeighbor)) {
                                    isValid = false; 
                                    break;
                                }
                            }
                            if (!isValid) break;
                        }
                    }

                    for (const pair of avoidPairs) {
                        if ((student === pair[0] && neighbors.includes(pair[1])) || (student === pair[1] && neighbors.includes(pair[0]))) {
                            isValid = false; break;
                        }
                    }
                }
                if (!isValid) break;
            }

            if (isValid) return newChart;
            attempts++;
        }

        toast({ title: "Kunne ikke oppfylle alle regler", description: "Genererer et kart uten alle regler.", variant: "destructive" });
        const finalShuffled = students.map(s => s.name).filter(name => !new Set(lockedDesks.map(d => d.studentName)).has(name)).sort(() => Math.random() - 0.5);
        const finalChart: SeatingChartDataType = JSON.parse(JSON.stringify(newChart));
        let finalIndex = 0;
        for (let r = 0; r < activeLayout.rows; r++) {
            for (let c = 0; c < activeLayout.cols; c++) {
                if (activeLayout.layout[r][c] && finalChart[r][c]?.length === 0 && finalIndex < finalShuffled.length) {
                    finalChart[r][c] = [finalShuffled[finalIndex]];
                    finalIndex++;
                }
            }
        }
        return finalChart;
    };

    const handleGenerateClick = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const newChart = generateChartWithLogic();
            onSeatingChartChange(newChart, 'generation');
            setIsGenerating(false);
        }, 50);
    };

    const handleClearChart = () => {
        if (!activeLayout || !lastChart) {
            toast({ title: "Ingen kart å tømme", variant: "destructive" });
            return;
        }

        const lockedDesks = activeLayout.lockedDesks || [];
        const lockedStudentMap = new Map(lockedDesks.map(l => [l.deskId, l.studentName]));

        const newChart: SeatingChartDataType = Array(activeLayout.rows).fill(null).map(() => Array(activeLayout.cols).fill(null).map(() => []));

        for (let r = 0; r < activeLayout.rows; r++) {
            for (let c = 0; c < activeLayout.cols; c++) {
                const deskId = `${r}-${c}`;
                if (lockedStudentMap.has(deskId)) {
                    newChart[r][c] = [lockedStudentMap.get(deskId)!];
                } else {
                    newChart[r][c] = [];
                }
            }
        }

        onSeatingChartChange(newChart, 'generation');
        toast({ title: "Kart tømt", description: "Låste elever er beholdt." });
    };

    const seatingChart = useLiveQuery(async () => {
        const latest = await db.seatingChartHistory.orderBy('createdAt').last();
        return latest ? JSON.parse(latest.chartJson) : null;
    }, []);


    const handleDeleteLayout = async (id: string) => {
        await db.seatingLayouts.delete(id);
        if (appSettings.selectedSeatingLayoutId === id) {
            onAppSettingsChange({ ...appSettings, selectedSeatingLayoutId: null });
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-4">
                <Card>
                    <CardHeader><CardTitle>Generer Klassekart</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Button onClick={handleGenerateClick} disabled={isGenerating || !activeLayout} className="w-full">
                                {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Shuffle className="mr-2" />}
                                {seatingChart ? 'Generer nytt' : 'Generer'}
                            </Button>
                            <Button onClick={handleClearChart} disabled={!seatingChart || !activeLayout} variant="outline" className="w-full">
                                <Trash2 className="mr-2" /> Tøm kart
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Regler</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="avoid-neighbors">Unngå tidligere naboer</Label>
                            <Switch
                                id="avoid-neighbors"
                                checked={appSettings.seatingChartRules?.avoidSameNeighbors ?? true}
                                onCheckedChange={(checked) => handleRuleChange({ avoidSameNeighbors: checked })}
                            />
                        </div>
                        <div>
                            <Label>Unngå par</Label>
                            <div className="flex gap-2 mt-1">
                                <Select value={selectedStudent1} onValueChange={setSelectedStudent1}>
                                    <SelectTrigger><SelectValue placeholder="Elev 1" /></SelectTrigger>
                                    <SelectContent>{students.filter(s => s.name !== selectedStudent2).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={selectedStudent2} onValueChange={setSelectedStudent2}>
                                    <SelectTrigger><SelectValue placeholder="Elev 2" /></SelectTrigger>
                                    <SelectContent>{students.filter(s => s.name !== selectedStudent1).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Button onClick={handleAddAvoidPair} size="icon"><Plus /></Button>
                            </div>
                            {avoidPairs.length > 0 && (
                                <div className="space-y-2 mt-2">
                                    {avoidPairs.map((pair, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 text-sm rounded-md bg-secondary">
                                            <span>{pair.join(' og ')}</span>
                                            <Button size="icon" variant="ghost" onClick={() => handleRemoveAvoidPair(pair)}><X className="w-4 h-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <Label>Plassering</Label>
                            <div className="flex gap-2 mt-1">
                                <Select value={selectedStudentForRule} onValueChange={setSelectedStudentForRule}>
                                    <SelectTrigger><SelectValue placeholder="Elev" /></SelectTrigger>
                                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={selectedPlacement} onValueChange={(v) => setSelectedPlacement(v as 'front' | 'back')}>
                                    <SelectTrigger><SelectValue placeholder="Plassering" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="front">Foran</SelectItem>
                                        <SelectItem value="back">Bak</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleAddPlacementRule} size="icon"><Plus /></Button>
                            </div>
                            {placementRules.length > 0 && (
                                <div className="space-y-2 mt-2">
                                    {placementRules.map((rule, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 text-sm rounded-md bg-secondary">
                                            <span>{rule.studentName} ({rule.placement === 'front' ? 'Foran' : 'Bak'})</span>
                                            <Button size="icon" variant="ghost" onClick={() => handleRemovePlacementRule(rule.studentName)}><X className="w-4 h-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Layout</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Select
                            value={appSettings.selectedSeatingLayoutId || ""}
                            onValueChange={(id) => onAppSettingsChange({ ...appSettings, selectedSeatingLayoutId: id })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Velg en layout..." />
                            </SelectTrigger>
                            <SelectContent>
                                {layouts?.map(l => <SelectItem key={l.id} value={l.id!}>{l.name} ({l.rows}x{l.cols})</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {activeLayout && (
                            <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDeleteLayout(activeLayout.id!)}>
                                <Trash2 className="mr-2" /> Slett valgt layout
                            </Button>
                        )}
                        <div className="pt-4 border-t">
                            <CreateLayoutDialog onLayoutCreate={() => { }} />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Tabs defaultValue="current">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="current">Nytt klassekart</TabsTrigger>
                        <TabsTrigger value="archive">Arkiv</TabsTrigger>
                    </TabsList>
                    <TabsContent value="current">
                        <NewSeatingChart 
                            students={students} 
                            appSettings={appSettings} 
                            onAppSettingsChange={onAppSettingsChange} 
                            onSeatingChartChange={onSeatingChartChange} 
                        />
                    </TabsContent>
                    <TabsContent value="archive">
                        <SeatingChartArchive 
                            onLoadChart={(chart) => onSeatingChartChange(chart, 'load')}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

const LayoutDesigner = ({ onSave, onCancel }: { onSave: (layout: SeatingLayout) => void; onCancel: () => void; }) => {
    const [name, setName] = useState("");
    const [rows, setRows] = useState(6);
    const [cols, setCols] = useState(8);
    const [layout, setLayout] = useState<boolean[][]>(() => Array.from({ length: 6 }, () => Array(8).fill(false)));
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [isAdding, setIsAdding] = useState(true);
    const { toast } = useToast();

    const seatCount = useMemo(() => layout.flat().filter(Boolean).length, [layout]);

    const handleCellInteraction = (r: number, c: number) => {
        const newLayout = layout.map(row => [...row]);
        newLayout[r][c] = isAdding;
        setLayout(newLayout);
    };

    const handleMouseDown = (r: number, c: number) => {
        setIsMouseDown(true);
        setIsAdding(!layout[r][c]);
        handleCellInteraction(r, c);
    };

    const handleMouseEnter = (r: number, c: number) => {
        if (isMouseDown) {
            handleCellInteraction(r, c);
        }
    };

    const handleGridSizeChange = (type: 'rows' | 'cols', value: number) => {
        const newRows = type === 'rows' ? value : rows;
        const newCols = type === 'cols' ? value : cols;
        setRows(newRows);
        setCols(newCols);

        const newLayout = Array.from({ length: newRows }, () => Array(newCols).fill(false));
        setLayout(newLayout);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: "Navn mangler", description: "Vennligst gi layouten et navn.", variant: "destructive" });
            return;
        }
        if (seatCount === 0) {
            toast({ title: "Ingen pulter", description: "Du må legge til minst én pult.", variant: "destructive" });
            return;
        }

        const newLayoutData = { name: name.trim(), rows, cols, layout, seatCount, createdAt: new Date(), lockedDesks: [] };
        try {
            const newId = await db.seatingLayouts.add(newLayoutData as Omit<SeatingLayout, 'id'>);
            const savedLayout = { ...newLayoutData, id: newId as string };
            toast({ title: "Layout lagret", description: `"${name}" er lagret.` });
            onSave(savedLayout);
        } catch (error) {
            console.error(error);
            toast({ title: "Feil", description: "Kunne ikke lagre layout.", variant: "destructive" });
        }
    };

    return (
        <DialogContent className="max-w-4xl flex flex-col max-h-[90svh]">
            <DialogHeader>
                <DialogTitle>Design Klasserom-layout</DialogTitle>
                <DialogDescription>Klikk eller dra i rutenettet for å definere hvor pultene skal stå. Gi layouten et navn og lagre.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-3 overflow-y-auto pr-4">
                <div className="space-y-4">
                    <Input placeholder="Navn på layout (f.eks. 'Standard U-form')" value={name} onChange={(e) => setName(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                        <Label htmlFor="layout-rows" className="sr-only">Rader</Label>
                        <Input id="layout-rows" type="number" value={rows} onChange={e => handleGridSizeChange('rows', parseInt(e.target.value) || 1)} min="1" max="15" />
                        <Label htmlFor="layout-cols" className="sr-only">Kolonner</Label>
                        <Input id="layout-cols" type="number" value={cols} onChange={e => handleGridSizeChange('cols', parseInt(e.target.value) || 1)} min="1" max="15" />
                    </div>
                    <p className="text-sm font-medium">Antall sitteplasser: {seatCount}</p>
                    <div className="p-2 border rounded-md bg-muted text-muted-foreground text-xs">
                        Tips: Klikk for å bytte en rute. Hold inne og dra for å "male" flere ruter.
                    </div>
                </div>
                <div className="md:col-span-2" onMouseUp={() => setIsMouseDown(false)} onMouseLeave={() => setIsMouseDown(false)}>
                    <div className="grid gap-1 p-2 border rounded-lg bg-background" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                        {layout.map((row, r) => row.map((isDesk, c) => (
                            <div
                                key={`${r}-${c}`}
                                className={`w-full aspect-square rounded cursor-pointer ${isDesk ? 'bg-primary' : 'bg-secondary'}`}
                                onMouseDown={() => handleMouseDown(r, c)}
                                onMouseEnter={() => handleMouseEnter(r, c)}
                            />
                        )))}
                    </div>
                </div>
            </div>
            <DialogFooter className="pt-4 border-t">
                <DialogClose asChild>
                    <Button variant="outline" onClick={onCancel}>Avbryt</Button>
                </DialogClose>
                <Button onClick={handleSave}>Lagre Layout</Button>
            </DialogFooter>
        </DialogContent>
    );
};

const CreateLayoutDialog = ({ onLayoutCreate }: { onLayoutCreate: (layout: SeatingLayout) => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = (layout: SeatingLayout) => {
        onLayoutCreate(layout);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="w-full">
                    <Plus className="mr-2" /> Lag ny layout
                </Button>
            </DialogTrigger>
            {isOpen && <LayoutDesigner onSave={handleSave} onCancel={() => setIsOpen(false)} />}
        </Dialog>
    );
};


interface ClassroomToolsProps {
    students: Student[];
    seatingChart: SeatingChartData | null;
    activeLayout: SeatingLayout | null | undefined;
    onSeatingChartChange: (chart: SeatingChartData | null, source: 'generation' | 'drag' | 'load') => void;
    history: SeatingChartRecord[];
    appSettings: AppSettings;
    onAppSettingsChange: (newSettings: AppSettings) => void;
    layouts: SeatingLayout[];
    onLayoutsChange: (layouts: SeatingLayout[]) => void;
    activeSubTab?: string | null;
    onSubTabChange: (subTab: string) => void;
    stationAssignmentLogs?: StationAssignmentLog[];
    groupSets?: GroupSet[];
    absences?: Absence[];
}

const ClassroomTools: FC<ClassroomToolsProps> = (props) => {
    const { students, activeSubTab, onSubTabChange, appSettings, onAppSettingsChange, stationAssignmentLogs, groupSets, seatingChart, activeLayout, absences, onSeatingChartChange, history } = props;

    const defaultSubTab = "seating-chart";

    useEffect(() => {
        if (activeSubTab && ["seating-chart", "group-tool", "student-picker"].includes(activeSubTab)) {
            onSubTabChange(activeSubTab);
        }
    }, [activeSubTab, onSubTabChange]);


    return (
        <Tabs
            value={activeSubTab || defaultSubTab}
            onValueChange={onSubTabChange}
            className="w-full"
        >
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="seating-chart">Klassekart</TabsTrigger>
                <TabsTrigger value="group-tool">Gruppeverktøy</TabsTrigger>
                <TabsTrigger value="student-picker">Elev-trekker</TabsTrigger>
            </TabsList>
            <TabsContent value="seating-chart">
                <SeatingChartTabContent
                    students={students}
                    appSettings={appSettings}
                    onAppSettingsChange={onAppSettingsChange}
                    onSeatingChartChange={onSeatingChartChange}
                    history={history}
                />
            </TabsContent>
            <TabsContent value="group-tool">
                <GroupTool students={students} appSettings={appSettings} onAppSettingsChange={onAppSettingsChange} stationAssignmentLogs={stationAssignmentLogs} groupSets={groupSets} absences={absences} />
            </TabsContent>
            <TabsContent value="student-picker">
                <StudentPicker students={students} seatingChart={seatingChart} activeLayout={activeLayout} appSettings={appSettings} onAppSettingsChange={onAppSettingsChange} absences={absences} />
            </TabsContent>
        </Tabs>
    );
};

export default ClassroomTools;

    
    