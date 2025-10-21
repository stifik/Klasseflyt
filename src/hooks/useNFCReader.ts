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
    setStatus('connecting');
    setError(null);
    
    try {
      const success = await connectReader();
      if (success) {
        setStatus('connected');
        return true;
      } else {
        setStatus('error');
        setError('Kunne ikke koble til kortleser');
        return false;
      }
    } catch (err) {
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
    if (status !== 'connected' && status !== 'reading') {
      setError('Kortleser ikke tilkoblet');
      return null;
    }

    setStatus('reading');
    setError(null);
    setProcessingState(true);
    setProcessing(true);

    try {
      const card = await readCard();
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

    try {
      // Auto-connect if not connected
      if (nfc.status === 'disconnected') {
        const connected = await nfc.connect();
        if (!connected) {
          setIsScanning(false);
          return null;
        }
      }

      const card = await nfc.scan();
      setIsScanning(false);
      return card;
    } catch (err) {
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
