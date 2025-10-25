/**
 * Hook for continuous NFC card polling
 * Polls for cards at a fixed interval and calls onCardDetected when found
 */

import { useEffect, useRef } from 'react';
import { useCardScanner } from './useNFCReader';
import type { NFCCard } from '@/lib/nfcReader';

interface UseNFCPollingOptions {
  enabled: boolean;
  onCardDetected: (card: NFCCard) => void | Promise<void>;
  pollInterval?: number; // milliseconds, default 250ms
}

export function useNFCPolling({
  enabled,
  onCardDetected,
  pollInterval = 250
}: UseNFCPollingOptions) {
  const nfc = useCardScanner();
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!enabled || isPollingRef.current) {
      return;
    }

    let scanInterval: NodeJS.Timeout | null = null;

    const scanForCard = async () => {
      if (!isPollingRef.current) return;

      try {
        const card = await nfc.scanCard();

        if (!isPollingRef.current) return;

        if (card) {
          // Card detected - clear interval and notify
          if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
          }
          await onCardDetected(card);
        }
      } catch (error) {
        // Only log if it's not a routine "no card" scenario
        if (error && typeof error === 'object' && 'message' in error) {
          const msg = (error as Error).message;
          if (!msg.includes('No card') && !msg.includes('TRANSMIT')) {
            console.error('❌ Error scanning card:', error);
          }
        }
      }
    };

    // Start polling
    isPollingRef.current = true;
    scanInterval = setInterval(scanForCard, pollInterval);
    // Also do immediate first scan
    scanForCard();

    // Cleanup
    return () => {
      isPollingRef.current = false;
      if (scanInterval) {
        clearInterval(scanInterval);
      }
    };
  }, [enabled, onCardDetected, pollInterval, nfc]);

  return {
    nfc,
    isPolling: isPollingRef.current
  };
}
