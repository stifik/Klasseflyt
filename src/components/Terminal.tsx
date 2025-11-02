"use client";

import React, { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Reward } from '@/lib/types';
import { buyReward, givePoints, transferPoints, type RewardResult } from '@/lib/rewardService';
import { makeDonation } from '@/lib/communityRewardService';
import { CommunityRewardAchievedModal } from './CommunityRewardAchievedModal';
import PosView from './PosView';
import PodView from './PodView';
import TransferView from './TransferView';
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

type PoengsentralMode = 'idle' | 'pos' | 'pod' | 'transfer';
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
} | {
  type: 'transfer';
  amount: number;
  fee: number;
  totalCost: number;
  fromStudentId?: number;
  fromStudentName?: string;
  toStudentId?: number;
  toStudentName?: string;
} | {
  type: 'donation';
  rewardId: number;
  rewardTitle: string;
  amount?: number;
} | null;

const Poengsentral: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Bestem mode fra URL
  const getCurrentMode = (): PoengsentralMode => {
    if (pathname.includes('/poengsentral/pos')) return 'pos';
    if (pathname.includes('/poengsentral/pod')) return 'pod';
    if (pathname.includes('/poengsentral/transfer')) return 'transfer';
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

  // Add ref to track waiting state for WebSocket callback closure
  const isWaitingForCardRef = React.useRef(false);
  // Mirror activeTransaction in a ref so callbacks see the latest value (avoid closure staleness)
  const activeTransactionRef = React.useRef<ActiveTransaction | null>(activeTransaction);

  React.useEffect(() => {
    activeTransactionRef.current = activeTransaction;
  }, [activeTransaction]);

  // Hent studenter, belønninger og RFID-kort fra database
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const rewards = useLiveQuery(() => db.rewards.toArray()) || [];
  const rfidCards = useLiveQuery(() => db.rfidCards.toArray()) || [];
  const dbSettings = useLiveQuery(() => db.settings.get('userSettings'));

  const nfc = useCardScanner();

  // Get transfer fee percentage from settings
  const transferFeePercent = dbSettings?.rewardSystem?.transferFeePercent ?? 10;

  // Check if NFC is enabled in settings
  const nfcEnabled = dbSettings?.nfcEnabled ?? false;

  // WebSocket NFC setup for real-time card detection (only if enabled)
  const nfcWebSocket = useNFCWebSocket({
    enabled: nfcEnabled,
    autoConnect: nfcEnabled,
    onCardDetected: (card) => {
      console.log('✅ Card detected callback called:', card.uid);
      console.log('   isWaitingForCardRef.current:', isWaitingForCardRef.current);

      if (isWaitingForCardRef.current) {
        console.log('✅ Processing card:', card.uid);
        handleNFCCard(card.uid);
      } else {
        console.log('⚠️ Not waiting for card, ignoring');
      }
    },
    onError: (error, message) => {
      if (isWaitingForCardRef.current) {
        console.error('❌ WebSocket error:', error, message);
        soundEffects.play('error');
        setNfcStatus('error');
        setNfcMessage(message || 'Feil ved kortlesing');
        setNFCProcessing(false);
        setTimeout(() => {
          setNfcStatus('waiting');
        }, 3000);
      }
    }
  });

  // Handle NFC card scanning
  const handleNFCCard = useCallback(async (cardUid: string) => {
    console.log('🔵 handleNFCCard called with UID:', cardUid);
    
    // Temporarily disable card detection while processing
    isWaitingForCardRef.current = false;
    
    setNfcStatus('processing');
    setNfcMessage('Behandler...');
    setNFCProcessing(true);

    // Find RFID card (prefer in-memory list, but fallback to DB lookup if not present)
    let rfidCard = rfidCards.find(c => (c.cardId || '').toLowerCase() === cardUid.toLowerCase());
    console.log('🔍 Looking for card in-memory:', cardUid, 'Found:', rfidCard, 'Total cards:', rfidCards.length);

    if (!rfidCard) {
      // Sometimes the live query may not be populated yet or another tab just wrote the card.
      // Do a direct DB query (case-insensitive) as a fallback.
      try {
        const found = await db.rfidCards.filter(c => (c.cardId || '').toLowerCase() === cardUid.toLowerCase()).first();
        if (found) {
          rfidCard = found;
          console.log('🔍 Found card via direct DB lookup:', found);
        } else {
          console.log('🔍 Card not found in DB either:', cardUid);
        }
      } catch (err) {
        console.error('❌ Error querying DB for RFID card:', err);
      }
    }

    if (!rfidCard) {
      soundEffects.play('error');
      setNfcStatus('error');
      setNfcMessage(`Kort ${formatCardUID(cardUid)} er ikke registrert.`);
      setNFCProcessing(false);
      setTimeout(() => {
        isWaitingForCardRef.current = true; // Re-enable card detection
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
        isWaitingForCardRef.current = true; // Re-enable card detection
        setNfcStatus('waiting');
      }, 3000);
      return;
    }

    // Find student (prefer in-memory, fallback to DB lookup if necessary)
    let student = students.find(s => s.id === rfidCard.studentId);
    console.log('🔍 Looking for student with ID:', rfidCard.studentId, 'Type:', typeof rfidCard.studentId, 'Found (in-memory):', student);

    if (!student) {
      try {
        const foundStudent = await db.students.get(rfidCard.studentId as number);
        if (foundStudent) {
          student = foundStudent as any;
          console.log('🔍 Found student via direct DB lookup:', foundStudent);
        }
      } catch (err) {
        console.error('❌ Error querying DB for student:', err);
      }
    }

    if (!student) {
      soundEffects.play('error');
      setNfcStatus('error');
      setNfcMessage('Finner ikke eleven tilknyttet dette kortet.');
      setNFCProcessing(false);
      setTimeout(() => {
        isWaitingForCardRef.current = true; // Re-enable card detection
        setNfcStatus('waiting');
      }, 3000);
      return;
    }

    // Process transaction
    console.log('💳 Processing transaction for student:', student.id, 'with card:', rfidCard.cardId);
    await processTransaction(student.id!, rfidCard.cardId);
  }, [rfidCards, students]);

  // NFC card detection handler
  const handleCardDetected = useCallback(async (card: any) => {
    console.log('✅ Card detected:', card.uid);
    await handleNFCCard(card.uid);
  }, [handleNFCCard]);

  // Process transaction (both manual and NFC)
  const processTransaction = async (studentId: number, cardId?: string) => {
    const currentTransaction = activeTransactionRef.current;
    console.log('💰 processTransaction called - studentId:', studentId, 'cardId:', cardId, 'activeTransaction:', currentTransaction);

    if (!currentTransaction) return;

    let result: RewardResult;

    if (currentTransaction.type === 'reward') {
      // Check balance first for rewards
      let student = students.find(s => s.id === studentId);
      console.log('🔍 Finding student in processTransaction - searching for:', studentId, 'found (in-memory):', student);

      if (!student) {
        try {
          const found = await db.students.get(studentId);
          if (found) {
            student = found as any;
            console.log('🔍 Found student via direct DB lookup in processTransaction:', found);
          }
        } catch (err) {
          console.error('❌ Error querying DB for student in processTransaction:', err);
        }
      }

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

      if (currentPoints < currentTransaction.cost) {
        const message = `${student.name} har kun ${currentPoints} poeng, men ${currentTransaction.name} koster ${currentTransaction.cost} poeng.`;

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
      result = await buyReward(studentId, currentTransaction.id, cardId);
    } else if (currentTransaction.type === 'custom_action') {
      // Give points for custom action (now handles NFC metadata internally)
      result = await givePoints(studentId, currentTransaction.points, currentTransaction.name, cardId);
    } else if (currentTransaction.type === 'transfer') {
      // Handle transfer transaction
      if (!currentTransaction.fromStudentId) {
        // This is the first student (from)
        const student = students.find(s => s.id === studentId);
        if (student) {
          setActiveTransaction({
            ...currentTransaction,
            fromStudentId: studentId,
            fromStudentName: student.name,
          });
          if (cardId) {
            setNfcStatus('success');
            setNfcMessage(`✅ ${student.name} valgt som avsender. Klar for mottaker...`);
            setTimeout(() => {
              setNfcStatus('waiting');
              setNfcMessage('Tæpp kort for mottaker...');
              isWaitingForCardRef.current = true;
            }, 2000);
          } else {
            showNotification(`${student.name} valgt som avsender. Velg nå mottaker.`, 'success');
          }
        }
        return;
      } else if (!currentTransaction.toStudentId) {
        // This is the second student (to)
        if (studentId === currentTransaction.fromStudentId) {
          const message = 'Kan ikke overføre poeng til seg selv!';
          soundEffects.play('error');
          if (cardId) {
            setNfcStatus('error');
            setNfcMessage(message);
            setNFCProcessing(false);
            setTimeout(() => {
              setNfcStatus('waiting');
              setNfcMessage('Tæpp kort for mottaker...');
              isWaitingForCardRef.current = true;
            }, 3000);
          } else {
            showNotification(message, 'error');
          }
          return;
        }

        // Process the transfer
        result = await transferPoints(
          currentTransaction.fromStudentId,
          studentId,
          currentTransaction.amount,
          transferFeePercent,
          undefined, // fromCardId - not tracked separately in current flow
          cardId
        );
      } else {
        // Should not reach here
        return;
      }
    } else if (currentTransaction.type === 'points') {
      // Give points for predefined action (now handles NFC metadata internally)
      result = await givePoints(studentId, currentTransaction.amount, currentTransaction.description, cardId);
    } else if (currentTransaction.type === 'donation') {
      // Handle community reward donation
      // If no amount set yet, we need to ask for it (only happens in manual mode)
      if (!currentTransaction.amount) {
        // This shouldn't happen as we handle amount in the dialog, but just in case
        result = { success: false, message: 'Beløp mangler' };
      } else {
        const donationResult = await makeDonation(
          studentId,
          currentTransaction.rewardId,
          currentTransaction.amount,
          cardId
        );

        result = {
          success: donationResult.success,
          message: donationResult.message,
        };

        // Show celebration if reward was achieved
        if (donationResult.rewardAchieved && donationResult.rewardTitle) {
          const reward = await db.communityRewards.get(currentTransaction.rewardId);
          if (reward) {
            // Import and show achievement modal dynamically
            setTimeout(() => {
              // We'll handle this via a state in the UI instead
              showNotification(`🎉 MÅLET "${donationResult.rewardTitle}" ER OPPNÅDD! 🎉`, 'success');
            }, 1000);
          }
        }
      }
    } else {
      return;
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
          isWaitingForCardRef.current = true; // Re-enable card detection
          setNfcStatus('waiting');
          setNfcMessage('Klar for neste kort...');
        }, 2500);
      } else {
        soundEffects.play('error');
        setNfcStatus('error');
        setNfcMessage(result.message);
        setNFCProcessing(false);
        setTimeout(() => {
          isWaitingForCardRef.current = true; // Re-enable card detection
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

  const handleSelectCommunityReward = async (rewardId: number) => {
    // Load the community reward from database
    const communityReward = await db.communityRewards.get(rewardId);
    if (communityReward && communityReward.status === 'active') {
      setActiveTransaction({
        type: 'donation',
        rewardId: communityReward.id!,
        rewardTitle: communityReward.title,
      });
      setPaymentMode('manual'); // Default to manual
      setNfcStatus('idle');
    }
  };

  const handleStartNFCMode = async () => {
    setPaymentMode('nfc');
    setNfcStatus('waiting');
    setNfcMessage('Kobler til kortleser...');
    
    // Check WebSocket status
    if (nfcWebSocket.status === 'disconnected' || nfcWebSocket.status === 'error') {
      setNfcMessage('NFC Bridge Server er ikke tilkoblet. Sjekk at bridge-serveren kjører.');
      soundEffects.play('error');
      setTimeout(() => {
        setNfcStatus('idle');
        setPaymentMode('manual');
      }, 3000);
      return;
    }

    if (nfcWebSocket.readersConnected === 0) {
      setNfcMessage('Ingen kortleser funnet. Sjekk at kortleseren er tilkoblet.');
      soundEffects.play('error');
      setTimeout(() => {
        setNfcStatus('idle');
        setPaymentMode('manual');
      }, 3000);
      return;
    }

    // Start monitoring for cards
    isWaitingForCardRef.current = true;
    setNfcMessage('Klar! Tæpp kort for å betale...');
    nfcWebSocket.startMonitoring();
  };

  const handleCancelNFC = () => {
    isWaitingForCardRef.current = false;
    nfcWebSocket.stopMonitoring();
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

  const handleStartTransfer = (amount: number) => {
    const fee = Math.ceil(amount * (transferFeePercent / 100));
    const totalCost = amount + fee;

    setActiveTransaction({
      type: 'transfer',
      amount,
      fee,
      totalCost,
    });
    setPaymentMode('manual');
    setNfcStatus('idle');
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
              {activeTransaction.type === 'reward' ? '🛒' : activeTransaction.type === 'transfer' ? '💸' : '⭐'}
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
            ) : activeTransaction.type === 'transfer' ? (
              <React.Fragment>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Overfør poeng
                </h2>
                <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 mb-4">
                  <h3 className="text-xl font-semibold text-purple-900 dark:text-purple-100">
                    {activeTransaction.amount} poeng
                  </h3>
                  <p className="text-purple-700 dark:text-purple-300 text-sm">
                    Kostnad: {activeTransaction.totalCost} poeng (inkl. {activeTransaction.fee} poeng gebyr)
                  </p>
                  {activeTransaction.fromStudentName && (
                    <p className="text-purple-600 dark:text-purple-400 text-sm mt-2">
                      Fra: {activeTransaction.fromStudentName}
                    </p>
                  )}
                  {!activeTransaction.fromStudentId && (
                    <p className="text-purple-600 dark:text-purple-400 text-sm mt-2">
                      Velg avsender (elev som betaler)
                    </p>
                  )}
                  {activeTransaction.fromStudentId && !activeTransaction.toStudentId && (
                    <p className="text-purple-600 dark:text-purple-400 text-sm mt-2">
                      Velg mottaker (elev som får poeng)
                    </p>
                  )}
                </div>
              </React.Fragment>
            ) : activeTransaction.type === 'points' ? (
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
            ) : null}
          </div>

          {/* NFC Mode */}
          {nfcEnabled && paymentMode === 'nfc' && (
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
          {paymentMode === 'manual' && activeTransaction?.type !== 'donation' && (
            <ManualPaymentModal
              students={students}
              rfidCards={rfidCards}
              isNFCSupported={nfcEnabled && nfc.isSupported}
              onNFCMode={handleStartNFCMode}
              onManualSelect={handleManualStudentSelect}
              onCancel={() => {
                setActiveTransaction(null);
                setPaymentMode('manual');
              }}
              transferMode={
                activeTransaction?.type === 'transfer'
                  ? !activeTransaction.fromStudentId
                    ? 'from'
                    : 'to'
                  : null
              }
              fromStudentId={
                activeTransaction?.type === 'transfer'
                  ? activeTransaction.fromStudentId
                  : undefined
              }
            />
          )}

          {/* Donation Dialog */}
          {paymentMode === 'manual' && activeTransaction?.type === 'donation' && (
            <DonationDialogWrapper
              activeTransaction={activeTransaction}
              students={students}
              onConfirm={async (studentId: number, amount: number) => {
                // Set the amount in the transaction
                const updatedTransaction = {
                  ...activeTransaction,
                  amount,
                };
                // Update both state and ref
                setActiveTransaction(updatedTransaction);
                activeTransactionRef.current = updatedTransaction;

                // Process the donation directly with the amount
                const result = await makeDonation(
                  studentId,
                  activeTransaction.rewardId,
                  amount
                );

                if (result.success) {
                  soundEffects.play('success');
                  showNotification(result.message, 'success');

                  // Show celebration if goal achieved
                  if (result.rewardAchieved) {
                    setTimeout(() => {
                      showNotification(`🎉 MÅLET "${result.rewardTitle}" ER OPPNÅDD! 🎉`, 'success');
                    }, 1000);
                  }
                } else {
                  soundEffects.play('error');
                  showNotification(result.message, 'error');
                }

                // Reset transaction
                setActiveTransaction(null);
                setPaymentMode('manual');
              }}
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
    // POS mode - vis belønninger (uten ekstra tittellinje for bedre vertikal plass)
    content = (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-6">
          <PosView
            rewards={rewards}
            onSelectReward={handleSelectReward}
            onSelectCommunityReward={handleSelectCommunityReward}
          />
          <button
            className="w-full py-3 px-6 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg shadow-md transition-colors"
            onClick={() => router.push('/poengsentral')}
          >
            Tilbake til Poengsentral
          </button>
        </div>
      </div>
    );
  } else if (mode === 'pod') {
    // POD mode - vis handlinger (uten ekstra tittellinje for bedre vertikal plass)
    content = (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-6">
          <PodView onSelectAction={handleSelectAction} />
          <button
            className="w-full py-3 px-6 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg shadow-md transition-colors"
            onClick={() => router.push('/poengsentral')}
          >
            Tilbake til Poengsentral
          </button>
        </div>
      </div>
    );
  } else if (mode === 'transfer') {
    // Transfer mode - vis overføringsvisning
    content = (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-6">
          <TransferView
            transferFeePercent={transferFeePercent}
            onStartTransfer={handleStartTransfer}
          />
          <button
            className="w-full py-3 px-6 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-lg shadow-md transition-colors"
            onClick={() => router.push('/poengsentral')}
          >
            Tilbake til Poengsentral
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
            🏪 Poengsentral
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Rask arbeidsflyt for masse-transaksjoner
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* POS-knapp */}
          <button
            onClick={() => router.push('/poengsentral/pos')}
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
            onClick={() => router.push('/poengsentral/pod')}
            className="group bg-green-500 hover:bg-green-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold mb-2">Handlinger</h2>
            <p className="text-green-100 mb-3">Point of Deposit (POD)</p>
            <p className="text-sm text-green-200">
              Gi poeng for positive handlinger
            </p>
          </button>

          {/* Transfer-knapp */}
          <button
            onClick={() => router.push('/poengsentral/transfer')}
            className="group bg-purple-500 hover:bg-purple-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <div className="text-6xl mb-4">💸</div>
            <h2 className="text-2xl font-bold mb-2">Overfør</h2>
            <p className="text-purple-100 mb-3">Point Transfer</p>
            <p className="text-sm text-purple-200">
              Overfør poeng mellom elever
            </p>
          </button>
        </div>

        {nfcEnabled && (
          <div className="text-center mt-8">
            {typeof window !== 'undefined' && nfc.isSupported && rfidCards.length > 0 ? (
              <p className="text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                NFC-støtte aktivert ({rfidCards.length} kort registrert)
              </p>
            ) : typeof window !== 'undefined' && !nfc.isSupported ? (
              <p className="text-gray-500 dark:text-gray-400">
                💡 Start NFC Bridge Server for kortlesing
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                💡 Registrer RFID-kort i innstillinger
              </p>
            )}
          </div>
        )}
        
        {/* ActivityFeed og RewardDashboard side ved side */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <div className="min-w-0 overflow-hidden">
            <ActivityFeed />
          </div>
          <div className="min-w-0 overflow-hidden">
            <RewardDashboard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
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
      {nfcEnabled && nfc.isProcessing && nfcStatus === 'processing' && (
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
      {nfcEnabled && showSuccessOverlay && (
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

// Wrapper component for donation dialog with student selection
function DonationDialogWrapper({
  activeTransaction,
  students,
  onConfirm,
  onCancel,
}: {
  activeTransaction: Extract<ActiveTransaction, { type: 'donation' }>;
  students: any[];
  onConfirm: (studentId: number, amount: number) => void;
  onCancel: () => void;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showDonationDialog, setShowDonationDialog] = useState(false);
  const [communityReward, setCommunityReward] = useState<any>(null);

  // Load community reward
  React.useEffect(() => {
    const loadReward = async () => {
      const reward = await db.communityRewards.get(activeTransaction.rewardId);
      setCommunityReward(reward);
    };
    loadReward();
  }, [activeTransaction.rewardId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Import donation dialog dynamically
  const [DonationDialog, setDonationDialog] = useState<any>(null);

  React.useEffect(() => {
    import('./CommunityRewardDonationDialog').then((mod) => {
      setDonationDialog(() => mod.CommunityRewardDonationDialog);
    });
  }, []);

  if (!DonationDialog) {
    return null;
  }

  return (
    <>
      {/* Student Selection Modal */}
      {!selectedStudentId && (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Velg elev som skal donere</DialogTitle>
              <DialogDescription>
                Donasjon til: <strong>{activeTransaction.rewardTitle}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
              {students.map((student) => (
                <Button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentId(student.id!);
                    setShowDonationDialog(true);
                  }}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                >
                  <div className="font-semibold">{student.name}</div>
                  <div className="text-xs text-gray-500">
                    {(student.points || 0).toLocaleString()} poeng
                  </div>
                </Button>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={onCancel}>
                Avbryt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Donation Amount Dialog */}
      {DonationDialog && (
        <DonationDialog
          open={showDonationDialog}
          onOpenChange={(open: boolean) => {
            setShowDonationDialog(open);
            if (!open) {
              setSelectedStudentId(null);
            }
          }}
          reward={communityReward}
          student={selectedStudent}
          onConfirm={(amount: number) => {
            if (selectedStudentId) {
              onConfirm(selectedStudentId, amount);
            }
          }}
        />
      )}
    </>
  );
}

export default Poengsentral;