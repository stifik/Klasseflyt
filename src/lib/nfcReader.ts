/**
 * NFC/RFID Reader Utility
 * Supports ACS ACR1255U-J1 via PC/SC protocol
 *
 * Modes (in priority order):
 * 1. WebSocket (event-based, RECOMMENDED) - Real-time card detection
 * 2. NFC Bridge Server (PC/SC via polling) - Legacy support
 * 3. Web NFC API (limited browser support - mainly Android)
 * 4. Manual input (fallback for testing)
 */

// Bridge server URL (can be configured via env)
const DEFAULT_BRIDGE_PORTS = [3001, 3002, 3003, 3004];
const BRIDGE_URL = typeof window !== 'undefined'
  ? (window.localStorage?.getItem('nfc_bridge_url') || process.env.NEXT_PUBLIC_NFC_BRIDGE_URL || 'http://localhost:3001')
  : 'http://localhost:3001';

// Debouncing state (only used for legacy polling mode)
let lastReadTime: number = 0;
let lastCardId: string | null = null;
let processingTransaction: boolean = false;
const DEBOUNCE_MS: number = 3000; // 3 seconds cooldown

// Centralized debounce check (for legacy mode only)
function shouldDebounceCard(cardId: string): boolean {
  const now = Date.now();

  // Ignore if processing another transaction
  if (processingTransaction) {
    console.log('⏳ Transaksjon pågår - ignorerer ny lesning');
    return true;
  }

  // Check cooldown - ignore if same card within cooldown period
  if (cardId === lastCardId && now - lastReadTime < DEBOUNCE_MS) {
    const remainingSeconds = Math.round((DEBOUNCE_MS - (now - lastReadTime)) / 1000);
    console.log(`🚫 Cooldown aktiv - ignorerer lesning (${remainingSeconds}s gjenstår)`);
    return true;
  }

  // Update debounce state
  lastCardId = cardId;
  lastReadTime = now;
  return false;
}

export type NFCReaderStatus = 'disconnected' | 'connecting' | 'connected' | 'reading' | 'error';

export interface NFCCard {
  uid: string; // Unique identifier
  type?: string; // Card type (e.g., "MIFARE")
  raw?: Uint8Array; // Raw data
}

export interface NFCReaderState {
  status: NFCReaderStatus;
  error?: string;
  lastRead?: NFCCard;
}

// Check if NFC Bridge Server is available (tries multiple ports)
export const isBridgeAvailable = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  // First try the configured URL
  try {
    const response = await fetch(`${BRIDGE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    if (response.ok) return true;
  } catch {
    // Continue to try default ports
  }

  // If configured URL failed, try default ports
  for (const port of DEFAULT_BRIDGE_PORTS) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      if (response.ok) {
        // Update localStorage to remember the working port
        if (typeof window !== 'undefined') {
          window.localStorage?.setItem('nfc_bridge_url', `http://localhost:${port}`);
        }
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
};

// Check if Web NFC is available
export const isNFCSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'NDEFReader' in window;
};

// Check if WebHID is available (can be used for smart card readers)
export const isWebHIDSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'hid' in navigator;
};

/**
 * Initialize NFC reader connection
 * Returns true if successful, false otherwise
 */
export const connectReader = async (): Promise<boolean> => {
  // Silent connect - only log errors

  // Priority 1: Try NFC Bridge Server (best for PC/SC readers)
  const bridgeAvailable = await isBridgeAvailable();

  if (bridgeAvailable) {
    try {
      const response = await fetch(`${BRIDGE_URL}/api/status`);
      const data = await response.json();

      if (data.readersConnected > 0) {
        console.log('✅ Bridge connected with', data.readersConnected, 'readers');
        if (data.websocketSupported) {
          console.log('🔌 WebSocket support detected - use useNFCWebSocket hook for best experience');
        }
        return true;
      } else {
        console.warn('⚠️ Bridge server running but no readers found');
        console.warn('💡 Make sure ACS ACR1255U-J1 is connected via USB');
        return false;
      }
    } catch (error) {
      console.error('❌ Bridge server error:', error);
    }
  } else {
    console.log('ℹ️ NFC Bridge Server not available at', BRIDGE_URL);
    console.log('💡 To use PC/SC readers:');
    console.log('   1. cd nfc-bridge');
    console.log('   2. npm install');
    console.log('   3. npm start');
  }

  // Priority 2: Try Web NFC (mobile devices)
  if (isNFCSupported()) {
    console.log('✅ Web NFC API available');
    return true;
  }

  // Fallback: Assume connected for manual input
  console.warn('⚠️ No automatic reader connection available');
  console.warn('💡 Use manual card ID input or start NFC Bridge Server');
  return true; // Return true to allow manual input
};

/**
 * Read NFC/RFID card (legacy polling mode)
 * NOTE: For best performance, use useNFCWebSocket hook instead
 * Returns the card UID if successful
 */
export const readCard = async (): Promise<NFCCard | null> => {
  // Priority 1: Try NFC Bridge Server
  const bridgeAvailable = await isBridgeAvailable();
  if (bridgeAvailable) {
    try {
      const response = await fetch(`${BRIDGE_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        const cardId = data.cardId;

        // Check debounce using centralized function
        if (shouldDebounceCard(cardId)) {
          return null;
        }

        console.log('✅ Card read via Bridge (polling):', cardId);
        return {
          uid: cardId,
          type: 'RFID/PC-SC'
        };
      } else {
        // Handle specific error types silently (normal operation)
        const error = data.error || '';

        if (error === 'CARD_REMOVED' || error === 'NO_CARD' || error === 'SCAN_IN_PROGRESS') {
          // Silent - these are expected during polling
          return null;
        }

        // Only log unexpected errors (not TRANSMIT_ERROR which happens when no card present)
        if (error !== 'TRANSMIT_ERROR') {
          console.error('❌ Bridge scan failed:', error);
        }
        return null;
      }
    } catch (error) {
      console.error('❌ Bridge read error:', error);
      // Fall through to other methods
    }
  }

  // Priority 2: Try Web NFC (mainly mobile)
  if (isNFCSupported()) {
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      return new Promise((resolve) => {
        ndef.addEventListener('reading', ({ serialNumber }: any) => {
          // Check debounce using centralized function
          if (shouldDebounceCard(serialNumber)) {
            resolve(null);
            return;
          }

          console.log('✅ Card read via Web NFC:', serialNumber);
          resolve({
            uid: serialNumber,
            type: 'NFC'
          });
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          console.warn('⏱️ NFC read timeout');
          resolve(null);
        }, 10000);
      });
    } catch (error) {
      console.error('❌ Error reading NFC:', error);
    }
  }

  console.error('❌ No NFC reading method available');
  console.error('💡 Start NFC Bridge Server: cd nfc-bridge && npm start');
  return null;
};

/**
 * Write data to NFC/RFID card
 * For RFID cards, this typically means writing the UID or associated data
 */
export const writeCard = async (data: string): Promise<boolean> => {
  console.log('✍️ Writing to NFC card:', data);

  if (isNFCSupported()) {
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [{ recordType: "text", data }]
      });
      console.log('✅ Card written successfully');
      return true;
    } catch (error) {
      console.error('❌ Error writing to NFC:', error);
      return false;
    }
  }

  console.error('❌ Writing not supported on this device');
  return false;
};

/**
 * Format card UID for display
 * Converts hex string to readable format
 */
export const formatCardUID = (uid: string | undefined): string => {
  if (!uid) return '';

  // Remove any non-hex characters
  const cleanUid = uid.replace(/[^0-9A-Fa-f]/g, '');

  // Format as groups of 2 hex digits
  return cleanUid.match(/.{1,2}/g)?.join(':').toUpperCase() || cleanUid;
};

/**
 * Validate card UID format
 */
export const isValidCardUID = (uid: string): boolean => {
  // RFID UIDs are typically 4, 7, or 10 bytes (8, 14, or 20 hex chars)
  const cleanUid = uid.replace(/[^0-9A-Fa-f]/g, '');
  const length = cleanUid.length;
  return length === 8 || length === 14 || length === 20;
};

/**
 * Disconnect from reader
 */
export const disconnectReader = async (): Promise<void> => {
  if (isWebHIDSupported()) {
    try {
      const devices = await (navigator as any).hid.getDevices();
      for (const device of devices) {
        if (device.opened) {
          await device.close();
        }
      }
      // Silent disconnect - no need to log
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }
};

/**
 * Listen for card scans (legacy polling mode)
 * NOTE: For best performance, use useNFCWebSocket hook instead
 * Returns a cleanup function to stop listening
 */
export const listenForCards = (
  onCard: (card: NFCCard) => void,
  onError?: (error: Error) => void
): (() => void) => {
  let isListening = true;

  if (isNFCSupported()) {
    const ndef = new (window as any).NDEFReader();

    const handleReading = ({ serialNumber }: any) => {
      if (!isListening) return;

      // Check debounce using centralized function
      if (shouldDebounceCard(serialNumber)) {
        return;
      }

      onCard({
        uid: serialNumber,
        type: 'NFC'
      });
    };

    const handleError = (error: any) => {
      if (isListening && onError) {
        onError(error);
      }
    };

    ndef.scan().then(() => {
      ndef.addEventListener('reading', handleReading);
      ndef.addEventListener('error', handleError);
    }).catch((error: any) => {
      if (onError) onError(error);
    });

    return () => {
      isListening = false;
      ndef.removeEventListener('reading', handleReading);
      ndef.removeEventListener('error', handleError);
    };
  }

  return () => {
    isListening = false;
  };
};

/**
 * Reset debounce cooldown (for admin override or after transaction complete)
 */
export const resetCooldown = (): void => {
  lastReadTime = 0;
  lastCardId = null;
  processingTransaction = false;
  console.log('🔄 NFC cooldown reset');
};

/**
 * Set processing state (call before starting transaction)
 */
export const setProcessing = (processing: boolean): void => {
  processingTransaction = processing;
  // Only log when locking (starting transaction), not when unlocking
  if (processing) {
    console.log('🔒 Transaction processing started');
  }
};

/**
 * Get current processing state
 */
export const isProcessing = (): boolean => {
  return processingTransaction;
};
