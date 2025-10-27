/**
 * React hooks for NFC/RFID functionality
 */

import { useState, useEffect, useCallback } from 'react';
import {
  connectReader,
  readCard,
  disconnectReader,
  listenForCards,
  isNFCSupported,
  isWebHIDSupported,
  setProcessing,
  resetCooldown,
  type NFCCard,
  type NFCReaderStatus
} from '@/lib/nfcReader';

export interface UseNFCReaderReturn {
  status: NFCReaderStatus;
  error: string | null;
  lastCard: NFCCard | null;
  isSupported: boolean;
  isProcessing: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  scan: () => Promise<NFCCard | null>;
  startListening: () => void;
  stopListening: () => void;
  resetCooldown: () => void;
}

/**
 * Hook for managing NFC reader connection and card reading
 */
export function useNFCReader(): UseNFCReaderReturn {
  const [status, setStatus] = useState<NFCReaderStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastCard, setLastCard] = useState<NFCCard | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [processingState, setProcessingState] = useState(false);

  const isSupported = isNFCSupported() || isWebHIDSupported();

  const connect = useCallback(async () => {
    console.log('🔌 connect() called - setting status to connecting');
    setStatus('connecting');
    setError(null);
    
    try {
      console.log('🔌 Calling connectReader()...');
      const success = await connectReader();
      console.log('🔌 connectReader() returned:', success);
      
      if (success) {
        console.log('✅ Setting status to connected');
        setStatus('connected');
        return true;
      } else {
        console.log('❌ Connection failed - setting status to error');
        setStatus('error');
        setError('Kunne ikke koble til kortleser');
        return false;
      }
    } catch (err) {
      console.log('❌ Exception in connect:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Ukjent feil');
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await disconnectReader();
      setStatus('disconnected');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feil ved frakobling');
    }
  }, []);

  const scan = useCallback(async () => {
    console.log('🔍 scan() called - current status:', status);

    // If disconnected, try to connect first
    if (status === 'disconnected' || status === 'error') {
      console.log('🔌 Auto-connecting in scan()...');
      const connected = await connectReader();
      if (!connected) {
        console.log('❌ Connection failed in scan()');
        setError('Kortleser ikke tilkoblet');
        return null;
      }
      setStatus('connected');
      // Small delay to ensure connection is established
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Proceeding with scan');
    setStatus('reading');
    setError(null);
    setProcessingState(true);
    setProcessing(true);

    try {
      console.log('📡 Calling readCard()...');
      const card = await readCard();
      console.log('📡 readCard() returned:', card);
      
      if (card) {
        setLastCard(card);
        setStatus('connected');
        
        // Keep processing state for 2 seconds after successful read
        setTimeout(() => {
          setProcessingState(false);
          setProcessing(false);
        }, 2000);
        
        return card;
      } else {
        setStatus('connected');
        setError('Ingen kort funnet');
        setProcessingState(false);
        setProcessing(false);
        return null;
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Feil ved lesing');
      setProcessingState(false);
      setProcessing(false);
      return null;
    }
  }, [status]);

  const startListening = useCallback(() => {
    if (isListening) return;

    setIsListening(true);
    setError(null);

    const cleanup = listenForCards(
      (card) => {
        setLastCard(card);
        setStatus('connected');
      },
      (err) => {
        setError(err.message);
        setStatus('error');
      }
    );

    // Store cleanup function
    return cleanup;
  }, [isListening]);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const handleResetCooldown = useCallback(() => {
    resetCooldown();
    setProcessingState(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (status === 'connected') {
        disconnectReader();
      }
    };
  }, [status]);

  return {
    status,
    error,
    lastCard,
    isSupported,
    isProcessing: processingState,
    connect,
    disconnect,
    scan,
    startListening,
    stopListening,
    resetCooldown: handleResetCooldown
  };
}

/**
 * Hook for simplified card scanning with automatic connection
 */
export function useCardScanner() {
  const nfc = useNFCReader();
  const [isScanning, setIsScanning] = useState(false);

  const scanCard = useCallback(async () => {
    setIsScanning(true);
    console.log('🎯 scanCard called - nfc.status:', nfc.status);

    try {
      // Auto-connect if not connected
      if (nfc.status === 'disconnected' || nfc.status === 'error') {
        console.log('🔌 Auto-connecting in scanCard...');
        const connected = await nfc.connect();
        console.log('🔌 Connect result:', connected);
        if (!connected) {
          setIsScanning(false);
          console.log('❌ Failed to connect, returning null');
          return null;
        }
        // Wait for state to settle
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Direct call to readCard instead of scan() to avoid double processing lock
      console.log('📡 Calling readCard() directly...');
      setProcessing(true);

      try {
        const card = await readCard();
        console.log('📡 readCard() returned:', card);

        if (card) {
          // Keep processing for 1 second to prevent rapid re-scanning
          setTimeout(() => setProcessing(false), 1000);
          setIsScanning(false);
          return card;
        } else {
          setProcessing(false);
          setIsScanning(false);
          return null;
        }
      } catch (err) {
        console.log('❌ Error reading card:', err);
        setProcessing(false);
        setIsScanning(false);
        return null;
      }
    } catch (err) {
      console.log('❌ Error in scanCard:', err);
      setIsScanning(false);
      return null;
    }
  }, [nfc]);

  return {
    ...nfc,
    isScanning,
    scanCard
  };
}
