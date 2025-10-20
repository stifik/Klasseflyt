"use client";

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Reward, Student } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ShoppingCart,
  Wallet,
  Scan
} from 'lucide-react';
import { useCardScanner } from '@/hooks/useNFCReader';
import { formatCardUID } from '@/lib/nfcReader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { updatePricesAfterPurchase } from '@/lib/rewardService';
import { v4 as uuidv4 } from 'uuid';

type POSState = 'idle' | 'reward-selected' | 'scanning' | 'processing' | 'success' | 'error';

export default function RewardPOS() {
  const [posState, setPosState] = useState<POSState>('idle');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [message, setMessage] = useState('');
  const [showTestMode, setShowTestMode] = useState(false);
  const [testCardId, setTestCardId] = useState('');

  const rewards = useLiveQuery(() => db.rewards.toArray(), []) || [];
  const students = useLiveQuery(() => db.students.toArray(), []) || [];
  const rfidCards = useLiveQuery(() => db.rfidCards.toArray(), []) || [];

  const nfc = useCardScanner();

  // Select a reward to purchase
  const handleSelectReward = (reward: Reward) => {
    setSelectedReward(reward);
    setPosState('reward-selected');
    setMessage(`Valgt: ${reward.name} for ${reward.currentPrice} poeng. Tæpp kort for å betale.`);
  };

  // Start listening for NFC card
  const handleStartScan = async () => {
    if (!selectedReward) {
      setMessage('Vennligst velg en belønning først');
      return;
    }

    setPosState('scanning');
    setMessage('Venter på kort...');

    // In development/testing mode without NFC hardware,
    // we can simulate a card scan after a short delay
    const card = await nfc.scanCard();

    if (!card) {
      setPosState('error');
      setMessage(nfc.error || 'Kunne ikke lese kort. Prøv igjen.');
      setTimeout(() => setPosState('reward-selected'), 3000);
      return;
    }

    // Find the RFID card in database
    const rfidCard = await db.rfidCards.where('cardId').equals(card.uid).first();

    if (!rfidCard) {
      setPosState('error');
      setMessage(`Kortet (${formatCardUID(card.uid)}) er ikke registrert i systemet.`);
      setTimeout(() => setPosState('reward-selected'), 3000);
      return;
    }

    if (rfidCard.status === 'blocked') {
      setPosState('error');
      setMessage('Dette kortet er blokkert. Kontakt lærer.');
      setTimeout(() => setPosState('reward-selected'), 3000);
      return;
    }

    // Find the student
    const student = students.find(s => s.id === rfidCard.studentId);

    if (!student) {
      setPosState('error');
      setMessage('Finner ikke eleven tilknyttet dette kortet.');
      setTimeout(() => setPosState('reward-selected'), 3000);
      return;
    }

    setScannedStudent(student);

    // Process the purchase
    await processPurchase(student, rfidCard.cardId);
  };

  // Process the actual purchase
  const processPurchase = async (student: Student, cardId: string) => {
    if (!selectedReward) return;

    setPosState('processing');
    setMessage('Behandler kjøp...');

    const currentPoints = student.points || 0;
    const price = selectedReward.currentPrice;

    // Check if student has enough points
    if (currentPoints < price) {
      setPosState('error');
      setMessage(`${student.name} har kun ${currentPoints} poeng, men ${selectedReward.name} koster ${price} poeng.`);
      setTimeout(() => {
        setPosState('idle');
        setSelectedReward(null);
        setScannedStudent(null);
      }, 4000);
      return;
    }

    try {
      // Deduct points from student
      await db.students.update(student.id!, {
        points: currentPoints - price
      });

      // Add transaction record
      await db.transactions.add({
        studentId: student.id!,
        date: new Date(),
        pointsChange: -price,
        description: `Kjøp: ${selectedReward.name}`,
        paymentMethod: 'nfc',
        cardId: cardId
      });

      // Add purchased reward
      await db.purchasedRewards.add({
        purchaseId: uuidv4(),
        studentId: student.id!,
        rewardId: selectedReward.id,
        rewardName: selectedReward.name,
        purchaseDate: new Date(),
        status: 'unused'
      });

      // Update last used for card
      const card = await db.rfidCards.where('cardId').equals(cardId).first();
      if (card?.id) {
        await db.rfidCards.update(card.id, {
          lastUsed: new Date()
        });
      }

      // Update prices (børs system)
      await updatePricesAfterPurchase(selectedReward.id);

      setPosState('success');
      setMessage(`✅ Kjøp vellykket! ${student.name} har ${currentPoints - price} poeng igjen.`);

      // Reset after 3 seconds
      setTimeout(() => {
        setPosState('idle');
        setSelectedReward(null);
        setScannedStudent(null);
        setMessage('');
      }, 3000);

    } catch (error) {
      setPosState('error');
      setMessage('Noe gikk galt under kjøpet. Prøv igjen.');
      console.error('Purchase error:', error);
      
      setTimeout(() => {
        setPosState('idle');
        setSelectedReward(null);
        setScannedStudent(null);
      }, 3000);
    }
  };

  // Cancel current transaction
  const handleCancel = () => {
    setPosState('idle');
    setSelectedReward(null);
    setScannedStudent(null);
    setMessage('');
    setShowTestMode(false);
    setTestCardId('');
  };

  // Test mode: Simulate card scan
  const handleTestScan = async () => {
    if (!selectedReward) {
      setMessage('Vennligst velg en belønning først');
      return;
    }

    if (!testCardId) {
      setMessage('Vennligst velg et kort for testing');
      return;
    }

    setPosState('scanning');
    setMessage('Simulerer kort-scanning...');

    // Simulate a short delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find the RFID card in database
    const rfidCard = await db.rfidCards.where('cardId').equals(testCardId).first();

    if (!rfidCard) {
      setPosState('error');
      setMessage('Fant ikke kortet i systemet.');
      setTimeout(() => setPosState('reward-selected'), 3000);
      return;
    }

    if (rfidCard.status === 'blocked') {
      setPosState('error');
      setMessage('Dette kortet er blokkert.');
      setTimeout(() => setPosState('reward-selected'), 3000);
      return;
    }

    const student = students.find(s => s.id === rfidCard.studentId);

    if (!student) {
      setPosState('error');
      setMessage('Finner ikke eleven tilknyttet dette kortet.');
      setTimeout(() => setPosState('reward-selected'), 3000);
      return;
    }

    setScannedStudent(student);
    await processPurchase(student, rfidCard.cardId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                POS - Belønningskjøp med NFC
              </CardTitle>
              <CardDescription>
                Velg belønning og la eleven tæppe sitt RFID-kort
              </CardDescription>
            </div>
            {selectedReward && posState !== 'success' && (
              <Button variant="outline" onClick={handleCancel}>
                Avbryt
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          {message && (
            <Alert className={
              posState === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
              posState === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
              posState === 'scanning' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
              ''
            }>
              {posState === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {posState === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
              {posState === 'scanning' && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
              {posState === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
              {(posState === 'idle' || posState === 'reward-selected') && <AlertCircle className="h-5 w-5" />}
              
              <div className="ml-2">
                <AlertTitle>
                  {posState === 'success' && 'Kjøp fullført!'}
                  {posState === 'error' && 'Kjøp avvist'}
                  {posState === 'scanning' && 'Venter på kort...'}
                  {posState === 'processing' && 'Behandler...'}
                  {(posState === 'idle' || posState === 'reward-selected') && 'Status'}
                </AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Student Info */}
          {scannedStudent && (
            <div className="p-4 border rounded-lg bg-accent/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{scannedStudent.name}</p>
                  <p className="text-sm text-muted-foreground">Saldo: {scannedStudent.points || 0} poeng</p>
                </div>
                <Wallet className="w-8 h-8 text-primary" />
              </div>
            </div>
          )}

          {/* Selected Reward */}
          {selectedReward && posState !== 'success' && (
            <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="mb-2">Valgt belønning</Badge>
                  <p className="font-semibold text-lg">{selectedReward.name}</p>
                  <p className="text-2xl font-bold text-primary">{selectedReward.currentPrice} poeng</p>
                </div>
                {selectedReward.emoji && (
                  <span className="text-5xl">{selectedReward.emoji}</span>
                )}
              </div>

              {posState === 'reward-selected' && (
                <div className="space-y-2 mt-4">
                  <Button 
                    onClick={handleStartScan}
                    className="w-full"
                    size="lg"
                    disabled={!nfc.isSupported}
                  >
                    <Scan className="w-5 h-5 mr-2" />
                    Tæpp kort for å betale
                  </Button>

                  {/* Test Mode Toggle */}
                  <Button 
                    onClick={() => setShowTestMode(!showTestMode)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {showTestMode ? 'Skjul test-modus' : '🧪 Test-modus (uten NFC-leser)'}
                  </Button>

                  {/* Test Mode Card Selector */}
                  {showTestMode && (
                    <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20 space-y-2">
                      <Label htmlFor="test-card" className="text-xs">Velg kort for testing:</Label>
                      <Select value={testCardId} onValueChange={setTestCardId}>
                        <SelectTrigger id="test-card">
                          <SelectValue placeholder="Velg et registrert kort" />
                        </SelectTrigger>
                        <SelectContent>
                          {rfidCards.filter(c => c.status === 'active').map((card) => {
                            const student = students.find(s => s.id === card.studentId);
                            return (
                              <SelectItem key={card.id} value={card.cardId}>
                                {student?.name || 'Ukjent'} - {formatCardUID(card.cardId)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handleTestScan}
                        className="w-full"
                        disabled={!testCardId}
                      >
                        Simuler kort-scanning
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reward Selection Grid */}
          {posState === 'idle' && (
            <div>
              <h3 className="font-semibold mb-3">Velg belønning:</h3>
              {rewards.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Ingen belønninger tilgjengelig. Opprett belønninger først.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {rewards.map((reward) => (
                    <button
                      key={reward.id}
                      onClick={() => handleSelectReward(reward)}
                      className="p-4 border-2 rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{reward.emoji || '🎁'}</span>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">{reward.currentPrice}</p>
                          <p className="text-xs text-muted-foreground">poeng</p>
                        </div>
                      </div>
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {reward.name}
                      </p>
                      {reward.currentPrice !== reward.basePrice && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Grunnpris: {reward.basePrice}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NFC Support Warning */}
          {!nfc.isSupported && (
            <Alert className="border-orange-500">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>NFC ikke støttet</AlertTitle>
              <AlertDescription>
                Denne nettleseren støtter ikke NFC-lesing. For å bruke denne funksjonen, bruk en kompatibel nettleser eller enhet.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
