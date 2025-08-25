
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, UserPlus, BookPlus, PartyPopper } from "lucide-react";

interface OnboardingProps {
    onFinish: () => void;
}

const steps = ["welcome", "students", "subjects", "done"];

export default function Onboarding({ onFinish }: OnboardingProps) {
    const [step, setStep] = useState(0);
    const [newStudent, setNewStudent] = useState("");
    const [newSubject, setNewSubject] = useState("");
    const { toast } = useToast();

    const students = useLiveQuery(() => db.students.toArray(), []);
    const subjects = useLiveQuery(() => db.subjects.toArray(), []);
    
    const handleAddStudent = async () => {
        if (newStudent.trim()) {
            await db.students.add({ name: newStudent.trim() });
            setNewStudent("");
        }
    };
    
    const handleDeleteStudent = async (id: string) => {
        await db.students.delete(id);
    };
    
    const handleAddSubject = async () => {
        if (newSubject.trim()) {
            await db.subjects.add({ name: newSubject.trim() });
            setNewSubject("");
        }
    };

    const handleDeleteSubject = async (id: string) => {
        await db.subjects.delete(id);
    };

    const nextStep = () => {
        if (step === 1 && (!students || students.length === 0)) {
            toast({ title: "Mangler elever", description: "Legg til minst én elev for å fortsette.", variant: "destructive"});
            return;
        }
        if (step === 2 && (!subjects || subjects.length === 0)) {
            toast({ title: "Mangler fag", description: "Legg til minst ett fag for å fortsette.", variant: "destructive"});
            return;
        }
        if (step < steps.length - 1) {
            setStep(s => s + 1);
        }
    };
    
    const prevStep = () => {
        if (step > 0) {
            setStep(s => s - 1);
        }
    };

    const currentStep = steps[step];

    return (
        <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
                {currentStep === "welcome" && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl">Velkommen til Klasseflyt!</DialogTitle>
                            <DialogDescription>
                                La oss sette opp klassen din. Denne korte veiledningen hjelper deg med å legge inn grunnleggende informasjon.
                            </DialogDescription>
                        </DialogHeader>
                        <p>All data du legger inn lagres kun lokalt i din egen nettleser. Ingenting sendes til skyen.</p>
                        <DialogFooter>
                            <Button onClick={nextStep}>Start oppsett</Button>
                        </DialogFooter>
                    </>
                )}
                
                {currentStep === "students" && (
                     <>
                        <DialogHeader>
                            <DialogTitle>1. Legg til elevene dine</DialogTitle>
                            <DialogDescription>
                               Skriv inn navnet på en elev og trykk "Legg til". Gjenta for hele klassen.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2">
                           <Input 
                                value={newStudent} 
                                onChange={(e) => setNewStudent(e.target.value)} 
                                placeholder="Elevens navn..."
                                onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                            />
                           <Button onClick={handleAddStudent}><UserPlus className="mr-2" /> Legg til</Button>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {students?.map(s => (
                                <div key={s.id} className="flex justify-between items-center bg-secondary p-2 rounded-md">
                                    <span>{s.name}</span>
                                    <Button size="icon" variant="ghost" onClick={() => s.id && handleDeleteStudent(s.id)}><Trash2 className="text-destructive w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>
                        <DialogFooter className="justify-between">
                            <Button variant="outline" onClick={prevStep}>Tilbake</Button>
                            <Button onClick={nextStep}>Neste</Button>
                        </DialogFooter>
                    </>
                )}
                
                {currentStep === "subjects" && (
                     <>
                        <DialogHeader>
                            <DialogTitle>2. Legg til fagene dine</DialogTitle>
                            <DialogDescription>
                               Legg til fagene du underviser i, f.eks. "Norsk", "Matematikk", "Engelsk".
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2">
                           <Input 
                                value={newSubject} 
                                onChange={(e) => setNewSubject(e.target.value)} 
                                placeholder="Fagets navn..."
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                            />
                           <Button onClick={handleAddSubject}><BookPlus className="mr-2" /> Legg til</Button>
                        </div>
                         <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {subjects?.map(s => (
                                <div key={s.id} className="flex justify-between items-center bg-secondary p-2 rounded-md">
                                    <span>{s.name}</span>
                                    <Button size="icon" variant="ghost" onClick={() => s.id && handleDeleteSubject(s.id)}><Trash2 className="text-destructive w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>
                        <DialogFooter className="justify-between">
                            <Button variant="outline" onClick={prevStep}>Tilbake</Button>
                            <Button onClick={nextStep}>Neste</Button>
                        </DialogFooter>
                    </>
                )}

                {currentStep === "done" && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <PartyPopper className="text-primary" />
                                Oppsettet er fullført!
                            </DialogTitle>
                            <DialogDescription>
                                Du er nå klar til å bruke Klasseflyt. Du kan alltids endre elever, fag og andre innstillinger under "Innstillinger"-fanen.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button onClick={onFinish}>Begynn å bruke appen</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
