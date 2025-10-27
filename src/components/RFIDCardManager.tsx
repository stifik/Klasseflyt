"use client";

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { RFIDCard, Student } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Scan,
  RotateCcw
} from 'lucide-react';
import { useNFCWebSocket } from '@/hooks/useNFCWebSocket';
import { formatCardUID, isValidCardUID, resetCooldown } from '@/lib/nfcReader';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RFIDCardManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<RFIDCard | null>(null);
  const [manualCardId, setManualCardId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isWaitingForCard, setIsWaitingForCard] = useState(false);
  const isWaitingForCardRef = React.useRef(false);

  const cards = useLiveQuery(() => db.rfidCards.toArray(), []) || [];
  const students = useLiveQuery(() => db.students.toArray(), []) || [];

  // Use WebSocket for real-time card detection
  const nfc = useNFCWebSocket({
    enabled: true,
    autoConnect: true,
    onCardDetected: (card) => {
      console.log('✅ Card detected callback called:', card.uid);
      console.log('   isWaitingForCard state:', isWaitingForCard);
      console.log('   isWaitingForCardRef.current:', isWaitingForCardRef.current);

      if (isWaitingForCardRef.current) {
        console.log('✅ Processing card:', card.uid);
        setManualCardId(card.uid);
        setFeedback({
          type: 'success',
          message: `Kort lest: ${formatCardUID(card.uid)}`
        });
        setIsWaitingForCard(false);
        isWaitingForCardRef.current = false;
        nfc.stopMonitoring();
      } else {
        console.log('⚠️ Not waiting for card, ignoring');
      }
    },
    onError: (error, message) => {
      if (isWaitingForCardRef.current) {
        console.error('❌ WebSocket error:', error, message);
        setFeedback({
          type: 'error',
          message: message || 'Feil ved kortlesing'
        });
        setIsWaitingForCard(false);
        isWaitingForCardRef.current = false;
        nfc.stopMonitoring();
      }
    }
  });

  // Get student name for a card
  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || 'Ukjent elev';
  };

  // Handle NFC reset
  const handleResetNFC = () => {
    resetCooldown();
    setFeedback({
      type: 'success',
      message: 'NFC-leser tilbakestilt. Du kan nå skanne kort på nytt.'
    });
  };

  // Handle scanning a new card
  const handleScanNewCard = () => {
    setFeedback(null);

    if (nfc.status === 'disconnected' || nfc.status === 'error') {
      setFeedback({
        type: 'error',
        message: 'NFC Bridge Server er ikke tilkoblet. Sjekk at bridge-serveren kjører.'
      });
      return;
    }

    if (nfc.readersConnected === 0) {
      setFeedback({
        type: 'error',
        message: 'Ingen kortleser funnet. Sjekk at kortleseren er tilkoblet.'
      });
      return;
    }

    // Start monitoring for cards
    setIsWaitingForCard(true);
    isWaitingForCardRef.current = true; // Set ref to avoid closure issue
    setFeedback({
      type: 'success',
      message: 'Venter på kort... Legg kortet på leseren nå.'
    });

    nfc.startMonitoring();

    // Auto-stop after 10 seconds if no card detected
    setTimeout(() => {
      if (isWaitingForCardRef.current) { // Check ref instead of state
        setIsWaitingForCard(false);
        isWaitingForCardRef.current = false; // Reset ref
        nfc.stopMonitoring();
        if (!manualCardId) {
          setFeedback({
            type: 'error',
            message: 'Ingen kort oppdaget. Prøv igjen.'
          });
        }
      }
    }, 10000);
  };

  // Add a new card
  const handleAddCard = async () => {
    if (!manualCardId.trim()) {
      setFeedback({ type: 'error', message: 'Vennligst skriv inn eller skann et kort-ID' });
      return;
    }

    if (!isValidCardUID(manualCardId)) {
      setFeedback({ type: 'error', message: 'Ugyldig kort-ID format' });
      return;
    }

    if (!selectedStudentId) {
      setFeedback({ type: 'error', message: 'Vennligst velg en elev' });
      return;
    }

    // Check if card already exists
    const existing = await db.rfidCards.where('cardId').equals(manualCardId).first();
    if (existing) {
      setFeedback({ type: 'error', message: 'Dette kortet er allerede registrert' });
      return;
    }

    // Check if student already has a card
    const existingForStudent = await db.rfidCards.where('studentId').equals(selectedStudentId).first();
    if (existingForStudent) {
      setFeedback({ 
        type: 'error', 
        message: 'Denne eleven har allerede et kort registrert. Blokkér det gamle først.' 
      });
      return;
    }

    try {
      await db.rfidCards.add({
        cardId: manualCardId,
        studentId: selectedStudentId,
        status: 'active',
        createdAt: new Date()
      });

      setFeedback({ 
        type: 'success', 
        message: `Kort registrert for ${getStudentName(selectedStudentId)}` 
      });
      setIsAddDialogOpen(false);
      setManualCardId('');
      setSelectedStudentId('');
    } catch (error) {
      setFeedback({ 
        type: 'error', 
        message: 'Kunne ikke registrere kort: ' + (error instanceof Error ? error.message : 'Ukjent feil') 
      });
    }
  };

  // Toggle card status
  const handleToggleStatus = async (card: RFIDCard) => {
    if (!card.id) return;

    const newStatus = card.status === 'active' ? 'blocked' : 'active';
    
    try {
      await db.rfidCards.update(card.id, { status: newStatus });
      setFeedback({ 
        type: 'success', 
        message: `Kort ${newStatus === 'blocked' ? 'blokkert' : 'aktivert'}` 
      });
    } catch (error) {
      setFeedback({ 
        type: 'error', 
        message: 'Kunne ikke oppdatere kortstatus' 
      });
    }
  };

  // Delete card
  const handleDeleteCard = async (card: RFIDCard) => {
    if (!card.id) return;
    
    if (!confirm(`Er du sikker på at du vil slette kortet til ${getStudentName(card.studentId)}?`)) {
      return;
    }

    try {
      await db.rfidCards.delete(card.id);
      setFeedback({ type: 'success', message: 'Kort slettet' });
    } catch (error) {
      setFeedback({ 
        type: 'error', 
        message: 'Kunne ikke slette kort' 
      });
    }
  };

  // Assign existing card to new student
  const handleReassignCard = async () => {
    if (!selectedCard?.id || !selectedStudentId) return;

    try {
      await db.rfidCards.update(selectedCard.id, { 
        studentId: selectedStudentId,
        status: 'active'
      });
      
      setFeedback({ 
        type: 'success', 
        message: `Kort tilordnet til ${getStudentName(selectedStudentId)}` 
      });
      setIsAssignDialogOpen(false);
      setSelectedCard(null);
      setSelectedStudentId('');
    } catch (error) {
      setFeedback({ 
        type: 'error', 
        message: 'Kunne ikke tilordne kort' 
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                RFID-kort administrasjon
              </CardTitle>
              <CardDescription>
                Administrer RFID/NFC-kort for elever
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleResetNFC}
                title="Tilbakestill NFC-leser hvis skanning har hengt seg"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Tilbakestill leser
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Registrer nytt kort
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {feedback && (
            <Alert className={`mb-4 ${feedback.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
              {feedback.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}

          {cards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Ingen kort registrert ennå</p>
              <p className="text-sm mt-2">Klikk "Registrer nytt kort" for å komme i gang</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => {
                const student = students.find(s => s.id === card.studentId);
                
                return (
                  <div 
                    key={card.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <CreditCard className={`w-8 h-8 ${card.status === 'active' ? 'text-blue-500' : 'text-gray-400'}`} />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{student?.name || 'Ukjent elev'}</p>
                          <Badge variant={card.status === 'active' ? 'default' : 'destructive'}>
                            {card.status === 'active' ? 'Aktiv' : 'Blokkert'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          ID: {formatCardUID(card.cardId)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Registrert: {new Date(card.createdAt).toLocaleDateString('no-NO')}
                          {card.lastUsed && ` • Sist brukt: ${new Date(card.lastUsed).toLocaleDateString('no-NO')}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(card)}
                      >
                        {card.status === 'active' ? (
                          <>
                            <Lock className="w-4 h-4 mr-1" />
                            Blokker
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 mr-1" />
                            Aktiver
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCard(card);
                          setIsAssignDialogOpen(true);
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Bytt elev
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCard(card)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Card Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrer nytt RFID-kort</DialogTitle>
            <DialogDescription>
              Skann kortet eller skriv inn kort-ID manuelt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* NFC Scanner Section */}
            <div className="space-y-2">
              <Label>Skann kort</Label>
              <Button
                onClick={handleScanNewCard}
                disabled={isWaitingForCard || nfc.status === 'disconnected'}
                className="w-full"
                variant="outline"
              >
                {isWaitingForCard ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Venter på kort...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 mr-2" />
                    Skann RFID-kort
                  </>
                )}
              </Button>
              {nfc.status === 'disconnected' && (
                <p className="text-xs text-amber-600">
                  NFC Bridge Server er ikke tilkoblet. Sjekk at bridge-serveren kjører på port 3001.
                </p>
              )}
              {nfc.status === 'connected' && nfc.readersConnected === 0 && (
                <p className="text-xs text-amber-600">
                  Ingen kortleser funnet. Sjekk at kortleseren er tilkoblet via USB.
                </p>
              )}
            </div>

            {/* Manual Input Section */}
            <div className="space-y-2">
              <Label htmlFor="cardId">Eller skriv inn kort-ID manuelt</Label>
              <Input
                id="cardId"
                type="text"
                value={manualCardId}
                onChange={(e) => setManualCardId(e.target.value.toUpperCase())}
                placeholder="F.eks: 04:5A:B2:3C:D4:E5:F6"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Kort-ID er vanligvis 8, 14 eller 20 hexadesimale tegn
              </p>
            </div>

            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="student">Velg elev</Label>
              <Select value={selectedStudentId === '' ? '' : String(selectedStudentId)} onValueChange={(v) => setSelectedStudentId(v === '' ? '' : Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg en elev" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={String(student.id!)}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleAddCard}>
              Registrer kort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Card Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bytt elev for kort</DialogTitle>
            <DialogDescription>
              Velg ny elev for kortet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedCard && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Kort-ID:</p>
                <p className="font-mono font-medium">{formatCardUID(selectedCard.cardId)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newStudent">Velg ny elev</Label>
              <Select value={selectedStudentId === '' ? '' : String(selectedStudentId)} onValueChange={(v) => setSelectedStudentId(v === '' ? '' : Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg en elev" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={String(student.id!)}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleReassignCard}>
              Tilordne kort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
