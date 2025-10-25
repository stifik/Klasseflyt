import { useState, useEffect, useCallback } from 'react';

// Type definitions for Web NFC API
declare global {
  interface Navigator {
    nfc?: {
      scan: (options?: NFCScanOptions) => Promise<void>;
      write: (message: NFCMessage | string, options?: NFCWriteOptions) => Promise<void>;
    };
  }

  interface NFCScanOptions {
    signal?: AbortSignal;
  }

  interface NFCWriteOptions {
    target?: 'tag' | 'peer';
    signal?: AbortSignal;
  }

  interface NFCMessage {
    records: NFCRecord[];
  }

  interface NFCRecord {
    recordType: string;
    mediaType?: string;
    id?: ArrayBuffer;
    data?: ArrayBuffer;
    encoding?: string;
  }

  interface NFCReadingEvent extends Event {
    serialNumber: string;
    message: NFCMessage;
  }
}

export type NFCResult = {
  success: boolean;
  message: string;
  data?: string;
};

export type NFCHookReturn = {
  isSupported: boolean;
  isScanning: boolean;
  lastRead: string | null;
  error: string | null;
  startScanning: () => Promise<NFCResult>;
  stopScanning: () => void;
  writeText: (text: string) => Promise<NFCResult>;
};

export function useNfc(): NFCHookReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastRead, setLastRead] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Sjekk NFC-støtte ved komponentmontering (kun sett isSupported, ikke error)
  useEffect(() => {
    const checkNFCSupport = () => {
      if ('nfc' in navigator) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
      }
    };

    checkNFCSupport();
  }, []);

  // Rens opp ved komponentavmontering
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  const startScanning = useCallback(async (): Promise<NFCResult> => {
    if (!isSupported) {
      const errorMsg = 'NFC støttes ikke av denne enheten eller nettleseren';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }

    if (isScanning) {
      return { success: false, message: 'Skanning pågår allerede' };
    }

    try {
      // Opprett ny AbortController for denne skanningen
      const controller = new AbortController();
      setAbortController(controller);
      setIsScanning(true);
      setError(null);

      // Start NFC-skanning
      await navigator.nfc!.scan({ signal: controller.signal });

      // Lyt til NFC-hendelser
      const handleNFCReading = (event: NFCReadingEvent) => {
        try {
          console.log('NFC-kort oppdaget:', event.serialNumber);
          
          // Prøv å lese tekstdata fra kortet
          let textData = '';
          for (const record of event.message.records) {
            if (record.recordType === 'text') {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              textData = decoder.decode(record.data);
              break;
            }
          }

          // Bruk serialnummer hvis ingen tekstdata finnes
          const finalData = textData || event.serialNumber;
          
          setLastRead(finalData);
          setError(null);
          
          console.log('NFC-data lest:', finalData);
        } catch (err) {
          console.error('Feil ved lesing av NFC-data:', err);
          setError('Feil ved lesing av NFC-kort');
        }
      };

      // Legg til event listener
      addEventListener('reading', handleNFCReading as EventListener);

      // Fjern event listener når skanning stoppes
      controller.signal.addEventListener('abort', () => {
        removeEventListener('reading', handleNFCReading as EventListener);
        setIsScanning(false);
      });

      return { 
        success: true, 
        message: 'NFC-skanning startet. Hold et NFC-kort nær enheten.' 
      };

    } catch (err: any) {
      setIsScanning(false);
      setAbortController(null);

      let errorMessage = 'Ukjent feil ved start av NFC-skanning';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'NFC-tilgang ble nektet. Sjekk nettleserinnstillingene.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'NFC støttes ikke på denne enheten';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'NFC er ikke tilgjengelig. Sjekk at NFC er aktivert.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('NFC-skanning feilet:', err);
      
      return { success: false, message: errorMessage };
    }
  }, [isSupported, isScanning]);

  const stopScanning = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsScanning(false);
    setError(null);
  }, [abortController]);

  const writeText = useCallback(async (text: string): Promise<NFCResult> => {
    if (!isSupported) {
      const errorMsg = 'NFC støttes ikke av denne enheten eller nettleseren';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }

    try {
      setError(null);

      const message: NFCMessage = {
        records: [
          {
            recordType: 'text',
            data: new TextEncoder().encode(text).buffer as ArrayBuffer,
            encoding: 'utf-8'
          }
        ]
      };

      await navigator.nfc!.write(message);
      
      return { 
        success: true, 
        message: `Skrev "${text}" til NFC-kort` 
      };

    } catch (err: any) {
      let errorMessage = 'Ukjent feil ved skriving til NFC-kort';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'NFC-skriving ble nektet. Sjekk nettleserinnstillingene.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'NFC-skriving støttes ikke på denne enheten';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'NFC er ikke tilgjengelig for skriving.';
      } else if (err.name === 'NetworkError') {
        errorMessage = 'NFC-kortet kan ikke skrives til.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('NFC-skriving feilet:', err);
      
      return { success: false, message: errorMessage };
    }
  }, [isSupported]);

  return {
    isSupported,
    isScanning,
    lastRead,
    error,
    startScanning,
    stopScanning,
    writeText,
  };
}