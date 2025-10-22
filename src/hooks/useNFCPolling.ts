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
          console.log('✅ Card detected in polling hook:', card.uid);
          // Clear interval after card detected
          if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
          }
          await onCardDetected(card);
        }
      } catch (error) {
        console.error('❌ Error scanning card in polling hook:', error);
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
