"use client";

import React, { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Reward } from '@/lib/types';
import { buyReward, givePoints, type RewardResult } from '@/lib/rewardService';
import PosView from './PosView';
import PodView from './PodView';
import ActivityFeed from './ActivityFeed';
import RewardDashboard from './RewardDashboard';
import { NFCPaymentModal } from './NFCPaymentModal';
import { ManualPaymentModal } from './ManualPaymentModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCardScanner } from '@/hooks/useNFCReader';
import { useNFCWebSocket } from '@/hooks/useNFCWebSocket';
import { formatCardUID, setProcessing as setNFCProcessing } from '@/lib/nfcReader';
import { soundEffects } from '@/lib/soundEffects';
import { Loader2, CheckCircle2 } from 'lucide-react';

type TerminalMode = 'idle' | 'pos' | 'pod';
type PaymentMode = 'manual' | 'nfc';
type NFCStatus = 'idle' | 'waiting' | 'processing' | 'success' | 'error';

type ActiveTransaction = { 
  type: 'reward'; 
  id: number; 
  name: string; 
  cost: number; 
} | { 
  type: 'points'; 
  amount: number; 
  description: string; 
} | {
  type: 'custom_action';
  name: string;
  points: number;
} | null;

const Terminal: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Bestem mode fra URL
  const getCurrentMode = (): TerminalMode => {
    if (pathname.includes('/terminal/pos')) return 'pos';
    if (pathname.includes('/terminal/pod')) return 'pod';
    return 'idle';
  };
  
  const mode = getCurrentMode();
  
  const [activeTransaction, setActiveTransaction] = useState<ActiveTransaction>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('manual');
  const [nfcStatus, setNfcStatus] = useState<NFCStatus>('idle');
  const [nfcMessage, setNfcMessage] = useState('');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  
  // Custom action dialog state
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customActionName, setCustomActionName] = useState('');
  const [customActionPoints, setCustomActionPoints] = useState('');

  // Hent studenter, belønninger og RFID-kort fra database
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const rewards = useLiveQuery(() => db.rewards.toArray()) || [];
  const rfidCards = useLiveQuery(() => db.rfidCards.toArray()) || [];

  const nfc = useCardScanner();

  // Handle NFC card scanning
  const handleNFCCard = useCallback(async (cardUid: string) => {
    console.log('🔵 handleNFCCard called with UID:', cardUid);
    setNfcStatus('processing');
    setNfcMessage('Behandler...');
    setNFCProcessing(true);

    // Find RFID card
    const rfidCard = rfidCards.find(c => c.cardId === cardUid);
    console.log('🔍 Looking for card:', cardUid, 'Found:', rfidCard, 'Total cards:', rfidCards.length);

    if (!rfidCard) {
      soundEffects.play('error');
      setNfcStatus('error');
      setNfcMessage(`Kort ${formatCardUID(cardUid)} er ikke registrert.`);
      setNFCProcessing(false);
      setTimeout(() => {
        setNfcStatus('waiting');
      }, 3000);
      return;
    }

    if (rfidCard.status === 'blocked') {
      soundEffects.play('error');
      setNfcStatus('error');
      setNfcMessage('Dette kortet er blokkert. Kontakt lærer.');
      setNFCProcessing(false);
      setTimeout(() => {
        setNfcStatus('waiting');
      }, 3000);
      return;
    }

    // Find student
    const student = students.find(s => s.id === rfidCard.studentId);
    console.log('🔍 Looking for student with ID:', rfidCard.studentId, 'Type:', typeof rfidCard.studentId, 'Found:', student);
    
    if (!student) {
      soundEffects.play('error');
      setNfcStatus('error');
      setNfcMessage('Finner ikke eleven tilknyttet dette kortet.');
      setNFCProcessing(false);
      setTimeout(() => {
        setNfcStatus('waiting');
      }, 3000);
      return;
    }

    // Process transaction
    console.log('💳 Processing transaction for student:', student.id, 'with card:', rfidCard.cardId);
    await processTransaction(student.id!, rfidCard.cardId);
  }, [rfidCards, students, activeTransaction]);

  // WebSocket NFC handler - automatically called when card is detected
  const handleCardDetected = useCallback(async (card: any) => {
    console.log('✅ Card detected via WebSocket:', card.uid);
    await handleNFCCard(card.uid);
  }, [handleNFCCard]);

  // Use WebSocket for real-time NFC events (replaces polling)
  const nfcWebSocket = useNFCWebSocket({
    enabled: true,
    autoConnect: true,
    autoMonitor: false, // We'll control monitoring manually
    onCardDetected: handleCardDetected,
    onError: (error, message) => {
      console.error('❌ NFC WebSocket error:', error, message);
    }
  });

  // Start/stop monitoring when NFC status changes
  React.useEffect(() => {
    if (nfcStatus === 'waiting' && activeTransaction) {
      console.log('🔌 Starting NFC monitoring...');
      nfcWebSocket.startMonitoring();
    } else {
      console.log('🔌 Stopping NFC monitoring...');
      nfcWebSocket.stopMonitoring();
    }
  }, [nfcStatus, activeTransaction, nfcWebSocket.startMonitoring, nfcWebSocket.stopMonitoring]);

  // Process transaction (both manual and NFC)
  const processTransaction = async (studentId: number, cardId?: string) => {
    console.log('💰 processTransaction called - studentId:', studentId, 'cardId:', cardId, 'activeTransaction:', activeTransaction);

    if (!activeTransaction) return;

    let result: RewardResult;

    if (activeTransaction.type === 'reward') {
      // Check balance first for rewards
      const student = students.find(s => s.id === studentId);
      console.log('🔍 Finding student in processTransaction - searching for:', studentId, 'found:', student);

      if (!student || !student.name) {
        const message = 'Kunne ikke finne eleven. Vennligst prøv igjen.';
        soundEffects.play('error');
        if (cardId) {
          setNfcStatus('error');
          setNfcMessage(message);
          setNFCProcessing(false);
          setTimeout(() => {
            setNfcStatus('waiting');
          }, 4000);
        } else {
          showNotification(message, 'error');
          setActiveTransaction(null);
        }
        return;
      }

      const currentPoints = student.points || 0;

      if (currentPoints < activeTransaction.cost) {
        const message = `${student.name} har kun ${currentPoints} poeng, men ${activeTransaction.name} koster ${activeTransaction.cost} poeng.`;

        soundEffects.play('error');

        if (cardId) {
          setNfcStatus('error');
          setNfcMessage(message);
          setNFCProcessing(false);
          setTimeout(() => {
            setNfcStatus('waiting');
          }, 4000);
        } else {
          showNotification(message, 'error');
          setActiveTransaction(null);
        }
        return;
      }

      // Buy reward (now handles all NFC metadata internally)
      result = await buyReward(studentId, activeTransaction.id, cardId);
    } else if (activeTransaction.type === 'custom_action') {
      // Give points for custom action (now handles NFC metadata internally)
      result = await givePoints(studentId, activeTransaction.points, activeTransaction.name, cardId);
    } else {
      // Give points for predefined action (now handles NFC metadata internally)
      result = await givePoints(studentId, activeTransaction.amount, activeTransaction.description, cardId);
    }

    // Show result
    if (cardId) {
      if (result.success) {
        const student = students.find(s => s.id === studentId);
        
        // SUCCESS - Play sound and show overlay
        soundEffects.play('success');
        setNfcStatus('success');
        setNfcMessage(`✅ ${student?.name}: ${result.message}`);
        setShowSuccessOverlay(true);
        
        // Hide overlay after 2 seconds
        setTimeout(() => {
          setShowSuccessOverlay(false);
          setNFCProcessing(false);
        }, 2000);
        
        // Reset to waiting for next card
        setTimeout(() => {
          setNfcStatus('waiting');
          setNfcMessage('Klar for neste kort...');
        }, 2500);
      } else {
        soundEffects.play('error');
        setNfcStatus('error');
        setNfcMessage(result.message);
        setNFCProcessing(false);
        setTimeout(() => {
          setNfcStatus('waiting');
        }, 3000);
      }
    } else {
      if (result.success) {
        soundEffects.play('success');
      } else {
        soundEffects.play('error');
      }
      showNotification(result.message, result.success ? 'success' : 'error');
      setActiveTransaction(null);
      setPaymentMode('manual');
    }
  };

  // Vis notifikasjon i 3 sekunder
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectReward = (rewardId: number) => {
    const reward = rewards.find((r: Reward) => r.id === rewardId);
    if (reward) {
      setActiveTransaction({ 
        type: 'reward', 
        id: reward.id, 
        name: reward.name, 
        cost: reward.currentPrice || reward.cost 
      });
      setPaymentMode('manual'); // Default to manual
      setNfcStatus('idle');
    }
  };

  const handleStartNFCMode = async () => {
    setPaymentMode('nfc');
    setNfcStatus('waiting');
    setNfcMessage('Kobler til kortleser...');
    
    // Ensure connection is established before scanning
    try {
      await nfc.connect();
      setNfcMessage('Klar! Tæpp kort for å betale...');
    } catch (error) {
      console.error('Failed to connect to NFC reader:', error);
      setNfcMessage('Klar! Tæpp kort for å betale...');
    }
  };

  const handleCancelNFC = () => {
    setNfcStatus('idle');
    setPaymentMode('manual');
  };

  const handleCustomActionInitiation = () => {
    setShowCustomDialog(true);
  };

  const handleCustomDialogSubmit = () => {
    if (!customActionName.trim()) {
      showNotification('Vennligst skriv inn en beskrivelse', 'error');
      return;
    }
    
    const points = parseInt(customActionPoints, 10);
    if (isNaN(points) || points <= 0) {
      showNotification('Ugyldig tall for poeng', 'error');
      return;
    }
    
    console.log('🎯 Setter custom_action transaction:', { name: customActionName, points, type: typeof points });
    setActiveTransaction({ type: 'custom_action', name: customActionName, points });
    setShowCustomDialog(false);
    setCustomActionName('');
    setCustomActionPoints('');
  };

  const handleSelectAction = (actionId: number, actionName: string, points: number, description: string) => {
    if (actionId === 0) {
      // Egendefinert handling - trigger prompt-basert input
      handleCustomActionInitiation();
    } else {
      // Forhåndsdefinert handling
      setActiveTransaction({ 
        type: 'points', 
        amount: points, 
        description: actionName // Bruk bare handlingsnavnet som beskrivelse
      });
    }
  };

  const handleManualStudentSelect = async (studentId: number) => {
    if (!studentId || !activeTransaction) return;

    const student = students.find(s => s.id === studentId);
    console.log('Manual select - studentId:', studentId, 'found:', student);

    if (!student || !student.name) {
      showNotification(`Kunne ikke finne eleven med ID: ${studentId}. Prøv igjen.`, 'error');
      return;
    }

    await processTransaction(studentId);
  };

  let content;
  if (activeTransaction) {
    content = (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">
              {activeTransaction.type === 'reward' ? '🛒' : '⭐'}
            </div>
            {activeTransaction.type === 'reward' ? (
              <React.Fragment>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Valgt belønning
                </h2>
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 mb-4">
                  <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                    {activeTransaction.name}
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 font-medium">
                    {activeTransaction.cost} poeng
                  </p>
                </div>
              </React.Fragment>
            ) : activeTransaction.type === 'custom_action' ? (
              <React.Fragment>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Egendefinert handling
                </h2>
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 mb-4">
                  <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                    +{activeTransaction.points} poeng
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    {activeTransaction.name}
                  </p>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Tildel poeng
                </h2>
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 mb-4">
                  <h3 className="text-xl font-semibold text-green-900 dark:text-green-100">
                    +{activeTransaction.amount} poeng
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    {activeTransaction.description}
                  </p>
                </div>
              </React.Fragment>
            )}
          </div>

          {/* NFC Mode */}
          {paymentMode === 'nfc' && (
            <NFCPaymentModal
              nfcStatus={nfcStatus}
              nfcMessage={nfcMessage}
              onCancel={handleCancelNFC}
              onAbort={() => {
                setActiveTransaction(null);
                setPaymentMode('manual');
                setNfcStatus('idle');
              }}
            />
          )}

          {/* Manual Mode */}
          {paymentMode === 'manual' && (
            <ManualPaymentModal
              students={students}
              rfidCards={rfidCards}
              isNFCSupported={nfc.isSupported}
              onNFCMode={handleStartNFCMode}
              onManualSelect={handleManualStudentSelect}
              onCancel={() => {
                setActiveTransaction(null);
                setPaymentMode('manual');
              }}
            />
          )}
        </div>
      </div>
    );
  } else if (mode === 'pos') {
    // POS mode - vis belønninger
    content = (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🛒 Butikk</h2>
            <p className="text-gray-600 dark:text-gray-400">Velg en belønning</p>
          </div>
          <PosView rewards={rewards} onSelectReward={handleSelectReward} />
          <button
            className="w-full py-3 px-6 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg shadow-md transition-colors"
            onClick={() => router.push('/terminal')}
          >
            Tilbake til Terminal
          </button>
        </div>
      </div>
    );
  } else if (mode === 'pod') {
    // POD mode - vis handlinger
    content = (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">⭐ Handlinger</h2>
            <p className="text-gray-600 dark:text-gray-400">Velg en positiv handling</p>
          </div>
          <PodView onSelectAction={handleSelectAction} />
          <button
            className="w-full py-3 px-6 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg shadow-md transition-colors"
            onClick={() => router.push('/terminal')}
          >
            Tilbake til Terminal
          </button>
        </div>
      </div>
    );
  } else {
    // Idle mode - vis hovedmeny
    content = (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🏪 Terminal
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Rask arbeidsflyt for masse-transaksjoner
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* POS-knapp */}
          <button 
            onClick={() => router.push('/terminal/pos')}
            className="group bg-blue-500 hover:bg-blue-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold mb-2">Butikk</h2>
            <p className="text-blue-100 mb-3">Point of Sale (POS)</p>
            <p className="text-sm text-blue-200">
              Selg belønninger til elever
            </p>
          </button>

          {/* POD-knapp */}
          <button 
            onClick={() => router.push('/terminal/pod')}
            className="group bg-green-500 hover:bg-green-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold mb-2">Handlinger</h2>
            <p className="text-green-100 mb-3">Point of Deposit (POD)</p>
            <p className="text-sm text-green-200">
              Gi poeng for positive handlinger
            </p>
          </button>
        </div>

        <div className="text-center mt-8">
          {nfc.isSupported && rfidCards.length > 0 ? (
            <p className="text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              NFC-støtte aktivert ({rfidCards.length} kort registrert)
            </p>
          ) : !nfc.isSupported ? (
            <p className="text-gray-500 dark:text-gray-400">
              💡 Start NFC Bridge Server for kortlesing
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              💡 Registrer RFID-kort i innstillinger
            </p>
          )}
        </div>
        
        {/* ActivityFeed og RewardDashboard side ved side */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ActivityFeed />
          </div>
          <div>
            <RewardDashboard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Notifikasjon */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}
      
      {/* Custom Action Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Egendefinert poeng-tildeling</DialogTitle>
            <DialogDescription>
              Gi poeng for en spesiell handling som ikke er på listen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-name">Beskriv handlingen</Label>
              <Input
                id="action-name"
                placeholder="f.eks. Ryddet klasserommet"
                value={customActionName}
                onChange={(e) => setCustomActionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customActionName && customActionPoints) {
                    handleCustomDialogSubmit();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-points">Antall poeng</Label>
              <Input
                id="action-points"
                type="number"
                placeholder="f.eks. 20"
                min="1"
                value={customActionPoints}
                onChange={(e) => setCustomActionPoints(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customActionName && customActionPoints) {
                    handleCustomDialogSubmit();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomDialog(false);
                setCustomActionName('');
                setCustomActionPoints('');
              }}
            >
              Avbryt
            </Button>
            <Button onClick={handleCustomDialogSubmit}>
              Bekreft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Processing Overlay - shown while NFC transaction is being processed */}
      {nfc.isProcessing && nfcStatus === 'processing' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-2xl max-w-md">
            <Loader2 className="h-20 w-20 text-blue-600 animate-spin mx-auto mb-6" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Prosesserer...
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Ikke fjern kortet
            </p>
          </div>
        </div>
      )}

      {/* Success Overlay - shown for 2 seconds after successful transaction */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-green-600/95 flex items-center justify-center z-50 animate-fade-in">
          <div className="text-center text-white px-8">
            <div className="text-9xl mb-6 animate-bounce">✓</div>
            <p className="text-4xl font-bold mb-3">Kjøp vellykket!</p>
            <p className="text-2xl opacity-90">Du kan fjerne kortet nå</p>
            <p className="text-xl opacity-75 mt-4">Klar for neste elev...</p>
          </div>
        </div>
      )}
      
      {content}
    </div>
  );
};

export default Terminal;